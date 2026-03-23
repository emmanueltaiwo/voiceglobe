"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Mic, Square, MapPin, X } from "lucide-react";
import { formatDuration } from "@/lib/utils";

type Props = {
  duration: number;
  isRecording: boolean;
  audioBlob: Blob | null;
  onStart: () => void;
  onStop: () => void;
  onUse: () => void;
  onCancel: () => void;
};

export function RecordModal({
  duration,
  isRecording,
  audioBlob,
  onStart,
  onStop,
  onUse,
  onCancel,
}: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const maxDuration = 10;
  const hasPreview = !isRecording && audioBlob;
  const isIdle = !isRecording && !audioBlob;

  useEffect(() => {
    if (!audioBlob) {
      setBlobUrl(null);
      return;
    }
    const url = URL.createObjectURL(audioBlob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioBlob]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, pointerEvents: "none" }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-void/90 p-0 sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ y: "100%", opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0.5 }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full max-w-sm rounded-t-2xl border-t border-white/20 bg-[#0d1117] sm:rounded-2xl sm:border sm:border-white/20"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <motion.span
              animate={isRecording ? { opacity: [1, 0.4, 1] } : {}}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="text-[10px] font-mono uppercase tracking-widest text-text-dim"
            >
              {isRecording
                ? "● TX ACTIVE"
                : hasPreview
                  ? "PREVIEW"
                  : "TRANSMIT"}
            </motion.span>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onCancel}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </motion.button>
        </div>

        <div className="p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6">
          {isIdle && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center gap-4">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 20, stiffness: 300 }}
                  className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-emerald-500 bg-white/5 sm:h-16 sm:w-16"
                >
                  <Mic
                    className="h-10 w-10 text-emerald-400 sm:h-8 sm:w-8"
                    strokeWidth={1.5}
                  />
                </motion.div>
                <div className="text-center">
                  <p className="text-xs font-mono uppercase tracking-wider text-text-dim">
                    Voice message · max 10s
                  </p>
                  <p className="mt-1 text-[10px] text-muted">
                    Preview before placing on map
                  </p>
                </div>
              </div>
              <div className="flex gap-2 sm:gap-2">
                <motion.button
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onCancel}
                  className="flex-1 rounded-lg border border-white/20 py-3.5 text-[10px] font-mono uppercase tracking-wider text-slate-300 transition hover:bg-white/5 sm:py-3"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onStart}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-emerald-500 bg-emerald-500 py-3.5 text-[10px] font-mono uppercase tracking-wider text-white transition hover:bg-emerald-600 sm:py-3"
                >
                  <Mic className="h-3.5 w-3.5" strokeWidth={2} />
                  Start
                </motion.button>
              </div>
            </motion.div>
          )}

          {isRecording && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 0.6, repeat: Infinity }}
                    className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-red-500 bg-red-500 sm:h-16 sm:w-16"
                  >
                    <Square className="h-8 w-8 fill-void text-void sm:h-6 sm:w-6" />
                  </motion.div>

                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="absolute inset-0 -m-4 rounded-full border border-red-500/40"
                      animate={{ scale: [0.5, 2, 2], opacity: [0.6, 0, 0] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.4,
                      }}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <motion.p
                    key={duration}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className="font-mono text-3xl tabular-nums text-emerald-400 sm:text-2xl"
                  >
                    {formatDuration(Math.min(duration, maxDuration))}
                  </motion.p>
                  <p className="mt-2 text-[10px] font-mono uppercase tracking-wider text-text-dim">
                    Recording · Tap stop
                  </p>
                  <div className="mx-auto mt-3 h-1.5 w-40 max-w-full rounded-full border border-white/20">
                    <motion.div
                      className="h-full rounded-full bg-emerald-500"
                      initial={{ width: "0%" }}
                      animate={{
                        width: `${Math.min((duration / maxDuration) * 100, 100)}%`,
                      }}
                      transition={{ duration: 0.2 }}
                    />
                  </div>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onStop}
                className="w-full rounded-lg border-2 border-red-500 bg-red-500/20 py-3.5 text-[10px] font-mono uppercase tracking-wider text-red-400 transition hover:bg-red-500/30 sm:py-3"
              >
                Stop
              </motion.button>
            </motion.div>
          )}

          {hasPreview && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center gap-4">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-emerald-500 bg-white/5"
                >
                  <Mic className="h-8 w-8 text-emerald-400" strokeWidth={1.5} />
                </motion.div>
                <div className="w-full">
                  <p className="mb-2 text-center text-[10px] font-mono uppercase tracking-wider text-text-dim">
                    Preview
                  </p>
                  <audio
                    src={blobUrl!}
                    controls
                    className="h-12 w-full rounded-lg border border-white/20 [&::-webkit-media-controls-panel]:bg-white/5"
                  />
                </div>
                <p className="text-center text-[10px] text-muted">
                  {formatDuration(duration)} ·{" "}
                  {duration > maxDuration
                    ? "Over limit, record again"
                    : "Ready to place"}
                </p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.05)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onCancel}
                  className="flex-1 rounded-lg border border-white/20 py-3.5 text-[10px] font-mono uppercase tracking-wider text-slate-300 transition hover:bg-white/5 sm:py-3"
                >
                  Again
                </motion.button>
                <motion.button
                  whileHover={duration <= maxDuration ? { scale: 1.02 } : {}}
                  whileTap={duration <= maxDuration ? { scale: 0.98 } : {}}
                  onClick={duration <= maxDuration ? onUse : undefined}
                  disabled={duration > maxDuration}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-emerald-500 bg-emerald-500 py-3.5 text-[10px] font-mono uppercase tracking-wider text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 sm:py-3"
                >
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                  Place
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
