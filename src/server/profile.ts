import { prisma } from "@/lib/db";
import { parseArray } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

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
