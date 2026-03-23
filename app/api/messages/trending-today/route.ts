import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  const now = Date.now();
  const cutoff = now - ONE_DAY_MS;
  const db = await getDb();

  const recentMessages = await db
    .collection("messages")
    .find({ createdAt: { $gte: cutoff } })
    .toArray();

  const replyCountByParent = new Map<string, number>();
  for (const msg of recentMessages) {
    if (msg.replyTo) {
      const key = msg.replyTo.toString();
      replyCountByParent.set(key, (replyCountByParent.get(key) ?? 0) + 1);
    }
  }

  if (replyCountByParent.size === 0) {
    return NextResponse.json(null);
  }

  let topParentId: string | null = null;
  let maxCount = 0;
  for (const [id, count] of replyCountByParent) {
    if (count > maxCount) {
      maxCount = count;
      topParentId = id;
    }
  }

  if (!topParentId) return NextResponse.json(null);

  const parent = await db.collection("messages").findOne({
    _id: new ObjectId(topParentId),
  });
  if (!parent || parent.expiresAt <= now) return NextResponse.json(null);

  const replies = await db
    .collection("messages")
    .find({
      replyTo: new ObjectId(topParentId),
      createdAt: { $gte: cutoff },
    })
    .toArray();

  return NextResponse.json({
    message: {
      ...parent,
      _id: parent._id.toString(),
      replyTo: parent.replyTo?.toString(),
    },
    replyCount: replies.length,
  });
}
