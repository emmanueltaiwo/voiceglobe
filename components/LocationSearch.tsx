"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, Loader2, MapPin } from "lucide-react";
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
        className={`flex items-center gap-3 rounded-xl border border-white/15 bg-[#0d1117] px-4 py-3 shadow-lg transition md:py-2.5 ${
          isOpen ? "border-emerald-500/40 shadow-emerald-500/5" : "hover:border-white/20"
        }`}
      >
        <Search
          className="h-4 w-4 shrink-0 text-slate-500"
          strokeWidth={2}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search city or place..."
          className="min-w-0 flex-1 bg-transparent text-base text-slate-200 placeholder-slate-600 outline-none md:text-sm"
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
            className="shrink-0 rounded-md p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-slate-300"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </motion.button>
        )}
      </motion.div>
      <AnimatePresence>
        {isOpen && (results.length > 0 || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/15 bg-[#0d1117] shadow-xl"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-3 px-4 py-6">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" strokeWidth={2} />
                <span className="text-sm text-slate-500">Searching...</span>
              </div>
            ) : (
              results.map((r, i) => (
                <motion.button
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  onClick={() => handleSelect(r)}
                  className="flex min-h-[44px] w-full items-center gap-3 border-b border-white/10 px-4 py-3 text-left text-base text-slate-200 transition last:border-b-0 hover:bg-emerald-500/10 hover:text-emerald-400 md:min-h-0 md:text-sm"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} />
                  <span className="truncate">{r.place_name}</span>
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
