'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Radio,
  MapPin,
  Loader2,
  Headphones,
} from 'lucide-react';
import { flag as flagFromCode, name as nameFromCode } from 'country-emoji';
import { useRadioQueue } from '@/hooks/useRadioQueue';
import { useClientId } from '@/hooks/useClientId';
import { getRadioQueuePreview } from '@/lib/api';
import { getCountryFromCoords } from '@/lib/geo';
import { formatDuration, formatTimestamp } from '@/lib/utils';
import { queryKeys } from '@/lib/queryKeys';
import type { Message } from '@/lib/types';
import { ReactionBar } from '@/components/ReactionBar';

function countryForMessage(m: Message) {
  if (m.countryCode) {
    const f = flagFromCode(m.countryCode);
    const n = nameFromCode(m.countryCode);
    if (f) return { flag: f, name: n ?? m.countryCode };
  }
  return getCountryFromCoords(m.lat, m.lng);
}

function Ticker({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const repeated = [...items, ...items, ...items];
  return (
    <div className='relative overflow-hidden border-y border-white/5 py-2'>
      <div className='pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-linear-to-r from-void to-transparent' />
      <div className='pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-linear-to-l from-void to-transparent' />
      <motion.div
        className='flex whitespace-nowrap'
        animate={{ x: [0, `-${(100 / 3).toFixed(4)}%`] }}
        transition={{
          duration: items.length * 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {repeated.map((t, i) => (
          <span
            key={i}
            className='mx-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500'
          >
            {t}
            <span className='mx-3 text-amber-500/40'>·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

function AudioProgress({
  audioRef,
  isPlaying,
}: {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
}) {
  const [pct, setPct] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      const a = audioRef.current;
      if (a && a.duration > 0) {
        setPct((a.currentTime / a.duration) * 100);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, audioRef]);

  return (
    <div className='relative h-px w-full bg-white/8 overflow-hidden'>
      <motion.div
        className='absolute inset-y-0 left-0 bg-amber-400'
        style={{ width: `${pct}%` }}
        transition={{ duration: 0.1 }}
      />
      {isPlaying && (
        <motion.div
          className='absolute inset-y-0 left-0 bg-amber-300/40 blur-sm'
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
}

function WaveformBars({ active }: { active: boolean }) {
  const heights = [30, 55, 75, 45, 85, 60, 35, 70, 50, 80, 40, 65, 30, 55, 75];
  return (
    <div className='flex h-12 items-end gap-0.5' aria-hidden>
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className='w-[3px] rounded-full bg-amber-500'
          animate={
            active
              ? {
                  height: [h * 0.3, h, h * 0.5, h * 0.8, h * 0.2, h][i % 6],
                  opacity: 0.7 + (i % 3) * 0.1,
                }
              : { height: 3, opacity: 0.15 }
          }
          transition={
            active
              ? {
                  duration: 0.3 + (i % 5) * 0.1,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  ease: 'easeInOut',
                }
              : { duration: 0.4 }
          }
        />
      ))}
    </div>
  );
}

export default function RadioPage() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const wantPlayRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playError, setPlayError] = useState(false);

  const clientId = useClientId();
  const {
    queue,
    current,
    currentIndex,
    bootError,
    loadingInitial,
    loadingMore,
    hasNext,
    atEndOfLoaded,
    goToNext,
    goToPrevious,
    prefetchAhead,
  } = useRadioQueue();

  const { data: previewData } = useQuery({
    queryKey: current
      ? queryKeys.radioQueuePreview(current._id)
      : ['radio', 'queue-preview', 'none'],
    queryFn: () => getRadioQueuePreview(current!._id, 5),
    enabled: !!current?._id,
    staleTime: 15_000,
  });

  const upNext =
    previewData?.messages && previewData.messages.length > 0
      ? previewData.messages
      : queue.slice(currentIndex + 1, currentIndex + 6);

  const tickerItems = upNext.map((m) => {
    const c = countryForMessage(m);
    return c ? `${c.flag} ${c.name}` : 'Unknown';
  });

  const syncPlayback = useCallback(() => {
    const a = audioRef.current;
    if (!current || !a) return;
    a.pause();
    setPlayError(false);
    a.src = current.audioUrl;
    a.load();
    if (wantPlayRef.current) {
      const p = a.play();
      if (p !== undefined) {
        p.then(() => setIsPlaying(true)).catch(() => {
          setIsPlaying(false);
          setPlayError(true);
          wantPlayRef.current = false;
        });
      }
    } else {
      setIsPlaying(false);
    }
  }, [current]);

  useEffect(() => {
    syncPlayback();
  }, [current?._id, syncPlayback]);

  useEffect(() => {
    void prefetchAhead();
  }, [currentIndex, prefetchAhead]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !current) return;
    setPlayError(false);
    if (isPlaying) {
      wantPlayRef.current = false;
      a.pause();
      setIsPlaying(false);
    } else {
      wantPlayRef.current = true;
      const p = a.play();
      if (p !== undefined) {
        p.then(() => setIsPlaying(true)).catch(() => {
          setPlayError(true);
          wantPlayRef.current = false;
        });
      } else {
        setIsPlaying(true);
      }
    }
  };

  const handleEnded = useCallback(async () => {
    const ok = await goToNext();
    wantPlayRef.current = ok;
    if (!ok) setIsPlaying(false);
  }, [goToNext]);

  const handleSkipNext = async () => {
    wantPlayRef.current = isPlaying;
    const ok = await goToNext();
    if (!ok) {
      wantPlayRef.current = false;
      setIsPlaying(false);
    }
  };

  const handleSkipPrev = () => {
    if (currentIndex <= 0) return;
    wantPlayRef.current = isPlaying;
    goToPrevious();
  };

  const country = current ? countryForMessage(current) : null;

  if (loadingInitial) {
    return (
      <main className='flex min-h-dvh flex-col items-center justify-center gap-6 bg-void px-4'>
        <div className='flex flex-col items-center gap-4'>
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className='font-mono text-6xl'
          >
            📡
          </motion.div>
          <p className='font-mono text-xs uppercase tracking-[0.3em] text-amber-500/70'>
            Tuning in
          </p>
        </div>
      </main>
    );
  }

  if (bootError || queue.length === 0) {
    return (
      <main className='flex min-h-dvh flex-col items-center justify-center gap-6 bg-void px-4'>
        <Headphones className='h-12 w-12 text-slate-700' strokeWidth={1} />
        <div className='text-center'>
          <p className='font-mono text-sm text-slate-400'>
            {bootError ?? 'No signals yet'}
          </p>
          <p className='mt-2 font-mono text-xs text-slate-600'>
            {bootError ? 'Check your connection.' : 'No voice messages on air.'}
          </p>
        </div>
        <Link
          href='/'
          className='mt-2 inline-flex items-center gap-2 border-b border-slate-700 pb-0.5 font-mono text-xs uppercase tracking-wider text-slate-500 transition hover:border-amber-500/50 hover:text-amber-400'
        >
          <ArrowLeft className='h-3 w-3' strokeWidth={2} />
          Back to globe
        </Link>
      </main>
    );
  }

  return (
    <main className='flex min-h-dvh flex-col bg-void pb-[env(safe-area-inset-bottom)]'>
      {/* Header */}
      <div className='flex items-center justify-between gap-4 px-4 pt-5 md:px-8'>
        <Link
          href='/'
          className='group flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-slate-600 transition hover:text-slate-300'
          aria-label='Back'
        >
          <ArrowLeft
            className='h-3.5 w-3.5 transition group-hover:-translate-x-0.5'
            strokeWidth={2}
          />
          <span className='hidden sm:inline'>Globe</span>
        </Link>

        <div className='flex flex-col items-center gap-1'>
          <span className='font-mono text-[9px] uppercase tracking-[0.35em] text-slate-600'>
            VoiceGlobe
          </span>
          <div className='flex items-center gap-2'>
            <span className='font-mono text-lg font-bold tracking-tight text-white'>
              RADIO
            </span>
            <span
              className={`flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider transition ${
                isPlaying
                  ? 'bg-amber-500/15 text-amber-400'
                  : 'bg-white/5 text-slate-600'
              }`}
            >
              <span
                className={`h-1 w-1 rounded-full ${isPlaying ? 'animate-pulse bg-amber-400' : 'bg-slate-600'}`}
              />
              {isPlaying ? 'On air' : 'Standby'}
            </span>
          </div>
        </div>

        <div className='w-14 text-right'>
          {loadingMore && (
            <Loader2
              className='ml-auto h-3.5 w-3.5 animate-spin text-slate-700'
              strokeWidth={2}
            />
          )}
        </div>
      </div>

      {/* Ticker */}
      <div className='mt-4'>
        <Ticker items={tickerItems} />
      </div>

      {/* Main — now playing */}
      <div className='flex min-h-0 flex-1 flex-col px-4 pt-8 md:px-8 md:pt-10'>
        <AnimatePresence mode='wait'>
          <motion.div
            key={current._id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className='flex flex-1 flex-col'
          >
            {/* Flag hero */}
            <div className='flex flex-col items-center gap-3 text-center md:flex-row md:items-end md:gap-6 md:text-left'>
              <motion.div
                key={current._id + '-flag'}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 18, stiffness: 260 }}
                className='shrink-0 text-[5rem] leading-none md:text-[6.5rem]'
              >
                {country?.flag ?? '🌍'}
              </motion.div>
              <div className='min-w-0 flex-1'>
                <p className='font-mono text-[10px] uppercase tracking-[0.25em] text-amber-500/70'>
                  Transmitting from
                </p>
                <h2 className='mt-1 truncate font-sans text-4xl font-black leading-none tracking-tight text-white md:text-5xl lg:text-6xl'>
                  {country?.name ?? 'Unknown'}
                </h2>
                <div className='mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 md:justify-start'>
                  <span className='font-mono text-lg tabular-nums text-amber-400'>
                    {formatDuration(current.duration)}
                  </span>
                  <span className='h-3 w-px bg-white/15' />
                  <span className='font-mono text-xs text-slate-500'>
                    {formatTimestamp(current.createdAt)}
                  </span>
                  {current.isFirstInCountry && country && (
                    <>
                      <span className='h-3 w-px bg-white/15' />
                      <span className='font-mono text-xs text-emerald-400/90'>
                        First ever ·{' '}
                        <span className='text-emerald-500'>{country.name}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Waveform */}
            <div className='mt-8 flex items-end justify-center md:justify-start'>
              <WaveformBars active={isPlaying} />
            </div>

            {/* Controls */}
            <div className='mt-6 flex items-center justify-center gap-5 md:justify-start'>
              <button
                type='button'
                onClick={handleSkipPrev}
                disabled={currentIndex <= 0}
                className='group flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-slate-500 transition hover:border-white/20 hover:text-white disabled:pointer-events-none disabled:opacity-20'
                aria-label='Previous'
              >
                <SkipBack className='h-5 w-5 fill-current' strokeWidth={1.5} />
              </button>

              <motion.button
                type='button'
                whileTap={{ scale: 0.93 }}
                onClick={togglePlay}
                className={`relative flex h-16 w-16 items-center justify-center rounded-full border-2 transition md:h-20 md:w-20 ${
                  isPlaying
                    ? 'border-amber-400 bg-amber-400 text-black shadow-[0_0_40px_rgba(251,191,36,0.4)]'
                    : 'border-amber-500/50 bg-transparent text-amber-400 hover:border-amber-400 hover:bg-amber-500/10'
                }`}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause
                    className='h-7 w-7 fill-current md:h-8 md:w-8'
                    strokeWidth={1.5}
                  />
                ) : (
                  <Play
                    className='ml-1 h-7 w-7 fill-current md:h-8 md:w-8'
                    strokeWidth={1.5}
                  />
                )}
              </motion.button>

              <button
                type='button'
                onClick={handleSkipNext}
                disabled={!hasNext && atEndOfLoaded}
                className='flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-slate-500 transition hover:border-white/20 hover:text-white disabled:pointer-events-none disabled:opacity-20'
                aria-label='Next'
              >
                <SkipForward
                  className='h-5 w-5 fill-current'
                  strokeWidth={1.5}
                />
              </button>

              <Link
                href={`/m/${current._id}`}
                className='ml-2 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-slate-600 transition hover:border-white/20 hover:text-slate-300'
                title='Message page'
              >
                <MapPin className='h-4.5 w-4.5' strokeWidth={2} />
              </Link>
            </div>

            {/* Progress bar */}
            <div className='mt-6'>
              <AudioProgress audioRef={audioRef} isPlaying={isPlaying} />
            </div>

            {playError && (
              <p className='mt-4 font-mono text-xs text-amber-500/80'>
                ⚠ Could not play this clip — skipping might help.
              </p>
            )}

            {/* Reactions */}
            {clientId && (
              <div className='mt-8 border-t border-white/5 pt-6'>
                <p className='mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-700'>
                  Reactions
                </p>
                <ReactionBar messageId={current._id} clientId={clientId} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Queue */}
        <section className='mt-10 border-t border-white/5 pt-8'>
          <p className='mb-4 font-mono text-[10px] uppercase tracking-[0.25em] text-slate-600'>
            Up next
            {upNext.length > 0 && (
              <span className='ml-2 text-amber-500/50'>
                {upNext.length} tracks
              </span>
            )}
          </p>

          {upNext.length === 0 ? (
            <p className='font-mono text-xs text-slate-700'>
              {atEndOfLoaded
                ? 'End of archive — new messages arrive live.'
                : 'Loading…'}
            </p>
          ) : (
            <ul>
              {upNext.map((m, i) => (
                <QueueRow key={m._id} message={m} index={i + 1} />
              ))}
            </ul>
          )}
        </section>

        <div className='mt-8 flex items-center gap-3 pb-10'>
          <Radio className='h-3 w-3 shrink-0 text-slate-700' strokeWidth={2} />
          <p className='font-mono text-[10px] text-slate-700'>
            {queue.length} messages in buffer
            {atEndOfLoaded && ' · archive complete'}
          </p>
        </div>
      </div>

      <audio
        ref={audioRef}
        onEnded={handleEnded}
        onError={() => setPlayError(true)}
        preload='auto'
        playsInline
      />
    </main>
  );
}

function QueueRow({ message, index }: { message: Message; index: number }) {
  const c = countryForMessage(message);
  return (
    <motion.li
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className='group flex items-center gap-4 border-b border-white/4 py-3.5 last:border-0'
    >
      <span className='w-5 shrink-0 font-mono text-[10px] tabular-nums text-slate-700'>
        {String(index).padStart(2, '0')}
      </span>
      <span className='shrink-0 text-xl leading-none'>{c?.flag ?? '🌍'}</span>
      <div className='min-w-0 flex-1'>
        <p className='truncate font-medium text-slate-400 transition group-hover:text-slate-200'>
          {c?.name ?? 'Unknown'}
        </p>
      </div>
      <div className='flex shrink-0 items-center gap-3 text-right'>
        <span className='font-mono text-xs tabular-nums text-slate-600'>
          {formatDuration(message.duration)}
        </span>
        <span className='hidden font-mono text-[10px] text-slate-700 sm:block'>
          {formatTimestamp(message.createdAt)}
        </span>
      </div>
    </motion.li>
  );
}
