'use client';

import { useRef, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useQuery } from 'convex/react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useClientId } from '@/hooks/useClientId';
import { api } from '@/convex/_generated/api';
import { Play, Square, MessageCircle, MapPin, X, Award } from 'lucide-react';
import type { Message } from '@/lib/types';
import { getCountryFromCoords } from '@/lib/geo';
import { ReactionBar } from '@/components/ReactionBar';

type Props = {
  message: Message;
  position?: { x: number; y: number; placement?: 'left' | 'right' } | null;
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
  const replies = useQuery(api.messages.getReplies, { messageId: message._id });
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
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const POPUP_WIDTH = 320;

  // Mobile: bottom sheet. Desktop: positioned near marker or top-right
  const style =
    isDesktop && position
      ? position.placement === 'left'
        ? {
            left: Math.max(8, position.x - POPUP_WIDTH - 12),
            top: position.y,
            right: 'auto',
            bottom: 'auto',
          }
        : {
            left: position.x + 12,
            top: position.y,
            right: 'auto',
            bottom: 'auto',
          }
      : isDesktop
        ? { right: 16, top: 96, left: 'auto', bottom: 'auto' }
        : { left: 0, right: 0, bottom: 0, top: 'auto' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      className='absolute z-50 w-full max-w-sm rounded-xl border border-white/20 bg-[#0d1117]/98 shadow-2xl shadow-black/40 backdrop-blur-md md:w-80'
      style={style}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: '100%' }}
        transition={{ duration: 0.4 }}
        className='h-0.5 bg-emerald-500'
      />
      <div className='flex items-start justify-between gap-3 border-b border-white/10 p-4'>
        <div className='flex min-w-0 flex-1 gap-4'>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onPointerDown={togglePlay}
            className='flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-emerald-500 bg-white/5 text-emerald-400 transition hover:bg-emerald-500 hover:text-white md:h-10 md:w-10'
          >
            {playing ? (
              <Square className='h-5 w-5 fill-current md:h-3.5 md:w-3.5' />
            ) : (
              <Play className='ml-0.5 h-5 w-5 fill-current md:h-3.5 md:w-3.5' />
            )}
          </motion.button>
          <div className='min-w-0 flex-1'>
            <p className='font-mono text-lg tabular-nums text-emerald-400 md:text-sm'>
              {formatDuration(message.duration)}
            </p>
            <p className='text-[10px] font-mono uppercase tracking-wider text-text-dim'>
              {formatTimestamp(message.createdAt)}
            </p>
            {country && (
              <p className='mt-2 flex items-center gap-2 text-sm text-text md:text-xs'>
                <span className='text-xl md:text-base'>{country.flag}</span>
                <span className='font-mono'>{country.name}</span>
              </p>
            )}
            {message.isFirstInCountry && country && (
              <motion.div
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className='mt-2 inline-flex items-center gap-1.5 rounded border border-emerald-500/50 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-emerald-400'
              >
                <Award className='h-3 w-3' />
                First in {country.name}
              </motion.div>
            )}
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className='shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white'
        >
          <X className='h-4 w-4 md:h-3.5 md:w-3.5' strokeWidth={2} />
        </motion.button>
      </div>
      <div className='border-t border-white/10 px-4 py-2'>
        <ReactionBar messageId={message._id} clientId={clientId} />
      </div>
      {playError && (
        <p className='border-t border-white/10 px-4 py-2 text-[10px] text-amber-400'>
          Unable to play this recording.
        </p>
      )}
      <audio
        ref={audioRef}
        src={message.audioUrl}
        onEnded={handleEnded}
        onError={handleAudioError}
        preload='auto'
        playsInline
      />
      {(replies?.length ?? 0) > 0 && (
        <div className='border-t border-white/10 p-3'>
          <p className='mb-2 text-[9px] font-mono uppercase tracking-widest text-text-dim'>
            Replies ({replies?.length})
          </p>
          <div className='space-y-2'>
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
        <div className='border-t border-white/10 p-3'>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              onClose();
              onReply(message);
            }}
            className='flex w-full items-center justify-center gap-2 rounded-lg border-2 border-emerald-500 py-3 text-xs font-mono uppercase tracking-wider text-emerald-400 transition hover:bg-emerald-500 hover:text-white md:py-2.5 md:text-[10px]'
          >
            <MessageCircle className='h-4 w-4 md:h-3 md:w-3' strokeWidth={2} />
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
    <div className='flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2 md:gap-2 md:p-1.5'>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onPointerDown={togglePlay}
        className='flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/20 text-emerald-400 transition hover:border-emerald-500 md:h-7 md:w-7'
      >
        {playing ? (
          <Square className='h-2.5 w-2.5 fill-current' />
        ) : (
          <Play className='ml-0.5 h-2.5 w-2.5 fill-current' />
        )}
      </motion.button>
      {playError && (
        <span className='text-[9px] text-amber-400'>Can&apos;t play</span>
      )}
      <audio
        ref={audioRef}
        src={reply.audioUrl}
        onEnded={() => setPlaying(false)}
        onError={() => setPlayError(true)}
        preload='auto'
        playsInline
      />
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
          <p className='font-mono text-sm tabular-nums text-text md:text-[10px]'>
            {formatDuration(reply.duration)}
          </p>
          <p className='text-[10px] text-text-dim md:text-[9px]'>
            {formatTimestamp(reply.createdAt)}
          </p>
        </div>
        <ReactionBar messageId={reply._id} clientId={clientId} compact />
      </div>
      {onShowOnMap && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            onShowOnMap(reply.lng, reply.lat);
            onClose?.();
          }}
          className='flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/20 text-slate-400 transition hover:border-emerald-500 hover:text-emerald-400 md:h-7 md:w-7'
          title='Show on map'
        >
          <MapPin className='h-3 w-3 md:h-2.5 md:w-2.5' strokeWidth={2} />
        </motion.button>
      )}
    </div>
  );
}
