import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const now = Date.now();
  const db = await getDb();
  const replies = await db
    .collection("messages")
    .find({
      replyTo: new ObjectId(id),
      expiresAt: { $gt: now },
    })
    .toArray();

  const result = replies.map((r) => ({
    ...r,
    _id: r._id.toString(),
    replyTo: r.replyTo?.toString(),
  }));

  return NextResponse.json(result);
}
