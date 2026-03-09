'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { formatDuration, formatTimestamp } from '@/lib/utils';
import type { Message } from '@/lib/types';
import { createMicIconDataUrl } from '@/lib/mic-icon';
import { MarkerPopup } from '@/components/MarkerPopup';

const MAPBOX_TOKEN =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ??
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN)
    : undefined;

type Bounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export function Globe({
  onSelectLocation,
  onReply,
  onCancelPlacement,
  messageToOpen,
  onPopupClose,
  searchTarget,
}: {
  onSelectLocation?: (lat: number, lng: number) => void;
  onReply?: (message: Message) => void;
  onCancelPlacement?: () => void;
  messageToOpen?: Message | null;
  onPopupClose?: () => void;
  searchTarget?: { lng: number; lat: number; zoom?: number } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<import('mapbox-gl').Map | null>(null);
  const messagesRef = useRef<typeof messages>(undefined);
  const [mapReady, setMapReady] = useState(false);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [popupMessage, setPopupMessage] = useState<Message | null>(null);
  const [popupPosition, setPopupPosition] = useState<{
    x: number;
    y: number;
    placement: 'left' | 'right';
  } | null>(null);
  const [isClickMode, setIsClickMode] = useState(false);

  useEffect(() => {
    if (!messageToOpen || !mapReady) return;
    setPopupMessage(messageToOpen);
    setPopupPosition(null);
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo({
        center: [messageToOpen.lng, messageToOpen.lat],
        zoom: 14,
        duration: 1500,
      });
    }
  }, [messageToOpen, mapReady]);

  useEffect(() => {
    if (!searchTarget || !mapReady) return;
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo({
        center: [searchTarget.lng, searchTarget.lat],
        zoom: searchTarget.zoom ?? 10,
        duration: 1500,
      });
    }
  }, [searchTarget, mapReady]);

  useEffect(() => {
    if (onSelectLocation && !isClickMode) setIsClickMode(true);
  }, [onSelectLocation]);

  const messages = useQuery(
    api.messages.getMessagesInBounds,
    bounds
      ? {
          minLat: bounds.minLat,
          maxLat: bounds.maxLat,
          minLng: bounds.minLng,
          maxLng: bounds.maxLng,
        }
      : 'skip',
  );
  messagesRef.current = messages;

  // Stable serialization of message IDs for comparison - avoid setData when data unchanged
  const messageIdsKey = (messages ?? [])
    .map((m) => m._id)
    .sort()
    .join(',');
  const prevMessageIdsRef = useRef<string>('');

  const updateBounds = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const b = map.getBounds();
    if (!b) return;
    setBounds({
      minLat: b.getSouth(),
      maxLat: b.getNorth(),
      minLng: b.getWest(),
      maxLng: b.getEast(),
    });
  }, []);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;

    setMapReady(false);
    let map: import('mapbox-gl').Map;

    import('mapbox-gl').then((mapboxgl) => {
      mapboxgl.default.accessToken = MAPBOX_TOKEN;
      map = new mapboxgl.default.Map({
        container: containerRef.current!,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [0, 20],
        zoom: 2,
        projection: 'globe',
      });

      map.on('load', () => {
        // Space-like atmosphere: dark blue background with visible stars
        map.setFog({
          color: 'rgb(5, 10, 20)',
          'high-color': 'rgb(15, 25, 45)',
          'horizon-blend': 0.15,
          'space-color': 'rgb(5, 8, 15)',
          'star-intensity': 0.6,
        });
        mapInstanceRef.current = map;
        updateBounds();
        setMapReady(true);
      });

      map.on('moveend', updateBounds);
      map.on('zoomend', updateBounds);
    });

    return () => {
      setMapReady(false);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [updateBounds]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const sourceId = 'messages-source';
    const source = map.getSource(sourceId);
    const geoData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: (messages ?? []).map((m) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [m.lng, m.lat] },
        properties: { id: m._id },
      })),
    };

    if (!source) {
      prevMessageIdsRef.current = messageIdsKey;
      map.addSource(sourceId, {
        type: 'geojson',
        data: geoData,
      });

      const addLayersAndHandlers = () => {
        map.addLayer({
          id: 'messages-points',
          type: 'symbol',
          source: sourceId,
          layout: {
            'icon-image': 'mic-icon',
            'icon-size': 0.6,
            'icon-allow-overlap': true,
          },
        });

        map.on('click', 'messages-points', (e) => {
          const id = e.features?.[0]?.properties?.id as
            | Id<'messages'>
            | undefined;
          if (!id) return;
          const msg = messagesRef.current?.find((m) => m._id === id);
          if (msg) {
            setPopupMessage(msg);
            const pt = e.point;
            const containerWidth = map.getContainer().clientWidth;
            const popupWidth = 320;
            const offset = 12;
            const spaceOnRight = containerWidth - (pt.x + offset);
            const spaceOnLeft = pt.x - offset;
            const placement: 'left' | 'right' =
              spaceOnRight >= popupWidth
                ? 'right'
                : spaceOnLeft >= popupWidth
                  ? 'left'
                  : spaceOnRight >= spaceOnLeft
                    ? 'right'
                    : 'left';
            setPopupPosition({ x: pt.x, y: pt.y, placement });
          }
        });

        map.on('mouseenter', 'messages-points', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'messages-points', () => {
          map.getCanvas().style.cursor = '';
        });
      };

      createMicIconDataUrl().then((dataUrl) => {
        if (!dataUrl) return;
        map.loadImage(dataUrl, (err, image) => {
          if (err || !image) return;
          map.addImage('mic-icon', image);
          addLayersAndHandlers();
        });
      });
    } else {
      // Only call setData when message IDs actually changed - prevents blink on pan/zoom
      // Skip when messages is undefined (query loading) to avoid briefly clearing markers
      if (
        messages !== undefined &&
        messageIdsKey !== prevMessageIdsRef.current
      ) {
        prevMessageIdsRef.current = messageIdsKey;
        (source as import('mapbox-gl').GeoJSONSource).setData(geoData);
      }
    }
  }, [messages, mapReady, messageIdsKey]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !onSelectLocation || !isClickMode) return;

    const handler = (e: import('mapbox-gl').MapMouseEvent) => {
      onSelectLocation(e.lngLat.lat, e.lngLat.lng);
      setIsClickMode(false);
    };
    map.once('click', handler);
    map.getCanvas().style.cursor = 'crosshair';
    return () => {
      map.off('click', handler);
      map.getCanvas().style.cursor = '';
    };
  }, [isClickMode, onSelectLocation]);

  const flyTo = useCallback((lng: number, lat: number, zoom = 14) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo({ center: [lng, lat], zoom, duration: 1500 });
  }, []);

  const handlePopupClose = useCallback(() => {
    setPopupMessage(null);
    setPopupPosition(null);
    onPopupClose?.();
  }, [onPopupClose]);

  const flyToRandom = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const lng = (Math.random() - 0.5) * 360;
    const lat = (Math.random() - 0.5) * 170;
    map.flyTo({
      center: [lng, lat],
      zoom: 2 + Math.random() * 2,
      duration: 2000,
    });
  }, []);

  const startDropPin = useCallback(() => {
    setIsClickMode(true);
  }, []);

  return (
    <div className='relative h-full w-full min-h-[300px] md:min-h-[400px]'>
      <div ref={containerRef} className='absolute inset-0 h-full w-full' />

      <div className='absolute bottom-24 left-3 hidden md:flex flex-col gap-2 md:bottom-3 md:left-3'>
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.03, borderColor: 'rgba(163, 230, 53, 0.8)' }}
          whileTap={{ scale: 0.97 }}
          onClick={flyToRandom}
          className='rounded-lg border border-white/10 bg-[#0d1117]/95 px-4 py-2.5 text-left text-xs font-mono uppercase leading-tight tracking-wider text-slate-200 shadow-xl shadow-black/40 backdrop-blur-md transition md:px-3 md:py-2 md:text-[10px]'
          title='Fly to a random location on the map'
        >
          Navigate to random location
        </motion.button>
        {onSelectLocation && (
          <>
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
              whileHover={{
                scale: 1.03,
                borderColor: isClickMode
                  ? 'rgba(239, 68, 68, 0.8)'
                  : 'rgba(163, 230, 53, 0.8)',
              }}
              whileTap={{ scale: 0.97 }}
              onClick={
                isClickMode
                  ? () => {
                      setIsClickMode(false);
                      onCancelPlacement?.();
                    }
                  : startDropPin
              }
              className={`rounded-lg border px-4 py-2.5 text-xs font-mono uppercase tracking-wider shadow-xl shadow-black/40 backdrop-blur-md transition md:px-3 md:py-2 md:text-[10px] ${
                isClickMode
                  ? 'border-red-500/70 bg-red-500/20 text-red-400'
                  : 'border-white/10 bg-[#0d1117]/95 text-slate-200'
              }`}
            >
              {isClickMode ? 'Cancel' : 'Drop pin'}
            </motion.button>
            <AnimatePresence>
              {isClickMode && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className='text-[10px] font-mono uppercase tracking-wider text-slate-500'
                >
                  Tap map to transmit
                </motion.p>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
      <AnimatePresence>
        {popupMessage && (
          <MarkerPopup
            message={popupMessage}
            position={popupPosition}
            onClose={handlePopupClose}
            formatDuration={formatDuration}
            formatTimestamp={formatTimestamp}
            onReply={onReply}
            onShowOnMap={flyTo}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
