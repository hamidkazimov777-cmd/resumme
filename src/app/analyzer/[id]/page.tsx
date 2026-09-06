import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/server/auth";
import { Card, CardContent, CardHeader, CardTitle, Badge, Progress } from "@/components/ui/primitives";
import { GenerationStudio } from "@/components/generation-studio";
import type { JobAnalysis } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

function List({ title, items, variant }: { title: string; items?: string[]; variant?: "success" | "warning" | "danger" | "muted" }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>
      <ul className="flex flex-wrap gap-1.5">{items.map((x, i) => <li key={i}><Badge variant={variant ?? "muted"}>{x}</Badge></li>)}</ul>
    </div>
  );
}

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { id } = await params;
  const job = await prisma.job.findFirst({ where: { id, ownerId: user.id }, include: { generations: { orderBy: { createdAt: "desc" } } } });
  if (!job) notFound();

  const a: JobAnalysis = job.analysis ? JSON.parse(job.analysis) : ({} as JobAnalysis);
  const score = job.matchScore ?? 0;
  const scoreVar = score >= 75 ? "success" : score >= 50 ? "warning" : "danger";

  return (
    <div className="flex flex-col gap-8">
      <Link href="/analyzer" className="flex items-center gap-1 text-sm text-muted hover:text-foreground"><ArrowLeft className="size-4" /> Back</Link>

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{job.title || "Untitled role"}</h1>
          <p className="text-sm text-muted">{[job.company, job.market, a.language].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex items-center gap-2">
          {job.seniority ? <Badge variant="muted" className="capitalize">{job.seniority}</Badge> : null}
        </div>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Match score</CardTitle>
            <span className="text-2xl font-semibold tabular-nums">{score}%</span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Progress value={score} />
          <div className="grid grid-cols-3 gap-6">
            <List title="Strong matches" items={a.strong} variant="success" />
            <List title="Weak matches" items={a.weak} variant="warning" />
            <List title="Gaps" items={a.gaps} variant="danger" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Requirements & ATS</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <List title="ATS keywords" items={a.keywords} />
          <List title="ATS requirements" items={a.atsRequirements} />
          <List title="Requirements" items={a.requirements} />
          <List title="Responsibilities" items={a.responsibilities} />
        </CardContent>
      </Card>

      <GenerationStudio
        jobId={job.id}
        generations={job.generations.map((g) => ({ id: g.id, kind: g.kind, version: g.version, format: g.format, template: g.template, createdAt: g.createdAt.toISOString() }))}
      />
    </div>
  );
}
