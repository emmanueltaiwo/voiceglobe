"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getWsRecentUrl } from "./api";
import type { RecentMessage } from "./types";

const MAX_RECONNECT_DELAY_MS = 30000;
const INITIAL_RECONNECT_DELAY_MS = 1000;

export function useRecentActivity(limit = 100) {
  const [data, setData] = useState<RecentMessage[] | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY_MS);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const connect = useCallback(() => {
    const url = getWsRecentUrl(limit);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectDelayRef.current = INITIAL_RECONNECT_DELAY_MS;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "snapshot") {
          setData(Array.isArray(msg.data) ? msg.data : []);
        } else if (msg.type === "new" && msg.data) {
          setData((prev) => {
            const next = prev ?? [];
            if (next.some((m) => m._id === msg.data._id)) return next;
            return [msg.data as RecentMessage, ...next];
          });
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
        reconnectDelayRef.current = Math.min(
          reconnectDelayRef.current * 1.5,
          MAX_RECONNECT_DELAY_MS,
        );
      }, reconnectDelayRef.current);
    };

    ws.onerror = () => {
      setError(new Error("WebSocket error"));
    };

    wsRef.current = ws;
  }, [limit]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  return {
    data,
    error,
    isConnected,
    isLoading: data === undefined && !error,
  };
}
