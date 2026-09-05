import { buildMasterSystem } from "./master";

// Task-specific prompt builders. Each returns { system, prompt, schemaHint }.
// The profile/job are serialized to compact JSON and embedded.

export interface BuiltPrompt {
  system: string;
  prompt: string;
}

// 1) Candidate Intelligence Profile — deep analysis, computed once.
export function intelligencePrompt(profileJson: string): BuiltPrompt {
  return {
    system: buildMasterSystem(),
    prompt: `Analyze this candidate profile and produce a Candidate Intelligence Profile.

Return a JSON object with EXACTLY these keys:
{
  "careerPath": string,             // narrative of their trajectory
  "strengths": string[],
  "competencies": string[],         // key professional competencies
  "level": string,                  // professional level / archetype
  "industries": string[],
  "achievements": string[],         // most impressive, quantified where possible
  "uniqueValue": string[],          // unique selling points
  "directions": string[]            // realistic next career directions
}

Use ONLY facts present below. Do not invent.

CANDIDATE PROFILE (JSON):
${profileJson}`,
  };
}

// 2) Job analysis — market, language, seniority, ATS, match score.
export function jobAnalysisPrompt(jobText: string, intelligenceJson: string): BuiltPrompt {
  return {
    system: buildMasterSystem({ includeCountry: true }),
    prompt: `Analyze the job posting and compare it against the candidate's Intelligence Profile.

Return a JSON object with EXACTLY these keys:
{
  "title": string,
  "company": string,
  "market": string,          // country/market, e.g. "USA", "Germany", "UAE"
  "language": string,        // language of the posting, e.g. "English", "German"
  "seniority": string,       // one of: junior, middle, senior, lead, head, director, vp, c-level
  "atsRequirements": string[],
  "keywords": string[],      // hard skills/keywords an ATS would scan for
  "responsibilities": string[],
  "requirements": string[],
  "matchScore": number,      // 0-100 fit of candidate vs job
  "strong": string[],        // strong matches
  "weak": string[],          // weak / partial matches
  "gaps": string[]           // missing requirements
}

CANDIDATE INTELLIGENCE PROFILE (JSON):
${intelligenceJson}

JOB POSTING:
${jobText}`,
  };
}

// 3) Resume generation.
export function resumePrompt(
  profileJson: string,
  analysisJson: string,
  format: string,
  language: string
): BuiltPrompt {
  return {
    system: buildMasterSystem({ includeResumeRules: true, includeCountry: true }),
    prompt: `Generate an ATS-optimized resume tailored to this job. Page format: ${format}. Language: ${language}.

Apply the detected market's country rules (photo/DOB inclusion, page conventions). Set "includePhoto" accordingly.

Return a JSON object with EXACTLY these keys:
{
  "fullName": string,
  "headline": string,                 // target-role title
  "location": string,
  "contacts": [{ "label": string, "value": string }],
  "summary": string,                  // 2-3 sentences tailored to the role
  "skills": [{ "category": string, "items": string[] }],
  "experience": [{ "company": string, "position": string, "location": string, "dates": string, "bullets": string[] }],
  "education": [{ "institution": string, "degree": string, "field": string, "dates": string }],
  "certifications": [{ "name": string, "organization": string, "date": string, "credentialId": string }],
  "projects": [{ "name": string, "description": string, "technologies": string[], "url": string }],
  "languages": [{ "name": string, "level": string }],
  "includePhoto": boolean
}

Mirror job keywords the candidate genuinely has. Quantify achievements. Use ONLY profile facts.

LENGTH — fit ONE page (${format}). Be ruthless and selective:
- Summary: 2-3 tight sentences, no filler.
- Prioritize the most relevant and recent experience. Cap the top/most-relevant role at 4-5 bullets; older or less-relevant roles at 1-2 bullets, and compress or omit roles that add little for THIS job.
- Choose the strongest, most job-relevant bullets only — do not list everything.
- Keep at most the 3-4 most relevant projects, one short line each.
- Group skills tightly; drop skill lines irrelevant to this job.
- Prefer short, dense wording over long sentences. The whole document must comfortably fit on a single page.

CANDIDATE PROFILE (JSON):
${profileJson}

JOB ANALYSIS (JSON):
${analysisJson}`,
  };
}

// 4) Cover letter generation.
export function coverLetterPrompt(
  profileJson: string,
  analysisJson: string,
  language: string
): BuiltPrompt {
  return {
    system: buildMasterSystem({ includeCoverRules: true, includeCountry: true }),
    prompt: `Generate a tailored cover letter for this job. Language: ${language}. Match the target market's tone and culture.

Return a JSON object with EXACTLY these keys:
{
  "fullName": string,
  "contacts": [{ "label": string, "value": string }],
  "date": string,
  "recipient": string,          // company / hiring team
  "greeting": string,
  "paragraphs": string[],       // 3-4 paragraphs
  "closing": string,            // e.g. "Sincerely,"
  "signature": string
}

Use ONLY profile facts. Complement (do not repeat) the resume.

CANDIDATE PROFILE (JSON):
${profileJson}

JOB ANALYSIS (JSON):
${analysisJson}`,
  };
}
