import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { type ProviderId } from "@/lib/constants";
import { chat, parseJson } from "@/lib/ai/client";
import { decryptSecret } from "@/lib/crypto";
import {
  intelligencePrompt,
  jobAnalysisPrompt,
  resumePrompt,
  coverLetterPrompt,
} from "@/lib/prompts/tasks";
import { serializeProfile, getOrCreateProfile, type FullProfile } from "./profile";
import { enforceRateLimit } from "./ratelimit";
import { selectTemplate, selectTemplatePair } from "@/lib/design/templates";
import type { IntelligenceData, JobAnalysis, ResumeDoc, CoverLetterDoc } from "@/lib/types";

// Resolve the user's active provider config, or throw a clear error.
export async function getActiveProvider(ownerId: string) {
  const setting = await prisma.providerSetting.findFirst({
    where: { ownerId, isActive: true },
  });
  if (!setting) throw new Error("No active AI provider. Configure one in Settings.");
  if (!setting.apiKey) throw new Error("Active provider has no API key. Add it in Settings.");
  if (!setting.model) throw new Error("Active provider has no model selected. Pick one in Settings.");
  return setting;
}

async function run(ownerId: string, system: string, prompt: string, json = true, maxTokens = 4096) {
  const p = await getActiveProvider(ownerId);
  const result = await chat({
    provider: p.provider as ProviderId,
    baseUrl: p.baseUrl,
    apiKey: decryptSecret(p.apiKey),
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
export async function ensureIntelligence(ownerId: string, force = false): Promise<{
  data: IntelligenceData;
  stale: boolean;
}> {
  const profile = await getOrCreateProfile(ownerId);
  const json = serializeProfile(profile);
  const hash = profileHash(json);

  if (!force && profile.intelligence && profile.intelligence.sourceHash === hash) {
    return { data: JSON.parse(profile.intelligence.data) as IntelligenceData, stale: false };
  }

  if (force) await enforceRateLimit(ownerId, "intelligence");
  const { system, prompt } = intelligencePrompt(json);
  const { text, model } = await run(ownerId, system, prompt, true, 4000);
  const data = parseJson<IntelligenceData>(text);

  await prisma.intelligenceProfile.upsert({
    where: { profileId: profile.id },
    create: { profileId: profile.id, data: JSON.stringify(data), sourceHash: hash, model },
    update: { data: JSON.stringify(data), sourceHash: hash, model },
  });
  return { data, stale: false };
}

// Analyze a job: create Job row, run analysis against intelligence profile.
export async function analyzeJob(ownerId: string, input: { sourceUrl?: string; rawText: string }) {
  await enforceRateLimit(ownerId, "analyze");
  const { data: intel } = await ensureIntelligence(ownerId);
  const { system, prompt } = jobAnalysisPrompt(input.rawText, JSON.stringify(intel));
  const { text } = await run(ownerId, system, prompt, true, 8000);
  const analysis = parseJson<JobAnalysis>(text);

  const job = await prisma.job.create({
    data: {
      ownerId,
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

// How many resume versions a single "Generate resume" click produces.
const RESUME_VERSIONS = 2;

// Generate a resume (2 versions) or a cover letter for a job.
export async function generate(
  ownerId: string,
  jobId: string,
  kind: "resume" | "cover_letter",
  format: "A4" | "Letter"
) {
  const job = await prisma.job.findFirst({ where: { id: jobId, ownerId } });
  if (!job) throw new Error("Job not found.");
  await enforceRateLimit(ownerId, "generate");
  const profile = await getOrCreateProfile(ownerId);
  const profileJson = serializeProfile(profile);
  const analysisJson = job.analysis ?? "{}";
  const analysis = JSON.parse(analysisJson) as JobAnalysis;
  const language = analysis.language || "English";

  // --- Cover letter: single document, unchanged behavior. ---
  if (kind === "cover_letter") {
    const built = coverLetterPrompt(profileJson, analysisJson, language);
    const { text, model } = await run(ownerId, built.system, built.prompt, true, 4000);
    const content = parseJson<CoverLetterDoc>(text);
    const template = selectTemplate({
      market: analysis.market,
      seniority: analysis.seniority,
      title: analysis.title,
      includePhoto: false,
      hasPhotoFile: !!profile.photoPath,
    });
    const prior = await prisma.generation.count({ where: { jobId, kind } });
    const gen = await prisma.generation.create({
      data: {
        ownerId,
        jobId,
        kind,
        language,
        format,
        template,
        model,
        content: JSON.stringify(content),
        version: prior + 1,
      },
    });
    return { generations: [gen], contents: [content] };
  }

  // --- Resume: 2 distinct versions from ONE AI call. ---
  const built = resumePrompt(profileJson, analysisJson, format, language, RESUME_VERSIONS);
  const { text, model } = await run(ownerId, built.system, built.prompt, true, 16000);
  const parsed = parseJson<{ versions?: ResumeDoc[] } & ResumeDoc>(text);
  // Tolerate models that ignore the wrapper and return a single resume object.
  const versions = (Array.isArray(parsed.versions) && parsed.versions.length
    ? parsed.versions
    : [parsed as ResumeDoc]
  ).slice(0, RESUME_VERSIONS);

  // Design skill: auto-select two distinct templates from market/role/photo signals.
  const pair = selectTemplatePair({
    market: analysis.market,
    seniority: analysis.seniority,
    title: analysis.title,
    includePhoto: versions.some((v) => v.includePhoto),
    hasPhotoFile: !!profile.photoPath,
  });

  // Versions continue the existing numbering for this job + kind.
  const prior = await prisma.generation.count({ where: { jobId, kind } });
  const generations = [];
  for (let i = 0; i < versions.length; i++) {
    generations.push(
      await prisma.generation.create({
        data: {
          ownerId,
          jobId,
          kind,
          language,
          format,
          template: pair[i] ?? pair[0],
          model,
          content: JSON.stringify(versions[i]),
          version: prior + i + 1,
        },
      })
    );
  }
  return { generations, contents: versions };
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (isNaN(v)) return 0;
  return Math.min(100, Math.max(0, Math.round(v)));
}

export type { FullProfile };
