export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  const now = new Date();
  const diff = now.getTime() - ms;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

  return date.toLocaleDateString();
}

export const RANDOM_LOCATIONS: [number, number][] = [
  [37.7749, -122.4194],
  [40.7128, -74.006],
  [51.5074, -0.1278],
  [35.6762, 139.6503],
  [-33.8688, 151.2093],
  [48.8566, 2.3522],
  [52.52, 13.405],
  [41.9028, 12.4964],
  [-23.5505, -46.6333],
  [55.7558, 37.6173],
];
