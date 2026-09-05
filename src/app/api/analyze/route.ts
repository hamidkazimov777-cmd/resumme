import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { analyzeJob } from "@/server/ai";

const schema = z.object({
  sourceUrl: z.string().url().optional(),
  rawText: z.string().optional(),
});

// Best-effort fetch + strip of a job posting URL. Many boards block bots, so
// pasting text is the reliable path; this is a convenience fallback.
async function fetchJobText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; Resumee/1.0)" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Fetch failed (${res.status}).`);
  const html = await res.text();
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 12000);
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  let { rawText } = parsed.data;
  const { sourceUrl } = parsed.data;

  try {
    if ((!rawText || rawText.trim().length < 40) && sourceUrl) {
      rawText = await fetchJobText(sourceUrl);
    }
    if (!rawText || rawText.trim().length < 40) {
      return NextResponse.json(
        { error: "Provide job text (or a URL we can fetch). Too little content." },
        { status: 400 }
      );
    }
    const { job, analysis } = await analyzeJob({ sourceUrl, rawText });
    return NextResponse.json({ jobId: job.id, analysis });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
