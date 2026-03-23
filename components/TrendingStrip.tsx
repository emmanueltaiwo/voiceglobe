'use client';

import { motion } from 'motion/react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { flag, name } from 'country-emoji';
import type { Message } from '@/lib/types';

type Props = {
  onOpenMessage?: (message: Message) => void;
};

export function TrendingStrip({ onOpenMessage }: Props) {
  const trending = useQuery(api.reactions.getTrendingByReactions, {
    limit: 10,
  });

  if (!trending || trending.length === 0) return null;

  return (
    <div className='relative'>
      <div
        className='pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#050810] to-transparent md:w-12'
        aria-hidden
      />
      <div
        className='pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#050810] to-transparent md:w-12'
        aria-hidden
      />
      <div className='no-scrollbar flex overflow-x-auto overflow-y-hidden scroll-smooth'>
        <div className='flex gap-2 px-2 py-2 md:gap-2.5 md:px-3 md:py-2.5'>
        {trending.map((item, i) => (
          <motion.button
            key={item.message._id}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onOpenMessage?.(item.message)}
            className='flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-[#0d1117]/90 px-3 py-1.5 backdrop-blur-md transition hover:border-amber-500/40 hover:bg-amber-500/10 md:gap-2 md:px-3.5 md:py-2'
          >
            <span className='font-mono text-[10px] text-slate-500 md:text-xs'>
              {i + 1}
            </span>
            <span className='text-sm md:text-base'>
              {item.message.countryCode
                ? flag(item.message.countryCode)
                : '🌍'}
            </span>
            <span className='max-w-[80px] truncate text-xs text-slate-300 md:max-w-[100px] md:text-sm'>
              {item.message.countryCode
                ? name(item.message.countryCode) ?? '—'
                : '—'}
            </span>
            <span className='flex items-center gap-1 font-mono text-[10px] text-amber-400/90 md:text-xs'>
              {item.reactionCount}
              <span>{item.topEmoji}</span>
            </span>
          </motion.button>
        ))}
        </div>
      </div>
    </div>
  );
}
