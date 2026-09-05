import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generate } from "@/server/ai";

const schema = z.object({
  jobId: z.string(),
  kind: z.enum(["resume", "cover_letter"]),
  format: z.enum(["A4", "Letter"]).default("A4"),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { jobId, kind, format } = parsed.data;
  try {
    const { generation, content } = await generate(jobId, kind, format);
    return NextResponse.json({ generationId: generation.id, version: generation.version, content });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
