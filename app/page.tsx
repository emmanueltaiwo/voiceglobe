'use client';

import { useState, useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { motion, AnimatePresence } from 'motion/react';
import { Mic } from 'lucide-react';
import { Globe } from '@/components/Globe';
import { RecordModal } from '@/components/RecordModal';
import { PlaceLoadingOverlay } from '@/components/PlaceLoadingOverlay';
import { StatsPanel } from '@/components/StatsPanel';
import { LocationSearch } from '@/components/LocationSearch';
import { AppLoader } from '@/components/AppLoader';
import { useRecording } from '@/hooks/useRecording';
import type { Message } from '@/lib/types';

export default function Home() {
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [popupReplyTo, setPopupReplyTo] = useState<Message | null>(null);
  const [messageToOpen, setMessageToOpen] = useState<Message | null>(null);
  const [searchTarget, setSearchTarget] = useState<{
    lng: number;
    lat: number;
    zoom?: number;
  } | null>(null);

  const recording = useRecording();
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const createMessage = useMutation(api.messages.createMessage);

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

      setIsPlacing(true);
      try {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': recording.audioBlob.type },
          body: recording.audioBlob,
        });
        if (!result.ok) throw new Error('Upload failed');
        const { storageId } = (await result.json()) as {
          storageId: Id<'_storage'>;
        };
        await createMessage({
          lat,
          lng,
          audioStorageId: storageId,
          duration: Math.round(recording.duration * 10) / 10,
          replyTo: replyTo?._id,
        });
        recording.reset();
        setPendingLocation(null);
        setReplyTo(null);
        setPopupReplyTo(null);
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
      generateUploadUrl,
      createMessage,
      recording,
    ],
  );

  const handleReplyClick = useCallback(
    (message: Message) => {
      setPopupReplyTo(message);
      setReplyTo(message);
      recording.reset();
      setShowRecordModal(true);
    },
    [recording],
  );

  const hasPendingUpload = pendingLocation !== null;

  return (
    <main className='relative z-10 flex h-screen w-screen flex-col overflow-hidden bg-void'>
      <AppLoader>
        {/* Mobile: header with stats + search stacked; when stats expands, search stays below */}
        <div className='relative z-10 flex shrink-0 flex-col md:hidden'>
          <StatsPanel onOpenMessage={setMessageToOpen} />
          <div className='shrink-0 bg-void/80 px-4 py-3 backdrop-blur-sm'>
            <LocationSearch
              onSelect={(lng, lat, zoom) => setSearchTarget({ lng, lat, zoom })}
            />
          </div>
        </div>

        {/* Desktop only: stats strip + search */}
        <div className='hidden md:block'>
          <StatsPanel onOpenMessage={setMessageToOpen} />
        </div>
        <div className='absolute right-4 top-4 z-10 hidden w-64 md:block'>
          <LocationSearch
            onSelect={(lng, lat, zoom) => setSearchTarget({ lng, lat, zoom })}
          />
        </div>

        <div className='relative min-h-0 flex-1'>
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
