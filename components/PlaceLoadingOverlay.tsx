"use client";

import { motion } from "motion/react";

export function PlaceLoadingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="flex flex-col items-center gap-8 rounded-2xl border border-white/20 bg-[#0d1117] p-10 shadow-2xl shadow-black/50 md:p-8"
      >
        <div className="relative flex h-20 w-20 items-center justify-center rounded-xl border-2 border-emerald-500 md:h-16 md:w-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-xl border-2 border-transparent border-t-emerald-500"
          />
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 -m-6 rounded-xl border border-emerald-500/30"
              animate={{ scale: [0.5, 2, 2], opacity: [0.5, 0, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.5,
              }}
            />
          ))}
          <span className="font-mono text-2xl font-semibold text-emerald-500 md:text-lg">
            TX
          </span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <motion.p
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400"
          >
            Transmitting...
          </motion.p>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 w-1.5 rounded-full border border-emerald-500"
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
