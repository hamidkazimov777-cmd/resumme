import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { OWNER_ID, type ProviderId } from "@/lib/constants";
import { chat, parseJson } from "@/lib/ai/client";
import {
  intelligencePrompt,
  jobAnalysisPrompt,
  resumePrompt,
  coverLetterPrompt,
} from "@/lib/prompts/tasks";
import { serializeProfile, getOrCreateProfile, type FullProfile } from "./profile";
import type { IntelligenceData, JobAnalysis, ResumeDoc, CoverLetterDoc } from "@/lib/types";

// Resolve the active provider config, or throw a clear error.
export async function getActiveProvider() {
  const setting = await prisma.providerSetting.findFirst({
    where: { ownerId: OWNER_ID, isActive: true },
  });
  if (!setting) throw new Error("No active AI provider. Configure one in Settings.");
  if (!setting.apiKey) throw new Error("Active provider has no API key. Add it in Settings.");
  if (!setting.model) throw new Error("Active provider has no model selected. Pick one in Settings.");
  return setting;
}

async function run(system: string, prompt: string, json = true, maxTokens = 4096) {
  const p = await getActiveProvider();
  const result = await chat({
    provider: p.provider as ProviderId,
    baseUrl: p.baseUrl,
    apiKey: p.apiKey,
    model: p.model!,
    system,
    prompt,
    json,
    maxTokens,
  });
  return { text: result.text, model: p.model! };
}

export function profileHash(json: string): string {
  return createHash("sha256").update(json).digest("hex").slice(0, 32);
}

// Build (or reuse cached) Candidate Intelligence Profile.
export async function ensureIntelligence(force = false): Promise<{
  data: IntelligenceData;
  stale: boolean;
}> {
  const profile = await getOrCreateProfile();
  const json = serializeProfile(profile);
  const hash = profileHash(json);

  if (!force && profile.intelligence && profile.intelligence.sourceHash === hash) {
    return { data: JSON.parse(profile.intelligence.data) as IntelligenceData, stale: false };
  }

  const { system, prompt } = intelligencePrompt(json);
  const { text, model } = await run(system, prompt, true, 4000);
  const data = parseJson<IntelligenceData>(text);

  await prisma.intelligenceProfile.upsert({
    where: { profileId: profile.id },
    create: { profileId: profile.id, data: JSON.stringify(data), sourceHash: hash, model },
    update: { data: JSON.stringify(data), sourceHash: hash, model },
  });
  return { data, stale: false };
}

// Analyze a job: create Job row, run analysis against intelligence profile.
export async function analyzeJob(input: { sourceUrl?: string; rawText: string }) {
  const { data: intel } = await ensureIntelligence();
  const { system, prompt } = jobAnalysisPrompt(input.rawText, JSON.stringify(intel));
  const { text } = await run(system, prompt, true, 8000);
  const analysis = parseJson<JobAnalysis>(text);

  const job = await prisma.job.create({
    data: {
      ownerId: OWNER_ID,
      sourceUrl: input.sourceUrl,
      rawText: input.rawText,
      title: analysis.title,
      company: analysis.company,
      market: analysis.market,
      countryLang: analysis.language,
      seniority: analysis.seniority,
      analysis: JSON.stringify(analysis),
      matchScore: clampScore(analysis.matchScore),
    },
  });
  return { job, analysis };
}

// Generate a resume or cover letter for a job.
export async function generate(
  jobId: string,
  kind: "resume" | "cover_letter",
  format: "A4" | "Letter"
) {
  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  const profile = await getOrCreateProfile();
  const profileJson = serializeProfile(profile);
  const analysisJson = job.analysis ?? "{}";
  const analysis = JSON.parse(analysisJson) as JobAnalysis;
  const language = analysis.language || "English";

  const built =
    kind === "resume"
      ? resumePrompt(profileJson, analysisJson, format, language)
      : coverLetterPrompt(profileJson, analysisJson, language);

  const { text, model } = await run(built.system, built.prompt, true, kind === "resume" ? 8000 : 4000);
  const content =
    kind === "resume" ? parseJson<ResumeDoc>(text) : parseJson<CoverLetterDoc>(text);

  // Version = count of existing generations of this kind for this job + 1.
  const prior = await prisma.generation.count({ where: { jobId, kind } });
  const gen = await prisma.generation.create({
    data: {
      ownerId: OWNER_ID,
      jobId,
      kind,
      language,
      format,
      model,
      content: JSON.stringify(content),
      version: prior + 1,
    },
  });
  return { generation: gen, content };
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (isNaN(v)) return 0;
  return Math.min(100, Math.max(0, Math.round(v)));
}

export type { FullProfile };
