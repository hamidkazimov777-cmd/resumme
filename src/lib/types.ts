// Structured shapes exchanged between AI, DB (as JSON), UI and the PDF engine.

export interface IntelligenceData {
  careerPath: string;
  strengths: string[];
  competencies: string[];
  level: string; // e.g. "Senior Backend Engineer"
  industries: string[];
  achievements: string[];
  uniqueValue: string[];
  directions: string[]; // suggested career directions
  jobSearchQueries?: string[]; // ready-to-paste search terms/titles for job boards
}

// Resume Quality Score — the six weighted dimensions from KB §4.1.
// Each sub-score is that dimension's earned points (out of its own weight);
// `total` is their sum on a 0-100 scale.
export interface QualityScore {
  impact: number; // achievement/quantified bullets (weight 25)
  relevance: number; // tailoring to the target role (weight 25)
  clarity: number; // structure, reverse-chron, order (weight 15)
  ats: number; // clean, parseable layout, length (weight 15)
  language: number; // active verbs, concise, error-free (weight 10)
  completeness: number; // no gaps, nothing irrelevant (weight 10)
  total: number; // 0-100
}

// One requirement decomposed from the vacancy, scored against the candidate.
export interface RequirementMatch {
  requirement: string;
  status: "met" | "partial" | "missing";
  severity: "high" | "medium" | "low"; // how important this requirement is
  evidence?: string; // where the candidate demonstrates it (or why not)
}

export type Verdict = "Strong" | "Good with tailoring" | "Weak";

export interface JobAnalysis {
  title?: string;
  company?: string;
  market?: string;
  language?: string; // language of the vacancy
  seniority?: string;
  atsRequirements: string[];
  keywords: string[];
  responsibilities: string[];
  requirements: string[];
  matchScore: number; // 0-100 — the vacancy-match score (KB §4.2)
  verdict?: Verdict; // overall verdict from KB §4.2
  qualityScore?: QualityScore; // resume quality score (KB §4.1)
  requirementBreakdown?: RequirementMatch[]; // per-requirement met/partial/missing
  suggestions?: string[]; // specific rewrite suggestions to raise the score
  strong: string[]; // strong matches
  weak: string[]; // weak matches
  gaps: string[]; // missing
}

// ATS resume document — deliberately flat and linear for machine parsing.
export interface ResumeDoc {
  fullName: string;
  headline: string; // target-role title line
  location?: string;
  contacts: { label: string; value: string }[];
  summary: string;
  skills: { category: string; items: string[] }[];
  experience: {
    company: string;
    position: string;
    location?: string;
    dates: string;
    bullets: string[];
  }[];
  education: { institution: string; degree?: string; field?: string; dates?: string }[];
  certifications: { name: string; organization?: string; date?: string; credentialId?: string }[];
  projects: { name: string; description?: string; technologies?: string[]; url?: string }[];
  languages: { name: string; level: string }[];
  // Whether a photo should be included for this market (country rules).
  includePhoto: boolean;
}

export interface CoverLetterDoc {
  fullName: string;
  contacts: { label: string; value: string }[];
  date?: string;
  recipient?: string; // company / hiring team
  greeting: string;
  paragraphs: string[];
  closing: string;
  signature: string;
}
