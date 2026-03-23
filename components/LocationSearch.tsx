"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const MAPBOX_TOKEN =
  typeof process !== "undefined"
    ? (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ??
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN)
    : undefined;

type SearchResult = {
  id: string;
  place_name: string;
  center: [number, number];
};

type Props = {
  onSelect: (lng: number, lat: number, zoom?: number) => void;
};

export function LocationSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const search = useCallback(async (q: string) => {
    if (!MAPBOX_TOKEN || !q.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&types=place,locality,country&limit=5`,
      );
      const data = await res.json();
      setResults(
        (data.features ?? []).map(
          (f: {
            id: string;
            place_name: string;
            center: [number, number];
          }) => ({
            id: f.id,
            place_name: f.place_name,
            center: f.center,
          }),
        ),
      );
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  const handleSelect = useCallback(
    (r: SearchResult) => {
      onSelect(r.center[0], r.center[1], 10);
      setQuery("");
      setResults([]);
      setIsOpen(false);
    },
    [onSelect],
  );

  return (
    <div className="relative w-full">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center gap-2 rounded-xl border border-white/10 bg-[#0d1117]/95 px-3 py-2.5 shadow-xl shadow-black/40 backdrop-blur-md transition md:py-2 ${
          isOpen ? "border-emerald-500/50 ring-2 ring-emerald-500/20" : ""
        }`}
      >
        <Search
          className="h-4 w-4 shrink-0 text-slate-400 md:h-3.5 md:w-3.5"
          strokeWidth={2}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search city or place..."
          className="min-w-0 flex-1 bg-transparent text-sm font-mono uppercase tracking-wider text-slate-200 placeholder-slate-500 outline-none md:text-xs"
        />
        {query && (
          <motion.button
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            onClick={() => {
              setQuery("");
              setResults([]);
              inputRef.current?.focus();
            }}
            className="shrink-0 rounded-sm p-1 text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
          >
            <X className="h-4 w-4 md:h-3 md:w-3" strokeWidth={2.5} />
          </motion.button>
        )}
      </motion.div>
      <AnimatePresence>
        {isOpen && (results.length > 0 || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#0d1117]/98 shadow-xl shadow-black/40 backdrop-blur-md"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-3 px-4 py-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2
                    className="h-4 w-4 text-emerald-400"
                    strokeWidth={2}
                  />
                </motion.div>
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
                  Scanning...
                </span>
              </div>
            ) : (
              results.map((r, i) => (
                <motion.button
                  key={r.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleSelect(r)}
                  className="flex w-full items-center gap-3 border-b border-white/10 px-4 py-3 text-left text-sm text-slate-200 transition last:border-b-0 hover:bg-white/5 hover:text-emerald-400 md:py-2.5 md:text-xs"
                >
                  <Search
                    className="h-3 w-3 shrink-0 text-slate-500"
                    strokeWidth={2}
                  />
                  <span className="truncate font-mono uppercase tracking-wider">
                    {r.place_name}
                  </span>
                </motion.button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {isOpen && !query && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}
    </div>
  );
}
