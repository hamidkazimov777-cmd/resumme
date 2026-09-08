import { prisma } from "@/lib/db";
import { parseArray } from "@/lib/utils";
import type { Prisma } from "@prisma/client";
import type { ResumeDoc } from "@/lib/types";

const include = {
  languages: { orderBy: { order: "asc" } },
  skills: { orderBy: { order: "asc" } },
  experiences: { orderBy: { order: "asc" } },
  educations: { orderBy: { order: "asc" } },
  certifications: { orderBy: { order: "asc" } },
  projects: { orderBy: { order: "asc" } },
  intelligence: true,
} satisfies Prisma.ProfileInclude;

export type FullProfile = Prisma.ProfileGetPayload<{ include: typeof include }>;

/** Get the user's profile, creating an empty one if absent.
 * Catches the unique-ownerId race so concurrent first-hits don't fail. */
export async function getOrCreateProfile(ownerId: string): Promise<FullProfile> {
  const existing = await prisma.profile.findUnique({ where: { ownerId }, include });
  if (existing) return existing;
  try {
    await prisma.profile.create({ data: { ownerId } });
  } catch (e) {
    // A concurrent request created it first (unique ownerId) — safe to ignore.
    if (!(e && typeof e === "object" && (e as { code?: string }).code === "P2002")) throw e;
  }
  return prisma.profile.findUniqueOrThrow({ where: { ownerId }, include });
}

/** Compact, AI-friendly serialization of a profile (drops empty fields). */
export function serializeProfile(p: FullProfile): string {
  const clean = (obj: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0))
    );

  const data = {
    personal: clean({
      firstName: p.firstName,
      lastName: p.lastName,
      middleName: p.middleName,
      birthDate: p.birthDate?.toISOString().slice(0, 10),
      city: p.city,
      country: p.country,
    }),
    contacts: clean({
      email: p.email,
      phone: p.phone,
      telegram: p.telegram,
      linkedin: p.linkedin,
      github: p.github,
      website: p.website,
      portfolio: p.portfolio,
    }),
    preferences: clean({
      workModes: parseArray(p.workModes),
      relocation: p.relocation,
      businessTrips: p.businessTrips,
    }),
    languages: p.languages.map((l) => ({ name: l.name, level: l.level })),
    skills: p.skills.map((s) => clean({ category: s.category, name: s.name, level: s.level })),
    experience: p.experiences.map((e) =>
      clean({
        company: e.company,
        companyUrl: e.companyUrl,
        position: e.position,
        start: e.startDate?.toISOString().slice(0, 7),
        end: e.current ? "Present" : e.endDate?.toISOString().slice(0, 7),
        location: e.location,
        employment: e.employment,
        responsibilities: parseArray(e.responsibilities),
        achievements: parseArray(e.achievements),
        metrics: parseArray(e.metrics),
      })
    ),
    education: p.educations.map((e) =>
      clean({ institution: e.institution, degree: e.degree, field: e.field, startYear: e.startYear, endYear: e.endYear })
    ),
    certifications: p.certifications.map((c) =>
      clean({ name: c.name, organization: c.organization, url: c.url, credentialId: c.credentialId, issueDate: c.issueDate?.toISOString().slice(0, 10) })
    ),
    projects: p.projects.map((pr) =>
      clean({ name: pr.name, description: pr.description, technologies: parseArray(pr.technologies), url: pr.url, results: parseArray(pr.results) })
    ),
  };
  return JSON.stringify(data);
}

// ---------------------------------------------------------------------------
// Anti-fabrication guard.
//
// The prompts forbid inventing facts, but we enforce it in code too: a
// generated resume may only reference employers and institutions that exist in
// the source profile. This catches hallucinated work history / degrees before
// they ever reach a PDF. It only filters when the profile HAS structured
// entries of that type, so sparse/free-form profiles are left untouched.
// ---------------------------------------------------------------------------

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(gmbh|inc|llc|ltd|co|corp|company|group|university|of|the|labs?|systems?)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/** True if `name` plausibly refers to one of the known organizations. */
function known(name: string, knownNames: string[]): boolean {
  const n = norm(name);
  if (n.length < 3) return true; // too short to judge — don't drop
  return knownNames.some((k) => {
    const kn = norm(k);
    if (kn.length < 3) return false;
    return n === kn || n.includes(kn) || kn.includes(n);
  });
}

export interface ResumeValidation {
  resume: ResumeDoc;
  removed: string[]; // human-readable descriptions of dropped entries
}

/** The candidate's contacts, verbatim from the profile, in a sensible order and
 * with labels the PDF ContactBar understands. Contacts are pure data — the AI
 * must never reword or mistype them, so both resume and cover letter use this.
 * Telegram is intentionally omitted (not a standard resume contact). */
export function profileContacts(profile: FullProfile): { label: string; value: string }[] {
  const contacts: { label: string; value: string }[] = [];
  const push = (label: string, value?: string | null) => {
    if (value && value.trim()) contacts.push({ label, value: value.trim() });
  };
  push("Email", profile.email);
  push("Phone", profile.phone);
  push("LinkedIn", profile.linkedin);
  push("GitHub", profile.github);
  push("Portfolio", profile.portfolio);
  push("Website", profile.website);
  return contacts;
}

/** Full name from the profile, or empty string if not set. */
export function profileFullName(profile: FullProfile): string {
  return [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
}

/** Strip any experience/education entry whose organization is not in the
 * profile. Returns the sanitized resume plus a list of what was removed. */
export function validateResumeAgainstProfile(resume: ResumeDoc, profile: FullProfile): ResumeValidation {
  const removed: string[] = [];
  const out: ResumeDoc = { ...resume };

  // Identity & contacts are pure DATA — the model must never reword or mistype
  // them (e.g. a mangled phone "+4994…"). Rebuild them verbatim from the
  // profile, keeping the model's tailored headline/location/summary.
  const fullName = profileFullName(profile);
  if (fullName) out.fullName = fullName;
  const contacts = profileContacts(profile);
  if (contacts.length) out.contacts = contacts;

  const knownCompanies = profile.experiences.map((e) => e.company).filter(Boolean) as string[];
  if (knownCompanies.length && Array.isArray(resume.experience)) {
    out.experience = resume.experience.filter((x) => {
      if (x.company && known(x.company, knownCompanies)) return true;
      removed.push(`experience: ${x.position ?? "role"} @ ${x.company ?? "unknown"}`);
      return false;
    });
  }

  const knownSchools = profile.educations.map((e) => e.institution).filter(Boolean) as string[];
  if (knownSchools.length && Array.isArray(resume.education)) {
    out.education = resume.education.filter((x) => {
      if (x.institution && known(x.institution, knownSchools)) return true;
      removed.push(`education: ${x.institution ?? "unknown"}`);
      return false;
    });
  }

  return { resume: out, removed };
}

// Weighted completeness score for the dashboard.
export function completeness(p: FullProfile): number {
  const checks: Array<[boolean, number]> = [
    [!!(p.firstName && p.lastName), 15],
    [!!p.email, 10],
    [!!(p.city && p.country), 5],
    [!!(p.phone || p.linkedin), 5],
    [p.languages.length > 0, 10],
    [p.skills.length >= 3, 15],
    [p.experiences.length > 0, 25],
    [p.educations.length > 0, 10],
    [p.projects.length > 0 || p.certifications.length > 0, 5],
  ];
  const total = checks.reduce((sum, [ok, w]) => sum + (ok ? w : 0), 0);
  return Math.min(100, total);
}
