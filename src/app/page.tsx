import Link from "next/link";
import { prisma } from "@/lib/db";
import { OWNER_ID } from "@/lib/constants";
import { getOrCreateProfile, completeness } from "@/server/profile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Progress, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/utils";
import { FileText, Mail, Briefcase, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

function scoreVariant(n: number): "success" | "warning" | "danger" {
  return n >= 75 ? "success" : n >= 50 ? "warning" : "danger";
}

export default async function Dashboard() {
  const profile = await getOrCreateProfile();
  const pct = completeness(profile);

  const [resumeCount, coverCount, jobs] = await Promise.all([
    prisma.generation.count({ where: { ownerId: OWNER_ID, kind: "resume" } }),
    prisma.generation.count({ where: { ownerId: OWNER_ID, kind: "cover_letter" } }),
    prisma.job.findMany({
      where: { ownerId: OWNER_ID },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { generations: true },
    }),
  ]);

  const stats = [
    { label: "Resumes", value: resumeCount, icon: FileText },
    { label: "Cover Letters", value: coverCount, icon: Mail },
    { label: "Jobs Analyzed", value: jobs.length, icon: Briefcase },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted">Your career document workspace.</p>
        </div>
        <Button asChild variant="accent">
          <Link href="/analyzer">
            New generation <ArrowRight className="size-4" />
          </Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Profile completeness</CardTitle>
              <CardDescription>A richer profile yields stronger, ATS-aligned documents.</CardDescription>
            </div>
            <span className="text-2xl font-semibold tabular-nums">{pct}%</span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Progress value={pct} />
          <Link href="/profile" className="text-sm text-accent hover:underline">
            Edit profile →
          </Link>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 pt-5">
              <div className="flex size-10 items-center justify-center rounded-md bg-surface">
                <s.icon className="size-5 text-muted" />
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
                <div className="text-xs text-muted">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent jobs & generations</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              No jobs yet. <Link href="/analyzer" className="text-accent hover:underline">Analyze your first vacancy →</Link>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {jobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between py-3">
                  <div className="flex flex-col gap-0.5">
                    <Link href={`/analyzer/${j.id}`} className="text-sm font-medium hover:underline">
                      {j.title || "Untitled role"} {j.company ? `· ${j.company}` : ""}
                    </Link>
                    <span className="text-xs text-muted">
                      {j.market || "—"} · {j.seniority || "—"} · {fmtDate(j.createdAt)} · {j.generations.length} docs
                    </span>
                  </div>
                  {j.matchScore != null ? (
                    <Badge variant={scoreVariant(j.matchScore)}>{j.matchScore}% match</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
