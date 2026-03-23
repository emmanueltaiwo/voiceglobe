"use client";

import { useRef, useState, useMemo } from "react";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useClientId } from "@/hooks/useClientId";
import { getReplies } from "@/lib/api";
import {
  Play,
  Square,
  MessageCircle,
  MapPin,
  X,
  Award,
  Copy,
  Check,
} from "lucide-react";
import type { Message } from "@/lib/types";
import { getCountryFromCoords } from "@/lib/geo";
import { ReactionBar } from "@/components/ReactionBar";
import { queryKeys } from "@/lib/queryKeys";

type Props = {
  message: Message;
  position?: { x: number; y: number; placement?: "left" | "right" } | null;
  onClose: () => void;
  formatDuration: (s: number) => string;
  formatTimestamp: (ms: number) => string;
  onReply?: (message: Message) => void;
  onShowOnMap?: (lng: number, lat: number) => void;
};

export function MarkerPopup({
  message,
  position,
  onClose,
  formatDuration,
  formatTimestamp,
  onReply,
  onShowOnMap,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [playError, setPlayError] = useState(false);
  const [copied, setCopied] = useState<"view" | "map" | "id" | null>(null);

  const copyLink = (type: "view" | "map") => {
    if (typeof window === "undefined") return;
    const base = window.location.origin;
    const url =
      type === "view"
        ? `${base}/m/${message._id}`
        : `${base}/?message=${message._id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const copyId = () => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(message._id).then(() => {
      setCopied("id");
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const { data: replies } = useQuery({
    queryKey: queryKeys.replies(message._id),
    queryFn: () => getReplies(message._id),
  });
  const country = useMemo(
    () => getCountryFromCoords(message.lat, message.lng),
    [message.lat, message.lng],
  );
  const clientId = useClientId();

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlayError(false);
    if (playing) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
    } else {
      audio.volume = 1;
      audio.load();
      const p = audio.play();
      if (p !== undefined) {
        p.then(() => setPlaying(true)).catch(() => setPlayError(true));
      } else {
        setPlaying(true);
      }
    }
  };

  const handleEnded = () => setPlaying(false);
  const handleAudioError = () => setPlayError(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const POPUP_WIDTH = 320;

  const style =
    isDesktop && position
      ? position.placement === "left"
        ? {
            left: Math.max(8, position.x - POPUP_WIDTH - 12),
            top: position.y,
            right: "auto" as const,
            bottom: "auto" as const,
          }
        : {
            left: position.x + 12,
            top: position.y,
            right: "auto" as const,
            bottom: "auto" as const,
          }
      : isDesktop
        ? { right: 16, top: 96, left: "auto" as const, bottom: "auto" as const }
        : { left: 0, right: 0, bottom: 0, top: "auto" as const };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
      transition={{ type: "spring", damping: 28, stiffness: 320 }}
      className="absolute z-50 flex w-full max-w-sm flex-col overflow-hidden rounded-xl border border-white/20 bg-[#0d1117]/98 shadow-2xl shadow-black/40 backdrop-blur-md md:w-80"
      style={{
        ...style,
        ...((replies?.length ?? 0) > 0
          ? {
              height: isDesktop ? "min(520px, 85dvh)" : "min(520px, 88dvh)",
              maxHeight: isDesktop ? "min(520px, 85dvh)" : "min(520px, 88dvh)",
            }
          : {}),
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ duration: 0.4 }}
        className="h-0.5 shrink-0 bg-emerald-500"
      />
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 p-4">
        <div className="flex min-w-0 flex-1 gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onPointerDown={togglePlay}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-emerald-500 bg-white/5 text-emerald-400 transition hover:bg-emerald-500 hover:text-white md:h-10 md:w-10"
          >
            {playing ? (
              <Square className="h-5 w-5 fill-current md:h-3.5 md:w-3.5" />
            ) : (
              <Play className="ml-0.5 h-5 w-5 fill-current md:h-3.5 md:w-3.5" />
            )}
          </motion.button>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-lg tabular-nums text-emerald-400 md:text-sm">
              {formatDuration(message.duration)}
            </p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-dim">
              {formatTimestamp(message.createdAt)}
            </p>
            {country && (
              <p className="mt-2 flex items-center gap-2 text-sm text-text md:text-xs">
                <span className="text-xl md:text-base">{country.flag}</span>
                <span className="font-mono">{country.name}</span>
              </p>
            )}
            {message.isFirstInCountry && country && (
              <motion.div
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="mt-2 inline-flex items-center gap-1.5 rounded border border-emerald-500/50 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-emerald-400"
              >
                <Award className="h-3 w-3" />
                First in {country.name}
              </motion.div>
            )}
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="-mr-2 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5 md:h-3.5 md:w-3.5" strokeWidth={2} />
        </motion.button>
      </div>
      <div className="shrink-0 border-t border-white/10 px-4 py-2">
        <ReactionBar messageId={message._id} clientId={clientId} />
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3">
        <span className="mr-1 shrink-0 text-[10px] font-mono uppercase tracking-wider text-slate-600">
          Share
        </span>
        <button
          onClick={() => copyLink("view")}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/20 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 transition hover:border-emerald-500/50 hover:bg-white/5 hover:text-emerald-400 md:min-h-0 md:px-2.5 md:py-1.5"
        >
          {copied === "view" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          View
        </button>
        <button
          onClick={() => copyLink("map")}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/20 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 transition hover:border-emerald-500/50 hover:bg-white/5 hover:text-emerald-400 md:min-h-0 md:px-2.5 md:py-1.5"
        >
          {copied === "map" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          Map
        </button>
        <button
          onClick={copyId}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-white/20 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 transition hover:border-emerald-500/50 hover:bg-white/5 hover:text-emerald-400 md:min-h-0 md:px-2.5 md:py-1.5"
        >
          {copied === "id" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          ID
        </button>
      </div>
      {playError && (
        <p className="shrink-0 border-t border-white/10 px-4 py-2 text-[10px] text-amber-400">
          Unable to play this recording.
        </p>
      )}
      <audio
        ref={audioRef}
        src={message.audioUrl}
        onEnded={handleEnded}
        onError={handleAudioError}
        preload="auto"
        playsInline
      />
      {(replies?.length ?? 0) > 0 && (
        <div className="min-h-[180px] flex-1 overflow-y-auto overflow-x-hidden border-t border-white/10 p-4">
          <p className="mb-3 text-xs font-mono font-semibold uppercase tracking-widest text-slate-500">
            Replies ({replies?.length})
          </p>
          <div className="space-y-3">
            {replies?.map((r, i) => (
              <motion.div
                key={r._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <ReplyItem
                  reply={r}
                  formatDuration={formatDuration}
                  formatTimestamp={formatTimestamp}
                  onShowOnMap={onShowOnMap}
                  onClose={onClose}
                  clientId={clientId}
                />
              </motion.div>
            ))}
          </div>
        </div>
      )}
      {onReply && (
        <div className="shrink-0 border-t border-white/10 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:pb-3">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              onClose();
              onReply(message);
            }}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 py-3 text-xs font-mono uppercase tracking-wider text-emerald-400 transition hover:bg-emerald-500 hover:text-white md:min-h-0 md:rounded-lg md:py-2.5 md:text-[10px]"
          >
            <MessageCircle className="h-4 w-4 md:h-3 md:w-3" strokeWidth={2} />
            Reply
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

function ReplyItem({
  reply,
  formatDuration,
  formatTimestamp,
  onShowOnMap,
  onClose,
  clientId,
}: {
  reply: Message;
  formatDuration: (s: number) => string;
  formatTimestamp: (ms: number) => string;
  onShowOnMap?: (lng: number, lat: number) => void;
  onClose?: () => void;
  clientId: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [playError, setPlayError] = useState(false);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlayError(false);
    if (playing) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
    } else {
      audio.volume = 1;
      audio.load();
      const p = audio.play();
      if (p !== undefined) {
        p.then(() => setPlaying(true)).catch(() => setPlayError(true));
      } else {
        setPlaying(true);
      }
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/15 bg-white/[0.07] p-4">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onPointerDown={togglePlay}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/25 text-emerald-400 transition hover:border-emerald-500 hover:bg-emerald-500/10"
      >
        {playing ? (
          <Square className="h-3.5 w-3.5 fill-current" />
        ) : (
          <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
        )}
      </motion.button>
      {playError && (
        <span className="text-xs text-amber-400">Can&apos;t play</span>
      )}
      <audio
        ref={audioRef}
        src={reply.audioUrl}
        onEnded={() => setPlaying(false)}
        onError={() => setPlayError(true)}
        preload="auto"
        playsInline
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="font-mono text-base tabular-nums text-slate-200">
            {formatDuration(reply.duration)}
          </p>
          <p className="text-xs text-slate-500">
            {formatTimestamp(reply.createdAt)}
          </p>
        </div>
        <div className="mt-2">
          <ReactionBar messageId={reply._id} clientId={clientId} compact />
        </div>
      </div>
      {onShowOnMap && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            onShowOnMap(reply.lng, reply.lat);
            onClose?.();
          }}
          className="flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-white/20 text-slate-400 transition hover:border-emerald-500 hover:text-emerald-400"
          title="Show on map"
        >
          <MapPin className="h-4 w-4" strokeWidth={2} />
        </motion.button>
      )}
    </div>
  );
}
