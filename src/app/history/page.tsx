import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/server/auth";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/utils";
import { DeleteGenerationButton } from "@/components/delete-generation-button";
import { Download, FileText, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const generations = await prisma.generation.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { job: true },
  });

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-sm text-muted">Every generated document, versioned and downloadable.</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Operations</CardTitle></CardHeader>
        <CardContent>
          {generations.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              Nothing yet. <Link href="/analyzer" className="text-accent hover:underline">Analyze a vacancy →</Link>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {generations.map((g) => (
                <li key={g.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {g.kind === "resume" ? <FileText className="size-4 text-muted shrink-0" /> : <Mail className="size-4 text-muted shrink-0" />}
                    <div className="flex flex-col gap-0.5">
                      <Link href={`/analyzer/${g.jobId}`} className="text-sm font-medium hover:underline">
                        {g.kind === "resume" ? "Resume" : "Cover letter"} v{g.version} · {g.job.title || "Untitled"} {g.job.company ? `· ${g.job.company}` : ""}
                      </Link>
                      <span className="text-xs text-muted">
                        {g.template ? `Theme: ${g.template} · ` : ""}{g.job.market || "—"} · {g.format} · {g.model || "—"} · {fmtDate(g.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {g.job.matchScore != null ? <Badge variant="muted">{g.job.matchScore}% match</Badge> : null}
                    <Button asChild size="sm" variant="ghost" title="Download PDF">
                      <a href={`/api/pdf/${g.id}`} target="_blank" rel="noreferrer"><Download className="size-4" /></a>
                    </Button>
                    <DeleteGenerationButton id={g.id} label={`${g.kind === "resume" ? "Resume" : "Cover letter"} v${g.version}`} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
