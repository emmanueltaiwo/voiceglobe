'use client';

import { useCallback, useRef, useState } from 'react';

const MAX_DURATION_MS = 10000;

// Prefer MP4 (plays everywhere: iOS, Android, desktop). Fallback to WebM for Chrome/Firefox.
function getPreferredAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return 'audio/webm';
  // MP4/AAC - best compatibility (iOS, Safari, all major browsers)
  if (MediaRecorder.isTypeSupported?.('audio/mp4')) return 'audio/mp4';
  if (MediaRecorder.isTypeSupported?.('audio/mp4;codecs=mp4a')) return 'audio/mp4;codecs=mp4a';
  // WebM/Opus - Chrome, Firefox, Edge (not Safari/iOS)
  if (MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus';
  return 'audio/webm';
}

export function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getPreferredAudioMimeType();
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType });
      } catch {
        recorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      const startTime = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunksRef.current.length) {
          const blobType = recorder.mimeType || mimeType;
          setAudioBlob(new Blob(chunksRef.current, { type: blobType || 'audio/webm' }));
        }
      };

      recorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setDuration(elapsed);
        if (elapsed >= MAX_DURATION_MS / 1000) {
          stopRecording();
        }
      }, 100);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to access microphone',
      );
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      setIsRecording(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    setError(null);
  }, []);

  return {
    isRecording,
    audioBlob,
    duration,
    error,
    startRecording,
    stopRecording,
    reset,
  };
}
