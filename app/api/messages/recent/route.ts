import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { flag, name } from "country-emoji";

const DEFAULT_LIMIT = 100;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    200,
    Math.max(1, Number(searchParams.get("limit")) || DEFAULT_LIMIT),
  );

  const now = Date.now();
  const db = await getDb();
  const messages = await db
    .collection("messages")
    .find({ expiresAt: { $gt: now } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const result = messages.map((m) => ({
    ...m,
    _id: m._id.toString(),
    replyTo: m.replyTo?.toString(),
    countryName: m.countryCode ? (name(m.countryCode) ?? m.countryCode) : null,
    countryFlag: m.countryCode ? flag(m.countryCode) : null,
  }));

  return NextResponse.json(result);
}
