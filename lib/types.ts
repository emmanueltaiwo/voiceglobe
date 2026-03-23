export type Message = {
  _id: string;
  lat: number;
  lng: number;
  audioUrl: string;
  duration: number;
  createdAt: number;
  expiresAt: number;
  replyTo?: string;
  countryCode?: string;
  isFirstInCountry?: boolean;
};

/** Message from WebSocket recent feed (includes country display fields) */
export type RecentMessage = Message & {
  countryName: string | null;
  countryFlag: string | null;
};
