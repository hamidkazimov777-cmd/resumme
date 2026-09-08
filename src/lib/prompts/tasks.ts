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

// 3) Resume generation — one or more distinct versions in a single call.
export function resumePrompt(
  profileJson: string,
  analysisJson: string,
  format: string,
  language: string,
  versions = 1
): BuiltPrompt {
  const oneVersion = `{
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
}`;

  const outputSpec =
    versions > 1
      ? `Return a JSON object with EXACTLY one key:
{
  "versions": [ ${oneVersion} ]       // EXACTLY ${versions} resume objects
}

The ${versions} versions must be genuinely different takes on the SAME facts:
- Version 1: achievement-first — lead every bullet with the strongest quantified outcome; summary emphasizes impact and scope.
- Version 2: expertise-first — reorder skills/experience emphasis toward the job's core requirements; different summary angle, different bullet selection and phrasing.
- Never copy a sentence verbatim between versions. Same facts, different writing.`
      : `Return a JSON object with EXACTLY these keys:
${oneVersion}`;

  return {
    system: buildMasterSystem({ includeResumeRules: true, includeCountry: true }),
    prompt: `Generate ${versions > 1 ? `${versions} distinct versions of ` : "an "}ATS-optimized resume${versions > 1 ? "s" : ""} tailored to this job. Page format: ${format}. Language: ${language}.

Apply the detected market's country rules (photo/DOB inclusion, page conventions). Set "includePhoto" accordingly.

${outputSpec}

Mirror job keywords the candidate genuinely has. Quantify achievements. Use ONLY profile facts.

CRITICAL LENGTH CONSTRAINT — EACH version must fit onto EXACTLY ONE single page (${format}):
- Summary: 2 tight, high-impact sentences MAX (~35-40 words total). No buzzwords or fluff.
- Experience roles: Include only the 2-3 most relevant positions.
- Experience bullets: Total bullets across ALL positions combined must be 5 to 6 bullets MAXIMUM (e.g. 3 for the top role, 2 for the second, 1 for the third). Never generate more than 6 bullets total across the entire document.
- Bullet brevity: Each bullet MUST be a single punchy line (10-14 words max). Lead with an active verb and a metric. Never write multi-sentence bullets or narrative paragraphs.
- Projects: Include at most 2-3 most relevant projects. Project descriptions must be strictly 1 concise line (under 14 words).
- Skills: Group tightly into 3-4 categories max.
- Education: Max 2 entries.
- Certifications: Max 2 entries.
- Avoid unnecessary length. Every word must count. The entire document must comfortably fit on 1 page without overflowing.

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
