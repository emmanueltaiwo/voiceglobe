'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  Search,
  MessageCircle,
  Globe,
  X,
  Hash,
  Sparkles,
} from 'lucide-react';

const STORAGE_KEY = 'voiceglobe-welcome-dismissed';

export function WelcomeModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) setIsVisible(true);
    } catch {
      setIsVisible(true);
    }
  }, [mounted]);

  const handleClose = () => {
    setIsVisible(false);
  };

  const handleDoNotShowAgain = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const features = [
    {
      icon: Mic,
      title: 'Record & transmit',
      desc: 'Tap the mic to record a 10s voice message, then drop it anywhere on the globe.',
    },
    {
      icon: Globe,
      title: 'Explore the world',
      desc: 'Tap markers to listen to voice messages left by people around the world.',
    },
    {
      icon: Search,
      title: 'Search by place',
      desc: "Find a city or country and fly there. Discover what's being said there.",
    },
    {
      icon: Hash,
      title: 'Find by message ID',
      desc: 'Paste a 24-character ID to jump straight to any message or open its shareable page.',
    },
    {
      icon: MessageCircle,
      title: 'Reply & react',
      desc: 'Reply to messages with your own recording or react with emojis.',
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className='fixed inset-0 z-[100] flex items-end justify-center bg-void/95 p-0 sm:items-center sm:p-4'
        onClick={handleClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.5 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className='flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border-t border-white/20 bg-[#0d1117] shadow-2xl sm:max-h-[85vh] sm:rounded-2xl sm:border sm:border-white/20'
        >
          <div className='shrink-0 border-b border-white/10 px-4 py-4 sm:px-6'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <div className='flex items-center gap-2'>
                  <span className='text-2xl'>🌍</span>
                  <h2 className='font-display text-xl font-bold text-slate-100 sm:text-2xl'>
                    Welcome to VoiceGlobe
                  </h2>
                </div>
                <p className='mt-2 text-sm text-slate-400'>
                  Voice messages on the globe. Here&apos;s how it works:
                </p>
              </div>
              <button
                onClick={handleClose}
                className='-mr-2 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg p-2 text-slate-500 transition hover:bg-white/10 hover:text-white'
                aria-label='Close'
              >
                <X className='h-5 w-5' strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto'>
            <div className='space-y-4 px-4 py-4 sm:px-6 sm:py-5'>
              {features.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.25 }}
                  className='flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4'
                >
                  <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10'>
                    <item.icon
                      className='h-5 w-5 text-emerald-400'
                      strokeWidth={2}
                    />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <h3 className='font-semibold text-slate-200'>
                      {item.title}
                    </h3>
                    <p className='mt-1 text-sm text-slate-500'>{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className='shrink-0 space-y-3 border-t border-white/10 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-4'>
            <div className='flex flex-col gap-2 sm:flex-row sm:justify-between'>
              <button
                onClick={handleClose}
                className='order-2 min-h-[48px] flex-1 rounded-xl border border-white/20 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5 sm:order-1'
              >
                Cancel
              </button>
              <button
                onClick={handleDoNotShowAgain}
                className='order-1 flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/50 bg-emerald-500/15 py-3 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/25 sm:order-2'
              >
                <Sparkles className='h-4 w-4' strokeWidth={2} />
                Don&apos;t show again
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
