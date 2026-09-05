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
}

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
  matchScore: number; // 0-100
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
