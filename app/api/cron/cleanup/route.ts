import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const db = await getDb();
  const expired = await db
    .collection("messages")
    .find({ expiresAt: { $lt: now } })
    .toArray();

  for (const msg of expired) {
    await db.collection("reactions").deleteMany({ messageId: msg._id });
    await db.collection("messages").deleteOne({ _id: msg._id });
  }

  return NextResponse.json({ deleted: expired.length });
}
