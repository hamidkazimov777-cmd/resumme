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
import {
  serializeProfile,
  getOrCreateProfile,
  validateResumeAgainstProfile,
  profileContacts,
  profileFullName,
  type FullProfile,
} from "./profile";
import { enforceRateLimit } from "./ratelimit";
import type { TemplateId } from "@/lib/design/templates";
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
  const { text, model } = await run(ownerId, system, prompt, true, 8000);
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
  // Reasoning models spend part of the token budget on hidden reasoning, so give
  // the analysis (large structured output) generous headroom to avoid truncation.
  const { text } = await run(ownerId, system, prompt, true, 14000);
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

  // Reserve the restrained "executive" layout for genuine people-leadership;
  // everyone else gets the polished "modern" look (shared with the resume).
  const seniorRole = /(director|chief|c-level|\bvp\b|vice president|head of)/i.test(
    `${analysis.seniority ?? ""} ${analysis.title ?? ""}`
  );

  // --- Cover letter: single tailored document. ---
  if (kind === "cover_letter") {
    const built = coverLetterPrompt(profileJson, analysisJson, language);
    const { text, model } = await run(ownerId, built.system, built.prompt, true, 4000);
    const content = parseJson<CoverLetterDoc>(text);
    // Identity, contacts and date are DATA — set them deterministically. The
    // model kept inventing a wrong date (e.g. "24 October 2023") and reshaping
    // contacts; pin them to the profile and today.
    const fullName = profileFullName(profile);
    if (fullName) {
      content.fullName = fullName;
      content.signature = fullName;
    }
    content.contacts = profileContacts(profile);
    content.date = formatLetterDate(language);
    const template: TemplateId = seniorRole ? "executive" : "modern";
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

  // --- Resume: ONE best-possible tailored resume, rendered as EXACTLY two
  // versions of the SAME content — v1 photo-free (maximally ATS-safe), v2 with
  // a photo — so both are equally strong and differ only by presentation.
  // A photo doesn't change the text, so the content is generated once. ---
  const built = resumePrompt(profileJson, analysisJson, format, language, 1);
  // Generous headroom: reasoning models consume budget before emitting JSON.
  const { text, model } = await run(ownerId, built.system, built.prompt, true, 16000);
  const parsed = parseJson<{ versions?: ResumeDoc[] } & ResumeDoc>(text);
  // Tolerate a model that wraps the single resume in { versions: [...] }.
  const base = Array.isArray(parsed.versions) && parsed.versions.length
    ? parsed.versions[0]
    : (parsed as ResumeDoc);

  // Anti-fabrication guard: strip any hallucinated employers/institutions
  // before they reach the stored document / PDF.
  const { resume: clean, removed } = validateResumeAgainstProfile(base, profile);
  if (removed.length) console.warn(`[resumee] dropped fabricated entries for job ${jobId}:`, removed);

  const hasPhoto = !!profile.photoPath;

  // v1 — no photo: the polished single-column "modern" layout by default (chips,
  // accent headers — attractive AND fully ATS-safe); senior/leadership roles get
  // the understated "executive" layout. Both are single-column, real-text, so a
  // bot parses them cleanly. (The classic serif "ats" theme stays available as a
  // manual choice for conservative fields.)
  const noPhotoTpl: TemplateId = seniorRole ? "executive" : "modern";
  // v2 — with photo: the photo layout when a photo exists; otherwise a distinct
  // strong layout so the user still gets two useful, different versions.
  const photoTpl: TemplateId = hasPhoto
    ? "photo"
    : noPhotoTpl === "executive"
      ? "modern"
      : "executive";

  // Only the layout and the photo flag differ between the two versions.
  const variants: Array<{ template: TemplateId; content: ResumeDoc }> = [
    { template: noPhotoTpl, content: { ...clean, includePhoto: false } },
    { template: photoTpl, content: { ...clean, includePhoto: hasPhoto } },
  ];

  // Replace prior resume versions for this job so there are always EXACTLY two,
  // numbered 1 (no photo) and 2 (photo). Regenerating refreshes both.
  await prisma.generation.deleteMany({ where: { jobId, ownerId, kind: "resume" } });
  const generations = [];
  for (let i = 0; i < variants.length; i++) {
    generations.push(
      await prisma.generation.create({
        data: {
          ownerId,
          jobId,
          kind,
          language,
          format,
          template: variants[i].template,
          model,
          content: JSON.stringify(variants[i].content),
          version: i + 1,
        },
      })
    );
  }
  return { generations, contents: variants.map((v) => v.content) };
}

// Today's date formatted for a letter, localized to the vacancy's language
// where we can map it. Deterministic — never left to the model.
function formatLetterDate(language?: string): string {
  const localeMap: Record<string, string> = {
    english: "en-GB",
    german: "de-DE",
    french: "fr-FR",
    spanish: "es-ES",
    italian: "it-IT",
    russian: "ru-RU",
    portuguese: "pt-PT",
    dutch: "nl-NL",
  };
  const locale = localeMap[(language ?? "").trim().toLowerCase()] ?? "en-GB";
  try {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (isNaN(v)) return 0;
  return Math.min(100, Math.max(0, Math.round(v)));
}

export type { FullProfile };
