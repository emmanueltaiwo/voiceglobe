import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

const EMOJIS = [
  "heart",
  "laugh",
  "cry",
  "fire",
  "clap",
  "mindblown",
  "party",
  "wow",
] as const;

const EMOJI_LABELS: Record<string, string> = {
  heart: "❤️",
  laugh: "😂",
  cry: "😢",
  fire: "🔥",
  clap: "👏",
  mindblown: "🤯",
  party: "🎉",
  wow: "😮",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    20,
    Math.max(1, Number(searchParams.get("limit")) || 10),
  );

  const now = Date.now();
  const db = await getDb();
  const allReactions = await db.collection("reactions").find().toArray();

  const totalByMessage = new Map<string, number>();
  const byMessageAndEmoji = new Map<
    string,
    Partial<Record<(typeof EMOJIS)[number], number>>
  >();

  for (const r of allReactions) {
    const mid = r.messageId.toString();
    totalByMessage.set(mid, (totalByMessage.get(mid) ?? 0) + 1);
    const emojiMap = byMessageAndEmoji.get(mid) ?? {};
    const em = r.emoji as (typeof EMOJIS)[number];
    emojiMap[em] = (emojiMap[em] ?? 0) + 1;
    byMessageAndEmoji.set(mid, emojiMap);
  }

  const sorted = [...totalByMessage.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit * 2);

  const results: {
    message: Record<string, unknown>;
    reactionCount: number;
    topEmoji: string;
  }[] = [];

  for (const [messageId, count] of sorted) {
    if (results.length >= limit) break;
    const msg = await db.collection("messages").findOne({
      _id: new ObjectId(messageId),
    });
    if (msg && msg.expiresAt > now && !msg.replyTo) {
      const emojiMap = byMessageAndEmoji.get(messageId) ?? {};
      const topKey = (EMOJIS.reduce((a, b) =>
        (emojiMap[a] ?? 0) >= (emojiMap[b] ?? 0) ? a : b,
      ) ?? "heart") as (typeof EMOJIS)[number];
      results.push({
        message: {
          ...msg,
          _id: msg._id.toString(),
          replyTo: msg.replyTo?.toString(),
        },
        reactionCount: count,
        topEmoji: EMOJI_LABELS[topKey] ?? "❤️",
      });
    }
  }

  return NextResponse.json(results);
}
