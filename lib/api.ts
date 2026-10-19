import type { Message } from "./types";

export const API =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000")
    : (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000");

/** Derive WebSocket URL for /ws/recent from API base */
export function getWsRecentUrl(limit?: number): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const u = new URL(base);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/ws/recent";
  u.search = limit !== undefined ? `?limit=${limit}` : "";
  u.hash = "";
  return u.toString();
}

/** WebSocket URL for optional radio new-message push */
export function getWsRadioUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const u = new URL(base);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/ws/radio";
  u.search = "";
  u.hash = "";
  return u.toString();
}

export async function getRadioMessages(params?: {
  limit?: number;
  cursor?: string;
}): Promise<{ messages: Message[]; nextCursor: string | null }> {
  const q = new URLSearchParams();
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.cursor) q.set("cursor", params.cursor);
  const res = await fetch(`${API}/api/radio/messages?${q}`);
  if (res.status === 400) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.error === "string" ? err.error : "Invalid cursor",
    );
  }
  if (!res.ok) throw new Error("Failed to fetch radio messages");
  return res.json();
}

export async function getRadioMessagesSince(params: {
  afterCreatedAt: number;
  afterId: string;
  limit?: number;
}): Promise<{ messages: Message[] }> {
  const q = new URLSearchParams({
    afterCreatedAt: String(params.afterCreatedAt),
    afterId: params.afterId,
  });
  if (params.limit != null) q.set("limit", String(params.limit));
  const res = await fetch(`${API}/api/radio/messages/since?${q}`);
  if (res.status === 400) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.error === "string" ? err.error : "Invalid params",
    );
  }
  if (!res.ok) throw new Error("Failed to fetch new radio messages");
  return res.json();
}

export async function getRadioQueuePreview(
  afterMessageId: string,
  count = 5,
): Promise<{ messages: Message[] }> {
  const q = new URLSearchParams({
    afterMessageId,
    count: String(count),
  });
  const res = await fetch(`${API}/api/radio/queue-preview?${q}`);
  if (res.status === 404) {
    return { messages: [] };
  }
  if (res.status === 400) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.error === "string" ? err.error : "Invalid params",
    );
  }
  if (!res.ok) throw new Error("Failed to fetch queue preview");
  return res.json();
}

type UploadSignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  resourceType: string;
  allowedFormats: string;
};

export async function uploadAudio(blob: Blob): Promise<string> {
  const signRes = await fetch(`${API}/api/upload/signature`, {
    method: "POST",
  });
  if (!signRes.ok) throw new Error("Could not start upload. Please try again");
  const sig = (await signRes.json()) as UploadSignature;
  if (
    !sig.cloudName ||
    !sig.apiKey ||
    !sig.signature ||
    !sig.timestamp ||
    !sig.folder ||
    !sig.resourceType ||
    !sig.allowedFormats
  )
    throw new Error("Upload is not configured. Please try again later");

  const formData = new FormData();
  formData.append(
    "file",
    blob,
    blob.type.includes("mp4") ? "voice-note.mp4" : "voice-note.webm",
  );
  formData.append("api_key", sig.apiKey);
  formData.append("timestamp", String(sig.timestamp));
  formData.append("signature", sig.signature);
  formData.append("folder", sig.folder);
  formData.append("allowed_formats", sig.allowedFormats);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/${sig.resourceType}/upload`,
    {
      method: "POST",
      body: formData,
    },
  );
  const data = await res.json().catch(() => null);
  if (data?.error?.message)
    throw new Error(`Upload failed: ${data.error.message}`);
  if (!res.ok || !data || typeof data.secure_url !== "string")
    throw new Error("Upload failed. Please try again");
  return data.secure_url;
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

export async function getMessage(id: string): Promise<Message | null> {
  const res = await fetch(`${API}/api/messages/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch message");
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

export async function reportMessage(
  messageId: string,
  reason?: string,
): Promise<{ ok: boolean; duplicate: boolean; hidden: boolean }> {
  const res = await fetch(`${API}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reason ? { messageId, reason } : { messageId }),
  });
  if (res.status === 404) throw new Error("Message not found");
  if (res.status === 429) throw new Error("Too many reports, slow down");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      typeof err.error === "string" ? err.error : "Failed to report message",
    );
  }
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
