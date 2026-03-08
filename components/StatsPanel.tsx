'use client';

import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shuffle,
  Zap,
  ChevronDown,
  ChevronUp,
  Radio,
  Mic2,
} from 'lucide-react';
import type { Message } from '@/lib/types';

function formatTimeAgo(ms: number): string {
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

type Props = {
  onOpenMessage?: (message: Message) => void;
};

export function StatsPanel({ onOpenMessage }: Props) {
  const stats = useQuery(api.messages.getStats, {});
  const recentActivity = useQuery(api.messages.getRecentActivity, { limit: 6 });
  const [randomSeed, setRandomSeed] = useState(0);
  const [hasRequestedRandom, setHasRequestedRandom] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [activityExpanded, setActivityExpanded] = useState(true);
  const randomMessage = useQuery(
    api.messages.getRandomMessage,
    randomSeed > 0 ? { seed: randomSeed } : 'skip',
  );
  const trending = useQuery(api.messages.getTrendingToday, {});

  useEffect(() => {
    if (hasRequestedRandom && randomMessage) {
      onOpenMessage?.(randomMessage);
      setHasRequestedRandom(false);
    }
  }, [hasRequestedRandom, randomMessage, onOpenMessage]);

  const handleSurpriseMe = () => {
    if (!stats || stats.total === 0) return;
    setRandomSeed(Date.now());
    setHasRequestedRandom(true);
  };

  if (stats === undefined) return null;

  const topCountries = stats.topCountries ?? [];

  return (
    <>
      <div className='absolute left-4 top-4 z-10 hidden w-[280px] flex-col gap-3 md:flex'>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className='overflow-hidden rounded-xl border border-white/10 bg-[#0d1117]/95 shadow-xl shadow-black/40 backdrop-blur-md'
        >
          <div className='flex items-center justify-between border-b border-white/10 px-4 py-2.5'>
            <div className='flex items-center gap-2'>
              <Radio className='h-3.5 w-3.5 animate-pulse text-emerald-400' />
              <span className='text-xs font-semibold uppercase tracking-wider text-slate-300'>
                VoiceGlobe · Live
              </span>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className='rounded p-1 text-slate-500 transition hover:bg-white/10 hover:text-slate-200'
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? (
                <ChevronUp className='h-3.5 w-3.5' />
              ) : (
                <ChevronDown className='h-3.5 w-3.5' />
              )}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className='overflow-hidden'
              >
                {/* Key metrics */}
                <div className='border-b border-white/10 px-4 py-3'>
                  <div className='text-lg'>
                    <span className='font-mono text-2xl font-bold tabular-nums text-emerald-400'>
                      {stats.total}
                    </span>
                    <span className='ml-1 text-sm text-slate-400'>
                      transmissions · {stats.totalDurationMinutes} min
                    </span>
                  </div>
                </div>

                {topCountries.length > 0 && (
                  <div className='border-b border-white/10 px-4 py-3'>
                    <div className='mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500'>
                      Countries
                    </div>
                    <div className='flex flex-col gap-1.5'>
                      {topCountries.map((c) => (
                        <div
                          key={c.code}
                          className='flex items-center gap-2 text-sm'
                        >
                          <span className='text-base'>{c.flag}</span>
                          <span className='flex-1 font-medium text-slate-200'>
                            {c.name}
                          </span>
                          <span className='font-mono text-xs text-slate-500'>
                            ({c.count})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className='flex gap-2 p-4'>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSurpriseMe}
                    disabled={!stats || stats.total === 0}
                    className='flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/25 disabled:opacity-40'
                  >
                    <Shuffle className='h-3.5 w-3.5' strokeWidth={2} />
                    Random
                  </motion.button>
                  {trending && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onOpenMessage?.(trending.message)}
                      className='flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/50 bg-red-500/15 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/25'
                    >
                      <Zap className='h-3.5 w-3.5' strokeWidth={2} />
                      Hot
                      <span className='font-mono text-xs'>
                        {trending.replyCount}
                      </span>
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className='flex max-h-[160px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0d1117]/95 shadow-xl backdrop-blur-md'
        >
          <div className='flex items-center justify-between border-b border-white/10 px-4 py-2.5'>
            <div className='flex items-center gap-2'>
              <Mic2 className='h-3.5 w-3.5 text-emerald-400' />
              <span className='text-[10px] font-semibold uppercase tracking-wider text-slate-500'>
                Recent activity
              </span>
            </div>
            <button
              onClick={() => setActivityExpanded(!activityExpanded)}
              className='rounded p-1 text-slate-500 transition hover:bg-white/5 hover:text-slate-200'
              aria-label={activityExpanded ? 'Collapse' : 'Expand'}
            >
              {activityExpanded ? (
                <ChevronUp className='h-3.5 w-3.5' />
              ) : (
                <ChevronDown className='h-3.5 w-3.5' />
              )}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {activityExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className='flex-1 overflow-y-auto overflow-x-hidden'
              >
                <div className='space-y-1 p-2'>
                  {recentActivity && recentActivity.length > 0 ? (
                    recentActivity.map((a) => (
                      <button
                        key={a._id}
                        type='button'
                        onClick={() =>
                          onOpenMessage?.({
                            _id: a._id,
                            lat: a.lat,
                            lng: a.lng,
                            audioUrl: a.audioUrl,
                            duration: a.duration,
                            createdAt: a.createdAt,
                            expiresAt: a.expiresAt,
                            replyTo: a.replyTo,
                            countryCode: a.countryCode,
                            isFirstInCountry: a.isFirstInCountry,
                          })
                        }
                        className='flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-slate-400 transition hover:bg-emerald-500/10 hover:text-slate-200'
                      >
                        <span>{a.countryFlag ?? '🌍'}</span>
                        <span className='flex-1 truncate'>
                          New recording in {a.countryName ?? 'Unknown'}
                        </span>
                        <span className='shrink-0 font-mono text-[10px] text-slate-500'>
                          {formatTimeAgo(a.createdAt)}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className='py-4 text-center text-xs text-slate-500'>
                      No recent activity
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className='mx-4 mt-4 flex shrink-0 flex-col gap-2 md:hidden'
      >
        <div className='flex items-center justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117]/95 px-4 py-3 shadow-xl shadow-black/40 backdrop-blur-md'>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-1'>
              <span className='font-mono text-xl font-semibold tabular-nums text-emerald-400'>
                {stats.total}
              </span>
              <span className='text-[10px] font-mono uppercase text-slate-500'>
                tx
              </span>
            </div>
            <div className='h-5 w-px bg-white/20' />
            <div className='flex items-center gap-1'>
              <span className='font-mono text-xl font-semibold tabular-nums text-emerald-400'>
                {stats.totalDurationMinutes}
              </span>
              <span className='text-[10px] font-mono uppercase text-slate-500'>
                min
              </span>
            </div>
            {topCountries.length > 0 && (
              <>
                <div className='h-5 w-px bg-white/20' />
                <div className='flex -space-x-1.5'>
                  {topCountries.slice(0, 5).map((c) => (
                    <span key={c.code} className='text-lg' title={c.name}>
                      {c.flag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className='flex gap-1'>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSurpriseMe}
              disabled={!stats || stats.total === 0}
              className='flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/70 text-emerald-400 disabled:opacity-40'
            >
              <Shuffle className='h-4 w-4' strokeWidth={2} />
            </motion.button>
            {trending && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onOpenMessage?.(trending.message)}
                className='flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/70 text-emerald-400'
              >
                <Zap className='h-4 w-4' strokeWidth={2} />
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
