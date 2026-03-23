import type { Message } from "./types";

const API = "";

export async function uploadAudio(blob: Blob): Promise<{ audioUrl: string }> {
  const formData = new FormData();
  formData.append("audio", blob);
  const res = await fetch(`${API}/api/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

export async function createMessage(params: {
  lat: number;
  lng: number;
  audioUrl: string;
  duration: number;
  replyTo?: string;
}): Promise<void> {
  const res = await fetch(`${API}/api/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to create message");
}

export async function getMessagesInBounds(params: {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}): Promise<Message[]> {
  const q = new URLSearchParams({
    minLat: String(params.minLat),
    maxLat: String(params.maxLat),
    minLng: String(params.minLng),
    maxLng: String(params.maxLng),
  });
  const res = await fetch(`${API}/api/messages/bounds?${q}`);
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
}

export async function getStats(): Promise<{
  total: number;
  totalDurationMinutes: number;
  topCountries: { code: string; name: string; flag: string; count: number }[];
}> {
  const res = await fetch(`${API}/api/messages/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function getRecentActivity(
  limit?: number,
): Promise<
  (Message & { countryName: string | null; countryFlag: string | null })[]
> {
  const q = limit ? `?limit=${limit}` : "";
  const res = await fetch(`${API}/api/messages/recent${q}`);
  if (!res.ok) throw new Error("Failed to fetch recent activity");
  return res.json();
}

export async function getRandomMessage(seed?: number): Promise<Message | null> {
  const q = seed !== undefined ? `?seed=${seed}` : "";
  const res = await fetch(`${API}/api/messages/random${q}`);
  if (!res.ok) throw new Error("Failed to fetch random message");
  return res.json();
}

export async function getTrendingToday(): Promise<{
  message: Message;
  replyCount: number;
} | null> {
  const res = await fetch(`${API}/api/messages/trending-today`);
  if (!res.ok) throw new Error("Failed to fetch trending");
  return res.json();
}

export async function getReplies(messageId: string): Promise<Message[]> {
  const res = await fetch(`${API}/api/messages/${messageId}/replies`);
  if (!res.ok) throw new Error("Failed to fetch replies");
  return res.json();
}

export async function getReactions(
  messageId: string,
  clientId: string,
): Promise<{
  heart: number;
  laugh: number;
  cry: number;
  fire: number;
  clap: number;
  mindblown: number;
  party: number;
  wow: number;
  myReaction: string | null;
}> {
  const q = new URLSearchParams({ messageId, clientId });
  const res = await fetch(`${API}/api/reactions?${q}`);
  if (!res.ok) throw new Error("Failed to fetch reactions");
  return res.json();
}

export async function setReaction(params: {
  messageId: string;
  emoji: string;
  clientId: string;
}): Promise<{ removed: boolean }> {
  const res = await fetch(`${API}/api/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Failed to set reaction");
  return res.json();
}

export async function getTrendingByReactions(limit?: number): Promise<
  {
    message: Message;
    reactionCount: number;
    topEmoji: string;
  }[]
> {
  const q = limit !== undefined ? `?limit=${limit}` : "";
  const res = await fetch(`${API}/api/reactions/trending${q}`);
  if (!res.ok) throw new Error("Failed to fetch trending");
  return res.json();
}
