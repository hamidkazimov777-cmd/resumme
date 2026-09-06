import { NextRequest, NextResponse } from "next/server";
import { ensureIntelligence, profileHash } from "@/server/ai";
import { getOrCreateProfile, serializeProfile } from "@/server/profile";
import { currentUserId, unauthorized } from "@/server/auth";
import { RateLimitError } from "@/server/ratelimit";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const profile = await getOrCreateProfile(userId);
  if (!profile.intelligence) return NextResponse.json({ data: null, stale: true });
  const hash = profileHash(serializeProfile(profile));
  return NextResponse.json({
    data: JSON.parse(profile.intelligence.data),
    stale: profile.intelligence.sourceHash !== hash,
    updatedAt: profile.intelligence.updatedAt,
  });
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const body = await req.json().catch(() => ({}));
  try {
    const result = await ensureIntelligence(userId, !!body.force);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: "Too many analyses. Try again later." }, { status: 429 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
