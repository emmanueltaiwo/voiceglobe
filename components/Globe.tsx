'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Locate, Loader2, Shuffle, X } from 'lucide-react';
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
  const userLocationCleanupRef = useRef<{
    timeout: ReturnType<typeof setTimeout>;
    interval: ReturnType<typeof setInterval>;
  } | null>(null);
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
  const [isLocating, setIsLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [showLocationDeniedModal, setShowLocationDeniedModal] = useState(false);

  useEffect(() => {
    if (!locateError) return;
    const t = setTimeout(() => setLocateError(null), 4000);
    return () => clearTimeout(t);
  }, [locateError]);

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

  const flyToCurrentLocation = useCallback(() => {
    if (typeof window === 'undefined') return;
    const map = mapInstanceRef.current;
    setLocateError(null);

    if (!map) return;
    if (!navigator.geolocation) {
      setLocateError('Location not supported');
      return;
    }
    if (!window.isSecureContext) {
      setLocateError('Use HTTPS for location');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude } = pos.coords;
        map.flyTo({
          center: [longitude, latitude],
          zoom: 14,
          duration: 1500,
        });
        setIsLocating(false);

        const sourceId = 'user-location-source';
        const layerIds = [
          'user-location-pulse-outer',
          'user-location-pulse-inner',
        ];

        const removeUserLocation = () => {
          if (userLocationCleanupRef.current) {
            clearTimeout(userLocationCleanupRef.current.timeout);
            clearInterval(userLocationCleanupRef.current.interval);
            userLocationCleanupRef.current = null;
          }
          layerIds.forEach((id) => {
            if (map.getLayer(id)) map.removeLayer(id);
          });
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        };

        removeUserLocation();

        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [longitude, latitude] },
            properties: {},
          },
        });

        map.addLayer({
          id: 'user-location-pulse-outer',
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 12,
            'circle-color': '#a3e635',
            'circle-opacity': 0.4,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#a3e635',
            'circle-stroke-opacity': 0.7,
          },
        });

        map.addLayer({
          id: 'user-location-pulse-inner',
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 5,
            'circle-color': '#a3e635',
            'circle-opacity': 1,
          },
        });

        const start = Date.now();
        const duration = 4000;
        const cycleMs = 1300;
        const pulseInterval = setInterval(() => {
          const elapsed = Date.now() - start;
          if (elapsed >= duration) {
            clearInterval(pulseInterval);
            return;
          }
          const t = (elapsed % cycleMs) / cycleMs;
          const scale = 1 + 0.8 * Math.sin(t * Math.PI);
          const radius = Math.round(12 * scale);
          const opacity = 0.4 - 0.25 * Math.sin(t * Math.PI);
          if (map.getLayer('user-location-pulse-outer')) {
            map.setPaintProperty(
              'user-location-pulse-outer',
              'circle-radius',
              radius,
            );
            map.setPaintProperty(
              'user-location-pulse-outer',
              'circle-opacity',
              opacity,
            );
          }
        }, 50);

        const timeout = setTimeout(() => {
          clearInterval(pulseInterval);
          removeUserLocation();
        }, 4000);
        userLocationCleanupRef.current = { timeout, interval: pulseInterval };
      },
      (err) => {
        if (err.code === 1) {
          setShowLocationDeniedModal(true);
        } else {
          const msg =
            err.code === 2 ? 'Location unavailable' : 'Location timed out';
          setLocateError(msg);
        }
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  const startDropPin = useCallback(() => {
    setIsClickMode(true);
  }, []);

  return (
    <div className='relative h-full w-full min-h-[300px] md:min-h-[400px]'>
      <div ref={containerRef} className='absolute inset-0 h-full w-full' />

      <div className='absolute bottom-24 left-3 z-20 flex flex-col gap-2 md:bottom-3 md:left-3'>
        <div className='flex flex-col gap-1'>
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.03, borderColor: 'rgba(163, 230, 53, 0.8)' }}
            whileTap={{ scale: 0.97 }}
            onClick={flyToCurrentLocation}
            disabled={isLocating || !mapReady}
            className='flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#0d1117]/95 px-3 py-2.5 text-xs font-mono uppercase leading-tight tracking-wider text-slate-200 shadow-xl shadow-black/40 backdrop-blur-md transition disabled:opacity-60 md:py-2 md:text-[10px]'
            title='Go to my location'
          >
            {isLocating ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' strokeWidth={2} />
            ) : (
              <Locate className='h-3.5 w-3.5 shrink-0' strokeWidth={2} />
            )}
            <span className='hidden md:inline'>My location</span>
          </motion.button>
          {locateError && (
            <p className='text-[10px] text-red-400'>{locateError}</p>
          )}
        </div>
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.03, borderColor: 'rgba(163, 230, 53, 0.8)' }}
          whileTap={{ scale: 0.97 }}
          onClick={flyToRandom}
          className='flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#0d1117]/95 px-3 py-2.5 text-left text-xs font-mono uppercase leading-tight tracking-wider text-slate-200 shadow-xl shadow-black/40 backdrop-blur-md transition md:py-2 md:text-[10px]'
          title='Fly to a random location on the map'
        >
          <Shuffle className='h-3.5 w-3.5 shrink-0' strokeWidth={2} />
          <span className='hidden md:inline'>Navigate to random</span>
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
        {showLocationDeniedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='fixed inset-0 z-60 flex items-center justify-center bg-void/90 p-4'
            onClick={() => setShowLocationDeniedModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className='w-full max-w-md rounded-2xl border border-white/20 bg-[#0d1117] p-6 shadow-2xl'
            >
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <h3 className='text-lg font-semibold text-slate-200'>
                    Location access denied
                  </h3>
                  <p className='mt-2 text-sm text-slate-400'>
                    To use &quot;My location&quot;, you need to allow location
                    access for this site.
                  </p>
                  <div className='mt-4 space-y-2 rounded-lg border border-white/10 bg-white/5 p-4'>
                    <p className='text-xs font-semibold uppercase tracking-wider text-slate-500'>
                      How to enable:
                    </p>
                    <ol className='list-inside list-decimal space-y-1.5 text-sm text-slate-300'>
                      <li>
                        Click the lock or info icon in your browser&apos;s
                        address bar
                      </li>
                      <li>
                        Find &quot;Location&quot; and set it to
                        &quot;Allow&quot;
                      </li>
                      <li>Refresh the page and try again</li>
                    </ol>
                  </div>
                </div>
                <button
                  onClick={() => setShowLocationDeniedModal(false)}
                  className='shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white'
                  aria-label='Close'
                >
                  <X className='h-5 w-5' strokeWidth={2} />
                </button>
              </div>
              <div className='mt-6 flex gap-2'>
                <button
                  onClick={() => setShowLocationDeniedModal(false)}
                  className='flex-1 rounded-lg border border-white/20 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/5'
                >
                  Got it
                </button>
                <button
                  onClick={() => {
                    setShowLocationDeniedModal(false);
                    flyToCurrentLocation();
                  }}
                  className='flex-1 rounded-lg border border-emerald-500/50 bg-emerald-500/15 py-3 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/25'
                >
                  Try again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
