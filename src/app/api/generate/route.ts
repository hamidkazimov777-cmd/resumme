import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generate } from "@/server/ai";
import { currentUserId, unauthorized } from "@/server/auth";
import { RateLimitError } from "@/server/ratelimit";

const schema = z.object({
  jobId: z.string(),
  kind: z.enum(["resume", "cover_letter"]),
  format: z.enum(["A4", "Letter"]).default("A4"),
});

export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { jobId, kind, format } = parsed.data;
  try {
    const { generation, content } = await generate(userId, jobId, kind, format);
    return NextResponse.json({ generationId: generation.id, version: generation.version, content });
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: "Too many generations this hour. Try again later." }, { status: 429 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
