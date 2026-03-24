'use client';

import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { Mic, ChevronDown, Heart, Radio } from 'lucide-react';
import { Globe } from '@/components/Globe';
import { RecordModal } from '@/components/RecordModal';
import { PlaceLoadingOverlay } from '@/components/PlaceLoadingOverlay';
import { StatsPanel } from '@/components/StatsPanel';
import { LocationSearch } from '@/components/LocationSearch';
import { MessageIdSearch } from '@/components/MessageIdSearch';
import { TrendingStrip } from '@/components/TrendingStrip';
import { AppLoader } from '@/components/AppLoader';
import { WelcomeModal } from '@/components/WelcomeModal';
import { useRecording } from '@/hooks/useRecording';
import { uploadAudio, getMessage } from '@/lib/api';
import { useCreateMessage } from '@/lib/useMutations';
import type { Message } from '@/lib/types';

const IS_DOWN = false;

function MobileShell({
  onOpenMessage,
  setSearchTarget,
}: {
  onOpenMessage: (m: Message) => void;
  setSearchTarget: (t: { lng: number; lat: number; zoom?: number }) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className='relative z-10 flex shrink-0 flex-col md:hidden'>
      <div
        role='button'
        tabIndex={0}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
        className='flex w-full cursor-pointer items-center gap-2 border-b border-white/5 bg-[#0d1117]/95 px-3 py-3 active:bg-white/5'
        aria-expanded={expanded}
      >
        <div className='min-w-0 flex-1'>
          <StatsPanel onOpenMessage={onOpenMessage} compact />
        </div>
        <span
          className={`shrink-0 text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        >
          <ChevronDown className='h-5 w-5' strokeWidth={2} />
        </span>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className='overflow-hidden'
          >
            <div className='border-b border-white/5 bg-void/80'>
              <TrendingStrip onOpenMessage={onOpenMessage} />
            </div>
            <div className='space-y-3 border-t border-white/5 bg-[#050810]/90 px-4 py-4'>
              <p className='text-xs font-medium text-slate-500'>Search</p>
              <LocationSearch
                onSelect={(lng, lat, zoom) => {
                  setSearchTarget({ lng, lat, zoom });
                  setExpanded(false);
                }}
              />
              <MessageIdSearch
                onOpenOnMap={(msg) => {
                  onOpenMessage(msg);
                  setExpanded(false);
                }}
              />
              <Link
                href='/radio'
                onClick={() => setExpanded(false)}
                className='flex min-h-[48px] items-center gap-3 rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-500/[0.12] to-transparent px-4 py-3 transition active:scale-[0.99] hover:border-amber-400/45 hover:from-amber-500/20'
              >
                <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10'>
                  <Radio
                    className='h-5 w-5 text-amber-400'
                    strokeWidth={2}
                  />
                </span>
                <span className='min-w-0 text-left'>
                  <span className='block text-sm font-semibold text-amber-400'>
                    Voice radio
                  </span>
                  <span className='mt-0.5 block text-[11px] text-slate-500'>
                    Stream every message, your session
                  </span>
                </span>
              </Link>
            </div>
            <a
              href='http://paystack.shop/pay/supportvoiceglobe'
              target='_blank'
              rel='noopener noreferrer'
              className='mx-4 mb-4 mt-2 block rounded-xl border border-white/10 bg-[#0d1117]/95 px-4 py-3 text-center transition hover:border-emerald-500/30 hover:bg-[#0d1117]'
            >
              <p className='text-[9px] text-slate-500'>
                Solo project — donate to help with server costs
              </p>
              <span className='mt-0.5 inline-flex items-center justify-center gap-1 text-[10px] font-medium text-emerald-400'>
                <Heart className='h-2.5 w-2.5' strokeWidth={2} />
                Support VoiceGlobe
              </span>
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DowntimeView() {
  return (
    <main className='relative z-10 flex h-dvh w-screen flex-col items-center justify-center overflow-hidden bg-void px-6'>
      <div className='max-w-md text-center'>
        <h1 className='font-mono text-2xl font-bold text-slate-200 md:text-3xl'>
          VoiceGlobe is temporarily down
        </h1>
        <p className='mt-4 text-slate-400'>
          We&apos;re experiencing a spike in traffic. I&apos;m working on it and
          the app should be back up shortly.
        </p>
        <p className='mt-6 text-sm text-slate-500'>
          Check for updates on{' '}
          <a
            href='https://twitter.com/ez0xai'
            target='_blank'
            rel='noopener noreferrer'
            className='text-emerald-400 underline transition hover:text-emerald-300'
          >
            @ez0xai
          </a>
        </p>
      </div>
    </main>
  );
}

function isValidMessageId(id: string): boolean {
  return /^[a-fA-F0-9]{24}$/.test(id);
}

function HomeContent() {
  const searchParams = useSearchParams();
  if (IS_DOWN) return <DowntimeView />;
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [messageToOpen, setMessageToOpen] = useState<Message | null>(null);
  const [searchTarget, setSearchTarget] = useState<{
    lng: number;
    lat: number;
    zoom?: number;
  } | null>(null);

  const recording = useRecording();
  const createMessage = useCreateMessage();

  const hasProcessedMessageParam = useRef(false);
  useEffect(() => {
    if (hasProcessedMessageParam.current) return;
    const messageId = searchParams.get('message');
    if (!messageId || !isValidMessageId(messageId)) return;
    hasProcessedMessageParam.current = true;
    getMessage(messageId).then((m) => {
      if (m) setMessageToOpen(m);
    });
  }, [searchParams]);

  const handleRecordClick = useCallback(() => {
    recording.reset();
    setReplyTo(null);
    setShowRecordModal(true);
  }, [recording]);

  const handleStopRecording = useCallback(() => {
    recording.stopRecording();
  }, [recording]);

  const handleUseRecording = useCallback(() => {
    if (!recording.audioBlob) return;
    setPendingLocation({ lat: 0, lng: 0 });
    setShowRecordModal(false);
  }, [recording.audioBlob]);

  const handleCancelRecording = useCallback(() => {
    recording.reset();
    setShowRecordModal(false);
    setReplyTo(null);
  }, [recording]);

  const handleSelectLocation = useCallback(
    async (lat: number, lng: number) => {
      if (!recording.audioBlob) return;
      if (recording.duration > 10) {
        console.error('Recording exceeds 10 second limit');
        return;
      }

      setIsPlacing(true);
      try {
        const { audioUrl } = await uploadAudio(recording.audioBlob);
        await createMessage.mutateAsync({
          lat,
          lng,
          audioUrl,
          duration: Math.round(recording.duration * 10) / 10,
          replyTo: replyTo?._id,
        });
        recording.reset();
        setPendingLocation(null);
        setReplyTo(null);
      } catch (err) {
        console.error('Failed to save message:', err);
      } finally {
        setIsPlacing(false);
      }
    },
    [
      recording.audioBlob,
      recording.duration,
      replyTo,
      recording,
      createMessage,
    ],
  );

  const handleReplyClick = useCallback(
    (message: Message) => {
      setReplyTo(message);
      recording.reset();
      setShowRecordModal(true);
    },
    [recording],
  );

  const hasPendingUpload = pendingLocation !== null;

  return (
    <main className='relative z-10 flex h-dvh w-screen flex-col overflow-hidden bg-void'>
      <AppLoader>
        {/* Mobile - collapsible top for more map space */}
        <MobileShell
          onOpenMessage={setMessageToOpen}
          setSearchTarget={setSearchTarget}
        />

        {/* Desktop only */}
        <div className='hidden md:block'>
          <StatsPanel onOpenMessage={setMessageToOpen} />
        </div>
        <div className='absolute right-4 top-16 z-10 hidden w-96 flex-col gap-3 md:flex'>
          <div className='rounded-xl border border-white/10 bg-[#0d1117]/95 p-3 shadow-xl backdrop-blur-md'>
            <p className='mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500'>
              Search
            </p>
            <div className='space-y-3'>
              <LocationSearch
                onSelect={(lng, lat, zoom) =>
                  setSearchTarget({ lng, lat, zoom })
                }
              />
              <MessageIdSearch onOpenOnMap={setMessageToOpen} />
              <Link
                href='/radio'
                className='flex items-center justify-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2.5 text-xs font-medium text-amber-400 transition hover:border-amber-400/50 hover:bg-amber-500/15'
              >
                <Radio className='h-3.5 w-3.5 shrink-0' strokeWidth={2} />
                Open voice radio
              </Link>
            </div>
          </div>
        </div>

        <div className='relative min-h-0 flex-1'>
          <div className='absolute left-1/2 top-4 z-10 hidden w-[min(calc(100vw-22rem),600px)] -translate-x-1/2 md:block'>
            <TrendingStrip onOpenMessage={setMessageToOpen} />
          </div>
          <Globe
            onSelectLocation={
              hasPendingUpload ? handleSelectLocation : undefined
            }
            onReply={handleReplyClick}
            onCancelPlacement={() => {
              setPendingLocation(null);
              recording.reset();
              setReplyTo(null);
            }}
            messageToOpen={messageToOpen}
            onPopupClose={() => setMessageToOpen(null)}
            searchTarget={searchTarget}
          />
        </div>

        <div className='absolute bottom-4 left-1/2 z-10 -translate-x-1/2 pb-[env(safe-area-inset-bottom)] md:left-auto md:right-4 md:bottom-4 md:translate-x-0 md:pb-0'>
          {!showRecordModal && !hasPendingUpload && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.3,
                type: 'spring',
                stiffness: 400,
                damping: 25,
              }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleRecordClick}
              className='flex h-14 w-14 min-w-[56px] items-center justify-center rounded-2xl border-2 border-emerald-500/70 bg-[#0d1117]/95 text-emerald-400 shadow-xl shadow-black/40 md:h-12 md:w-12 md:min-w-[48px] md:rounded-xl'
              aria-label='Record'
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <Mic className='h-6 w-6 md:h-5 md:w-5' strokeWidth={2} />
              </motion.div>
            </motion.button>
          )}
        </div>

        <WelcomeModal />
        <AnimatePresence>
          {isPlacing && <PlaceLoadingOverlay key='placing' />}
          {showRecordModal && (
            <RecordModal
              duration={recording.duration}
              isRecording={recording.isRecording}
              audioBlob={recording.audioBlob}
              onStart={recording.startRecording}
              onStop={handleStopRecording}
              onUse={handleUseRecording}
              onCancel={handleCancelRecording}
            />
          )}
        </AnimatePresence>
      </AppLoader>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className='flex min-h-dvh items-center justify-center bg-void'>
          <div className='h-8 w-8 animate-spin rounded-full border-2 border-emerald-500/50 border-t-emerald-400' />
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
