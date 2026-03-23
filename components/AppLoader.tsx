"use client";

import useSWR from "swr";
import { motion, AnimatePresence } from "motion/react";
import { getStats } from "@/lib/api";

export function AppLoader({ children }: { children: React.ReactNode }) {
  const { data: stats } = useSWR("stats", getStats);
  const isReady = stats !== undefined;

  return (
    <>
      {children}
      <AnimatePresence>
        {!isReady && (
          <motion.div
            key="app-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-void"
          >
            <div className="absolute left-4 top-4 flex flex-col gap-1">
              {["INIT", "MAP", "SIGNAL"].map((line, i) => (
                <motion.div
                  key={line}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15, duration: 0.2 }}
                  className="font-mono text-[10px] text-text-dim"
                >
                  <motion.span
                    animate={{ opacity: [0.5, 1] }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  >
                    {">"} {line}...
                  </motion.span>
                </motion.div>
              ))}
            </div>
            <div className="flex flex-col items-center gap-8">
              <div className="relative flex h-24 w-24 items-center justify-center border-2 border-emerald-500 md:h-20 md:w-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500"
                />
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="font-mono text-3xl font-bold text-emerald-500 md:text-2xl"
                >
                  VG
                </motion.div>
              </div>
              <div className="flex flex-col items-center gap-3">
                <motion.p
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-[10px] font-mono uppercase tracking-[0.25em] text-text-dim"
                >
                  Acquiring signal...
                </motion.p>
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full border border-emerald-500 bg-emerald-500"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
