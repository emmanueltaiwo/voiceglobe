import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const minLat = Number(searchParams.get("minLat"));
  const maxLat = Number(searchParams.get("maxLat"));
  const minLng = Number(searchParams.get("minLng"));
  const maxLng = Number(searchParams.get("maxLng"));

  if (
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLat) ||
    !Number.isFinite(minLng) ||
    !Number.isFinite(maxLng)
  ) {
    return NextResponse.json({ error: "Invalid bounds" }, { status: 400 });
  }

  const now = Date.now();
  const db = await getDb();
  const messages = await db
    .collection("messages")
    .find({
      lat: { $gte: minLat, $lte: maxLat },
      lng: { $gte: minLng, $lte: maxLng },
      expiresAt: { $gt: now },
    })
    .toArray();

  const result = messages.map((m) => ({
    ...m,
    _id: m._id.toString(),
    replyTo: m.replyTo?.toString(),
  }));

  return NextResponse.json(result);
}
