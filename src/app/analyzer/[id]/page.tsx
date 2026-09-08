import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/server/auth";
import { Card, CardContent, CardHeader, CardTitle, Badge, Progress } from "@/components/ui/primitives";
import { GenerationStudio } from "@/components/generation-studio";
import type { JobAnalysis } from "@/lib/types";
import { DeleteJobButton } from "@/components/delete-job-button";
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
  const q = a.qualityScore;
  const verdictVar = a.verdict === "Strong" ? "success" : a.verdict === "Weak" ? "danger" : "warning";
  const statusVar = (s: string) => (s === "met" ? "success" : s === "partial" ? "warning" : "danger");
  const qDims: Array<[string, number | undefined, number]> = q
    ? [
        ["Impact & evidence", q.impact, 25],
        ["Relevance & tailoring", q.relevance, 25],
        ["Clarity & structure", q.clarity, 15],
        ["Visual / ATS", q.ats, 15],
        ["Language quality", q.language, 10],
        ["Completeness", q.completeness, 10],
      ]
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <Link href="/analyzer" className="flex items-center gap-1 text-sm text-muted hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to Analyzer
        </Link>
        <DeleteJobButton jobId={job.id} jobTitle={job.title ?? undefined} />
      </div>

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
            <div className="flex items-center gap-3">
              <CardTitle>Match score</CardTitle>
              {a.verdict ? <Badge variant={verdictVar}>{a.verdict}</Badge> : null}
            </div>
            <span className="text-2xl font-semibold tabular-nums">{score}%</span>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Progress value={score} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <List title="Strong matches" items={a.strong} variant="success" />
            <List title="Weak matches" items={a.weak} variant="warning" />
            <List title="Gaps" items={a.gaps} variant="danger" />
          </div>
        </CardContent>
      </Card>

      {q ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Resume quality</CardTitle>
              <span className="text-2xl font-semibold tabular-nums">{q.total}/100</span>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {qDims.map(([label, val, weight]) => (
              <div key={label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{label}</span>
                  <span className="tabular-nums text-muted">{val ?? 0}/{weight}</span>
                </div>
                <Progress value={Math.round(((val ?? 0) / weight) * 100)} />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {a.requirementBreakdown?.length ? (
        <Card>
          <CardHeader><CardTitle>Requirement breakdown</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {a.requirementBreakdown.map((r, i) => (
              <div key={i} className="flex items-start justify-between gap-3 border-b border-border pb-2.5 last:border-0 last:pb-0">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{r.requirement}</span>
                  {r.evidence ? <span className="text-xs text-muted">{r.evidence}</span> : null}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge variant="muted" className="capitalize">{r.severity}</Badge>
                  <Badge variant={statusVar(r.status)} className="capitalize">{r.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {a.suggestions?.length ? (
        <Card>
          <CardHeader><CardTitle>How to raise your score</CardTitle></CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
              {a.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Requirements & ATS</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
