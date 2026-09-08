import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateProfile } from "@/server/profile";
import { currentUserId, unauthorized } from "@/server/auth";

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const profile = await getOrCreateProfile(userId);
  return NextResponse.json(profile);
}

const strArray = z.array(z.string()).optional().default([]);

// Dates arrive as free text from the form. `new Date("salam")` is an Invalid
// Date, and Prisma rejects it while writing, which surfaced as a 500 instead of
// a field error. Catching it here keeps the answer a 400 the form can show.
const dateString = z
  .string()
  .refine((v) => v === "" || !Number.isNaN(new Date(v).getTime()), "Enter a valid date.")
  .nullish();

const schema = z.object({
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  middleName: z.string().nullish(),
  birthDate: dateString,
  city: z.string().nullish(),
  country: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  telegram: z.string().nullish(),
  linkedin: z.string().nullish(),
  github: z.string().nullish(),
  website: z.string().nullish(),
  portfolio: z.string().nullish(),
  workModes: z.array(z.string()).optional().default([]),
  relocation: z.boolean().optional().default(false),
  businessTrips: z.boolean().optional().default(false),
  languages: z.array(z.object({ name: z.string(), level: z.string() })).default([]),
  skills: z.array(z.object({ category: z.string(), name: z.string(), level: z.string().nullish() })).default([]),
  experiences: z
    .array(
      z.object({
        company: z.string(),
        companyUrl: z.string().nullish(),
        position: z.string(),
        startDate: dateString,
        endDate: dateString,
        current: z.boolean().optional().default(false),
        location: z.string().nullish(),
        employment: z.string().nullish(),
        responsibilities: strArray,
        achievements: strArray,
        metrics: strArray,
      })
    )
    .default([]),
  educations: z
    .array(
      z.object({
        institution: z.string(),
        institutionUrl: z.string().nullish(),
        degree: z.string().nullish(),
        field: z.string().nullish(),
        startYear: z.number().nullish(),
        endYear: z.number().nullish(),
      })
    )
    .default([]),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        organization: z.string().nullish(),
        url: z.string().nullish(),
        credentialId: z.string().nullish(),
        issueDate: dateString,
      })
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().nullish(),
        technologies: strArray,
        url: z.string().nullish(),
        results: strArray,
      })
    )
    .default([]),
});

const toDate = (v?: string | null) => (v ? new Date(v) : null);

export async function PUT(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) return unauthorized();
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const d = parsed.data;
  const profile = await getOrCreateProfile(userId);
  const id = profile.id;

  await prisma.$transaction([
    prisma.profile.update({
      where: { id },
      data: {
        firstName: d.firstName ?? null,
        lastName: d.lastName ?? null,
        middleName: d.middleName ?? null,
        birthDate: toDate(d.birthDate),
        city: d.city ?? null,
        country: d.country ?? null,
        email: d.email ?? null,
        phone: d.phone ?? null,
        telegram: d.telegram ?? null,
        linkedin: d.linkedin ?? null,
        github: d.github ?? null,
        website: d.website ?? null,
        portfolio: d.portfolio ?? null,
        workModes: JSON.stringify(d.workModes),
        relocation: d.relocation,
        businessTrips: d.businessTrips,
      },
    }),
    prisma.language.deleteMany({ where: { profileId: id } }),
    prisma.skill.deleteMany({ where: { profileId: id } }),
    prisma.experience.deleteMany({ where: { profileId: id } }),
    prisma.education.deleteMany({ where: { profileId: id } }),
    prisma.certification.deleteMany({ where: { profileId: id } }),
    prisma.project.deleteMany({ where: { profileId: id } }),
    prisma.language.createMany({
      data: d.languages.map((l, i) => ({ profileId: id, name: l.name, level: l.level, order: i })),
    }),
    prisma.skill.createMany({
      data: d.skills.map((sk, i) => ({ profileId: id, category: sk.category, name: sk.name, level: sk.level ?? null, order: i })),
    }),
    prisma.experience.createMany({
      data: d.experiences.map((e, i) => ({
        profileId: id,
        company: e.company,
        companyUrl: e.companyUrl ?? null,
        position: e.position,
        startDate: toDate(e.startDate),
        endDate: e.current ? null : toDate(e.endDate),
        current: e.current,
        location: e.location ?? null,
        employment: e.employment ?? null,
        responsibilities: JSON.stringify(e.responsibilities),
        achievements: JSON.stringify(e.achievements),
        metrics: JSON.stringify(e.metrics),
        order: i,
      })),
    }),
    prisma.education.createMany({
      data: d.educations.map((e, i) => ({
        profileId: id,
        institution: e.institution,
        institutionUrl: e.institutionUrl ?? null,
        degree: e.degree ?? null,
        field: e.field ?? null,
        startYear: e.startYear ?? null,
        endYear: e.endYear ?? null,
        order: i,
      })),
    }),
    prisma.certification.createMany({
      data: d.certifications.map((c, i) => ({
        profileId: id,
        name: c.name,
        organization: c.organization ?? null,
        url: c.url ?? null,
        credentialId: c.credentialId ?? null,
        issueDate: toDate(c.issueDate),
        order: i,
      })),
    }),
    prisma.project.createMany({
      data: d.projects.map((p, i) => ({
        profileId: id,
        name: p.name,
        description: p.description ?? null,
        technologies: JSON.stringify(p.technologies),
        url: p.url ?? null,
        results: JSON.stringify(p.results),
        order: i,
      })),
    }),
  ]);

  const updated = await getOrCreateProfile(userId);
  return NextResponse.json(updated);
}
