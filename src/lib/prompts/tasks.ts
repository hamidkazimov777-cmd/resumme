import { buildMasterSystem } from "./master";
import { fewShotResumeBlock } from "./knowledge/examples";

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
  "directions": string[],           // realistic next career directions
  "jobSearchQueries": string[]      // 8-12 ready-to-paste job-search queries
}

For "jobSearchQueries": terms the candidate can paste directly into LinkedIn / job boards to find matching roles, derived from their REAL skills and level. Mix (a) exact job titles to target (e.g. "AI Product Engineer", "Founding Engineer") and (b) a few boolean search strings (e.g. '"Founding Engineer" AND (AI OR LLM)'). Best fit first. Never reference skills the candidate lacks.

Use ONLY facts present below. Do not invent.

CANDIDATE PROFILE (JSON):
${profileJson}`,
  };
}

// 2) Job analysis — market, language, seniority, ATS, match score.
export function jobAnalysisPrompt(jobText: string, intelligenceJson: string): BuiltPrompt {
  return {
    system: buildMasterSystem({ includeCountry: true }),
    prompt: `Analyze the job posting and score the candidate against it, applying the two scoring rubrics in §4 of the knowledge base EXACTLY (§4.1 Resume Quality Score with its six weighted dimensions, and §4.2 Vacancy-Match Score).

Steps:
1. Decompose the vacancy into required skills, preferred skills, responsibilities, seniority, and domain.
2. For each REQUIRED and important preferred requirement, decide whether the candidate's profile evidences it: "met" (clearly demonstrated, ideally with a quantified achievement), "partial" (implied or listed but not evidenced), or "missing". Assign a severity reflecting how central that requirement is to the role.
3. Weight hard requirements highest. "matchScore" is the overall vacancy-match % (§4.2). "qualityScore" rates the candidate's material AS a resume for this role (§4.1); each sub-score is out of that dimension's weight, and "total" is their sum (0-100).
4. "verdict" is one of exactly: "Strong", "Good with tailoring", "Weak".
5. "suggestions" are specific, actionable rewrite instructions to raise the score (e.g. "Add a bullet demonstrating stakeholder management", "Move Python into the top skills band", "Mirror the phrase 'CI/CD pipelines' from the ad"). Suggest only truthful reframing — never invention.

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
  "matchScore": number,      // 0-100 vacancy-match score (§4.2)
  "verdict": string,         // "Strong" | "Good with tailoring" | "Weak"
  "qualityScore": {          // §4.1, each sub-score out of its weight
    "impact": number,        // /25  achievement-based & quantified bullets
    "relevance": number,     // /25  tailoring to the target role's keywords
    "clarity": number,       // /15  standard sections, reverse-chron, order
    "ats": number,           // /15  clean, parseable, right length, consistent
    "language": number,      // /10  active verbs, concise, zero errors
    "completeness": number,  // /10  no gaps, nothing irrelevant
    "total": number          // 0-100 sum of the above
  },
  "requirementBreakdown": [  // one entry per decomposed requirement
    { "requirement": string, "status": "met"|"partial"|"missing", "severity": "high"|"medium"|"low", "evidence": string }
  ],
  "suggestions": string[],   // specific rewrite suggestions to raise the score
  "strong": string[],        // strong matches (short labels)
  "weak": string[],          // weak / partial matches (short labels)
  "gaps": string[]           // missing requirements (short labels)
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

Apply everything in the knowledge base: lead every experience bullet with a strong action verb + a quantified result (CAR/STAR), tailor the summary to name the target role, mirror the vacancy's exact keywords where the candidate genuinely has them, and surface the most relevant experience and skills first. Match the density, metric-loading, bullet length and tone of the gold-standard examples below.

Apply the detected market's country rules (photo/DOB inclusion, page conventions). Set "includePhoto" accordingly.

${fewShotResumeBlock()}

${outputSpec}

Mirror job keywords the candidate genuinely has. Quantify achievements. Use ONLY profile facts — never invent employers, titles, dates, degrees, or metrics.

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

Before writing, read the JOB ANALYSIS below for the company, its market/domain and the responsibilities — the letter MUST engage that specific mission/problem, not generic praise.

Hard requirements for this letter:
- Do NOT open with "I am writing to apply", "I am excited to…", or any templated variant. Open with a hook tied to THIS company's mission/product/problem.
- Show you understand what this company actually does (its domain/industry from the posting). A letter that could go to any company in the field is wrong.
- Lead with the reader: don't start most sentences with "I"; balance "you/your" with your evidence.
- 2–3 concrete, quantified proof points from real experience, each mapped to a posting requirement. Outcomes over jargon/acronyms.
- Close with a confident, specific call to action — no "thank you for your time" filler as the whole close.
- WORK AUTHORIZATION: if the candidate's profile shows they are open to relocation and this role is onsite in a country different from the candidate's home country, include ONE short, honest, positive sentence near the close stating they are ready to relocate and will need visa sponsorship. Do not raise visa/sponsorship for remote roles or roles in the candidate's own country.
- The "paragraphs" array must contain the BODY only (opening hook → proof → close). Do not put the greeting or signature inside it.

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
