import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { iso1A2Code } from "country-coder";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_RECORDING_SEC = 10;

export async function POST(request: Request) {
  const body = await request.json();
  const { lat, lng, audioUrl, duration, replyTo } = body as {
    lat: number;
    lng: number;
    audioUrl: string;
    duration: number;
    replyTo?: string;
  };

  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    typeof audioUrl !== "string" ||
    typeof duration !== "number"
  ) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  if (duration > MAX_RECORDING_SEC) {
    return NextResponse.json(
      {
        error: `Recording exceeds maximum duration of ${MAX_RECORDING_SEC} seconds`,
      },
      { status: 400 },
    );
  }

  const db = await getDb();
  const now = Date.now();
  const countryCode = iso1A2Code([lng, lat]) ?? undefined;

  let isFirstInCountry = false;
  if (countryCode) {
    const existingInCountry = await db.collection("messages").findOne({
      countryCode,
      expiresAt: { $gt: now },
    });
    isFirstInCountry = !existingInCountry;
  }

  await db.collection("messages").insertOne({
    lat,
    lng,
    audioUrl,
    duration,
    createdAt: now,
    expiresAt: now + THIRTY_DAYS_MS,
    replyTo: replyTo ? new ObjectId(replyTo) : null,
    countryCode: countryCode ?? null,
    isFirstInCountry: countryCode ? isFirstInCountry : undefined,
  });

  return NextResponse.json({ ok: true });
}
