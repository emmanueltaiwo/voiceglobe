"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "@/lib/types";
import {
  getMessage,
  getRadioMessages,
  getRadioMessagesSince,
  getWsRadioUrl,
} from "@/lib/api";

function isAfterTail(msg: Message, tail: Message): boolean {
  return (
    msg.createdAt > tail.createdAt ||
    (msg.createdAt === tail.createdAt && msg._id > tail._id)
  );
}

export function useRadioQueue() {
  const [queue, setQueue] = useState<Message[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bootError, setBootError] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<Message[]>([]);
  const nextCursorRef = useRef<string | null>(null);
  const currentIndexRef = useRef(0);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const appendUnique = useCallback((incoming: Message[]) => {
    if (incoming.length === 0) return;
    setQueue((prev) => {
      const ids = new Set(prev.map((m) => m._id));
      const adds = incoming.filter((m) => {
        if (ids.has(m._id) || seenIdsRef.current.has(m._id)) return false;
        seenIdsRef.current.add(m._id);
        ids.add(m._id);
        return true;
      });
      if (adds.length === 0) return prev;
      const merged = [...prev, ...adds];
      queueRef.current = merged;
      return merged;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingInitial(true);
    setBootError(null);
    getRadioMessages({ limit: 50 })
      .then(({ messages, nextCursor: nc }) => {
        if (cancelled) return;
        seenIdsRef.current.clear();
        messages.forEach((m) => seenIdsRef.current.add(m._id));
        queueRef.current = messages;
        setQueue(messages);
        setNextCursor(nc);
        nextCursorRef.current = nc;
        setCurrentIndex(0);
        currentIndexRef.current = 0;
      })
      .catch(() => {
        if (!cancelled) setBootError("Could not reach the radio tower.");
      })
      .finally(() => {
        if (!cancelled) setLoadingInitial(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async (): Promise<number> => {
    const cursor = nextCursorRef.current;
    if (!cursor) return 0;
    setLoadingMore(true);
    try {
      const { messages, nextCursor: nc } = await getRadioMessages({
        cursor,
        limit: 50,
      });
      const prev = queueRef.current;
      const ids = new Set(prev.map((m) => m._id));
      const adds = messages.filter((m) => {
        if (ids.has(m._id) || seenIdsRef.current.has(m._id)) return false;
        seenIdsRef.current.add(m._id);
        return true;
      });
      if (adds.length > 0) {
        const next = [...prev, ...adds];
        queueRef.current = next;
        setQueue(next);
      }
      nextCursorRef.current = nc;
      setNextCursor(nc);
      return adds.length;
    } catch {
      return 0;
    } finally {
      setLoadingMore(false);
    }
  }, []);

  /** Poll for messages after queue tail (~20s). */
  useEffect(() => {
    const tick = () => {
      const q = queueRef.current;
      if (q.length === 0) return;
      const tail = q[q.length - 1];
      getRadioMessagesSince({
        afterCreatedAt: tail.createdAt,
        afterId: tail._id,
        limit: 100,
      })
        .then(({ messages }) => appendUnique(messages))
        .catch(() => {});
    };
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [appendUnique]);

  /** Optional WebSocket: append new messages when broadcast. */
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(getWsRadioUrl());
      ws.onmessage = (ev) => {
        let data: { type?: string; messageId?: string };
        try {
          data = JSON.parse(ev.data as string);
        } catch {
          return;
        }
        if (data.type !== "new_message" || !data.messageId) return;
        getMessage(data.messageId).then((m) => {
          if (!m) return;
          setQueue((prev) => {
            if (prev.some((x) => x._id === m._id)) return prev;
            const tail = prev[prev.length - 1];
            if (tail && !isAfterTail(m, tail)) return prev;
            seenIdsRef.current.add(m._id);
            const next = [...prev, m];
            queueRef.current = next;
            return next;
          });
        });
      };
      ws.onerror = () => {};
    } catch {
      /* optional */
    }
    return () => {
      ws?.close();
    };
  }, []);

  const current = queue[currentIndex] ?? null;
  const hasNext = currentIndex < queue.length - 1;
  const atEndOfLoaded =
    currentIndex >= queue.length - 1 && nextCursor === null;

  const goToNext = useCallback(async () => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    if (idx + 1 < q.length) {
      const n = idx + 1;
      currentIndexRef.current = n;
      setCurrentIndex(n);
      return true;
    }
    const added = await loadMore();
    const q2 = queueRef.current;
    if (added > 0 && idx + 1 < q2.length) {
      const n = idx + 1;
      currentIndexRef.current = n;
      setCurrentIndex(n);
      return true;
    }
    return false;
  }, [loadMore]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((i) => {
      const n = Math.max(0, i - 1);
      currentIndexRef.current = n;
      return n;
    });
  }, []);

  const prefetchAhead = useCallback(async () => {
    const q = queueRef.current;
    const idx = currentIndexRef.current;
    if (idx + 8 >= q.length && nextCursorRef.current) {
      await loadMore();
    }
  }, [loadMore]);

  return {
    queue,
    current,
    currentIndex,
    nextCursor,
    bootError,
    loadingInitial,
    loadingMore,
    hasNext,
    atEndOfLoaded,
    goToNext,
    goToPrevious,
    prefetchAhead,
    loadMore,
  };
}
