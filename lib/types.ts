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
