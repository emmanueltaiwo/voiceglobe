"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { Play, Square, MapPin, Copy, Check, ArrowLeft } from "lucide-react";
import { getMessage } from "@/lib/api";
import { getCountryFromCoords } from "@/lib/geo";
import { formatDuration, formatTimestamp } from "@/lib/utils";
import type { Message } from "@/lib/types";

function isValidId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

export default function MessagePage() {
  const params = useParams();
  const router = useRouter();
  const id = (params.id as string) ?? "";
  const [message, setMessage] = useState<Message | null | "loading" | "error">(
    "loading",
  );
  const [playing, setPlaying] = useState(false);
  const [playError, setPlayError] = useState(false);
  const [copied, setCopied] = useState<"view" | "map" | "id" | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!id) {
      setMessage("error");
      return;
    }
    if (!isValidId(id)) {
      setMessage("error");
      return;
    }
    let cancelled = false;
    setMessage("loading");
    getMessage(id)
      .then((m) => {
        if (!cancelled) setMessage(m);
      })
      .catch(() => {
        if (!cancelled) setMessage("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio || message === null || typeof message === "string") return;
    setPlayError(false);
    if (playing) {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
    } else {
      audio.volume = 1;
      audio.load();
      audio.play().then(() => setPlaying(true)).catch(() => setPlayError(true));
    }
  };

  const copyId = () => {
    if (typeof window === "undefined" || !id) return;
    navigator.clipboard.writeText(id).then(() => {
      setCopied("id");
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const copyLink = (type: "view" | "map") => {
    if (typeof window === "undefined" || !id) return;
    const base = window.location.origin;
    const url = type === "view" ? `${base}/m/${id}` : `${base}/?message=${id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
      })
      .catch(() => {});
  };

  const country =
    message && typeof message === "object"
      ? getCountryFromCoords(message.lat, message.lng)
      : null;

  if (message === "loading") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-void px-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 rounded-full border-2 border-emerald-500/50 border-t-emerald-400"
        />
        <p className="mt-4 text-sm font-mono uppercase tracking-wider text-slate-500">
          Loading message...
        </p>
      </main>
    );
  }

  if (message === "error" || message === null) {
    const invalidFormat = id && !isValidId(id);
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-void px-4">
        <div className="max-w-sm rounded-xl border border-white/10 bg-[#0d1117]/95 p-6 text-center shadow-xl">
          <h1 className="text-lg font-semibold text-slate-200">
            {invalidFormat ? "Invalid message ID" : "Message not found"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {invalidFormat
              ? "Message IDs are 24-character hex strings."
              : "This message may have expired or doesn't exist."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/25"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            Back to VoiceGlobe
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-void">
      <div className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-mono uppercase tracking-wider text-slate-500 transition hover:text-emerald-400"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back to VoiceGlobe
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-8 rounded-xl border border-white/20 bg-[#0d1117]/98 p-6 shadow-2xl"
        >
          <div className="flex items-start gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={togglePlay}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-emerald-500 bg-white/5 text-emerald-400 transition hover:bg-emerald-500 hover:text-white"
            >
              {playing ? (
                <Square className="h-6 w-6 fill-current" />
              ) : (
                <Play className="ml-1 h-6 w-6 fill-current" />
              )}
            </motion.button>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-xl tabular-nums text-emerald-400">
                {formatDuration(message.duration)}
              </p>
              <p className="text-xs font-mono uppercase tracking-wider text-slate-500">
                {formatTimestamp(message.createdAt)}
              </p>
              {country && (
                <p className="mt-3 flex items-center gap-2 text-slate-200">
                  <span className="text-2xl">{country.flag}</span>
                  <span className="font-medium">{country.name}</span>
                </p>
              )}
              {message.isFirstInCountry && country && (
                <p className="mt-2 text-xs font-mono uppercase tracking-wider text-emerald-400">
                  First in {country.name}
                </p>
              )}
            </div>
          </div>

          {playError && (
            <p className="mt-3 text-xs text-amber-400">
              Unable to play this recording.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2 border-t border-white/10 pt-4">
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
              Share
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => copyLink("view")}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-xs font-mono uppercase tracking-wider text-slate-300 transition hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                {copied === "view" ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                ) : (
                  <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                )}
                Copy view link
              </button>
              <button
                onClick={() => {
                  router.push(`/?message=${message._id}`);
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-3 py-2.5 text-xs font-mono uppercase tracking-wider text-emerald-400 transition hover:bg-emerald-500/25"
              >
                <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                Open on map
              </button>
            </div>
            <button
              onClick={() => copyLink("map")}
              className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
            >
              {copied === "map" ? (
                <Check className="h-3 w-3" strokeWidth={2} />
              ) : (
                <Copy className="h-3 w-3" strokeWidth={2} />
              )}
              Copy map link
            </button>
            <button
              onClick={copyId}
              className="flex items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
            >
              {copied === "id" ? (
                <Check className="h-3 w-3" strokeWidth={2} />
              ) : (
                <Copy className="h-3 w-3" strokeWidth={2} />
              )}
              Copy ID
            </button>
          </div>
        </motion.div>
      </div>

      <audio
        ref={audioRef}
        src={message.audioUrl}
        onEnded={() => setPlaying(false)}
        onError={() => setPlayError(true)}
        preload="auto"
        playsInline
      />
    </main>
  );
}
