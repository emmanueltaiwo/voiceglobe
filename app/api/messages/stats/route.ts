import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { iso1A2Code } from "country-coder";
import { flag, name } from "country-emoji";

export async function GET() {
  const now = Date.now();
  const db = await getDb();
  const messages = await db
    .collection("messages")
    .find({ expiresAt: { $gt: now } })
    .toArray();

  const total = messages.length;
  let totalDuration = 0;
  const byCountry = new Map<string, number>();

  for (const msg of messages) {
    totalDuration += msg.duration;
    const code = iso1A2Code([msg.lng, msg.lat]);
    if (code) {
      byCountry.set(code, (byCountry.get(code) ?? 0) + 1);
    }
  }

  const topCountries: {
    code: string;
    name: string;
    flag: string;
    count: number;
  }[] = [];
  const sorted = [...byCountry.entries()].sort((a, b) => b[1] - a[1]);
  for (let i = 0; i < Math.min(5, sorted.length); i++) {
    const [code, count] = sorted[i];
    const flagEmoji = flag(code);
    const countryName = name(code) ?? code;
    if (flagEmoji) {
      topCountries.push({ code, name: countryName, flag: flagEmoji, count });
    }
  }

  return NextResponse.json({
    total,
    totalDurationMinutes: Math.round((totalDuration / 60) * 10) / 10,
    topCountries,
  });
}
