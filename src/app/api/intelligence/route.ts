import { NextRequest, NextResponse } from "next/server";
import { ensureIntelligence } from "@/server/ai";
import { getOrCreateProfile, serializeProfile } from "@/server/profile";
import { profileHash } from "@/server/ai";

export async function GET() {
  const profile = await getOrCreateProfile();
  if (!profile.intelligence) return NextResponse.json({ data: null, stale: true });
  const hash = profileHash(serializeProfile(profile));
  return NextResponse.json({
    data: JSON.parse(profile.intelligence.data),
    stale: profile.intelligence.sourceHash !== hash,
    updatedAt: profile.intelligence.updatedAt,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  try {
    const result = await ensureIntelligence(!!body.force);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
