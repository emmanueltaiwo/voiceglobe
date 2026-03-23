"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, X, MapPin, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { getMessage } from "@/lib/api";
import type { Message } from "@/lib/types";

function isValidId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id.trim());
}

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "found"; message: Message };

type Props = {
  onOpenOnMap?: (message: Message) => void;
};

export function MessageIdSearch({ onOpenOnMap }: Props) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle" });
  const [isExpanded, setIsExpanded] = useState(false);

  const search = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      setState({ status: "idle" });
      return;
    }
    if (!isValidId(trimmed)) {
      setState({
        status: "error",
        message: "Invalid ID. Use 24 hex characters (0-9, a-f).",
      });
      return;
    }
    setState({ status: "loading" });
    try {
      const msg = await getMessage(trimmed);
      if (msg) {
        setState({ status: "found", message: msg });
      } else {
        setState({
          status: "error",
          message: "Message not found or expired.",
        });
      }
    } catch {
      setState({
        status: "error",
        message: "Failed to load. Check your connection.",
      });
    }
  }, [input]);

  const handleViewPage = () => {
    if (state.status !== "found") return;
    router.push(`/m/${state.message._id}`);
  };

  const handleOpenOnMap = () => {
    if (state.status !== "found") return;
    if (onOpenOnMap) {
      onOpenOnMap(state.message);
      setState({ status: "idle" });
      setInput("");
      setIsExpanded(false);
    } else {
      router.push(`/?message=${state.message._id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") search();
  };

  return (
    <div className="relative w-full">
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex min-h-[48px] w-full items-center gap-3 rounded-xl border border-white/15 bg-[#0d1117] px-4 py-3 text-left text-base text-slate-400 transition hover:border-white/20 hover:text-slate-300 md:min-h-0 md:text-sm"
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span>Find message by ID</span>
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-white/15 bg-[#0d1117] shadow-lg"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} />
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (state.status !== "idle") setState({ status: "idle" });
              }}
              onKeyDown={handleKeyDown}
              placeholder="Paste message ID (24 chars)..."
              className="min-w-0 flex-1 bg-transparent text-base text-slate-200 placeholder-slate-600 outline-none md:text-sm"
              autoFocus
            />
            <button
              onClick={() => {
                setInput("");
                setState({ status: "idle" });
                setIsExpanded(false);
              }}
              className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-slate-300"
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <button
              onClick={search}
              disabled={state.status === "loading" || !input.trim()}
              className="flex min-h-[44px] shrink-0 items-center rounded-lg bg-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {state.status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                "Search"
              )}
            </button>
          </div>
          <AnimatePresence>
            {state.status === "error" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-white/10 px-4 py-3 text-sm text-amber-400"
              >
                {state.message}
              </motion.div>
            )}
            {state.status === "found" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap gap-2 border-t border-white/10 p-3"
              >
                <button
                  onClick={handleViewPage}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-slate-300 transition hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400"
                >
                  <ExternalLink className="h-4 w-4" strokeWidth={2} />
                  View
                </button>
                <button
                  onClick={handleOpenOnMap}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-3 py-2.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/25"
                >
                  <MapPin className="h-4 w-4" strokeWidth={2} />
                  Open on map
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
