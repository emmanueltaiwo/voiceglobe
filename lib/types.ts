import type { Id } from '@/convex/_generated/dataModel';

export type Message = {
  _id: Id<'messages'>;
  lat: number;
  lng: number;
  audioUrl: string;
  duration: number;
  createdAt: number;
  expiresAt: number;
  replyTo?: Id<'messages'>;
  countryCode?: string;
  isFirstInCountry?: boolean;
};
