import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generate } from "@/server/ai";
import { currentUserId, unauthorized } from "@/server/auth";
import { readJsonBody } from "@/server/json";
import { RateLimitError } from "@/server/ratelimit";

const schema = z.object({
  jobId: z.string(),
  kind: z.enum(["resume", "cover_letter"]),
  format: z.enum(["A4", "Letter"]).default("A4"),
});

export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const parsed = schema.safeParse(await readJsonBody(req));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { jobId, kind, format } = parsed.data;
  try {
    const { generations } = await generate(userId, jobId, kind, format);
    return NextResponse.json({
      generationIds: generations.map((g) => g.id),
      versions: generations.map((g) => g.version),
    });
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: "Too many generations this hour. Try again later." }, { status: 429 });
    }
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
