import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(request: Request) {
  const now = Date.now();
  const db = await getDb();
  const messages = await db
    .collection("messages")
    .find({
      lat: { $gte: -90, $lte: 90 },
      expiresAt: { $gt: now },
    })
    .limit(300)
    .toArray();

  if (messages.length === 0) {
    return NextResponse.json(null);
  }

  const randomIndex = Math.floor(Math.random() * messages.length);
  const msg = messages[randomIndex];
  return NextResponse.json({
    ...msg,
    _id: msg._id.toString(),
    replyTo: msg.replyTo?.toString(),
  });
}
