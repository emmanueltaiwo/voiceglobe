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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get("messageId");
  const clientId = searchParams.get("clientId");

  if (!messageId || !clientId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    new ObjectId(messageId);
  } catch {
    return NextResponse.json({ error: "Invalid messageId" }, { status: 400 });
  }

  const db = await getDb();
  const reactions = await db
    .collection("reactions")
    .find({ messageId: new ObjectId(messageId) })
    .toArray();

  const counts = Object.fromEntries(EMOJIS.map((e) => [e, 0])) as Record<
    (typeof EMOJIS)[number],
    number
  >;
  let myReaction: (typeof EMOJIS)[number] | null = null;

  for (const r of reactions) {
    if (EMOJIS.includes(r.emoji as (typeof EMOJIS)[number])) {
      counts[r.emoji as (typeof EMOJIS)[number]]++;
    }
    if (r.clientId === clientId) {
      myReaction = r.emoji as (typeof EMOJIS)[number];
    }
  }

  return NextResponse.json({ ...counts, myReaction });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { messageId, emoji, clientId } = body as {
    messageId: string;
    emoji: string;
    clientId: string;
  };

  if (!messageId || !emoji || !clientId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  if (!EMOJIS.includes(emoji as (typeof EMOJIS)[number])) {
    return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
  }

  const msgObjId = new ObjectId(messageId);
  const db = await getDb();

  const msg = await db.collection("messages").findOne({ _id: msgObjId });
  if (!msg || msg.expiresAt <= Date.now()) {
    return NextResponse.json(
      { error: "Message not found or expired" },
      { status: 404 },
    );
  }

  const existing = await db.collection("reactions").findOne({
    messageId: msgObjId,
    clientId,
  });

  if (existing) {
    if (existing.emoji === emoji) {
      await db.collection("reactions").deleteOne({ _id: existing._id });
      return NextResponse.json({ removed: true });
    }
    await db
      .collection("reactions")
      .updateOne({ _id: existing._id }, { $set: { emoji } });
  } else {
    await db.collection("reactions").insertOne({
      messageId: msgObjId,
      emoji,
      clientId,
    });
  }

  return NextResponse.json({ removed: false });
}
