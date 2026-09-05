import Link from "next/link";
import { prisma } from "@/lib/db";
import { OWNER_ID } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { fmtDate } from "@/lib/utils";
import { Download, FileText, Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const generations = await prisma.generation.findMany({
    where: { ownerId: OWNER_ID },
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
                    {g.kind === "resume" ? <FileText className="size-4 text-muted" /> : <Mail className="size-4 text-muted" />}
                    <div className="flex flex-col gap-0.5">
                      <Link href={`/analyzer/${g.jobId}`} className="text-sm font-medium hover:underline">
                        {g.kind === "resume" ? "Resume" : "Cover letter"} v{g.version} · {g.job.title || "Untitled"} {g.job.company ? `· ${g.job.company}` : ""}
                      </Link>
                      <span className="text-xs text-muted">{g.job.market || "—"} · {g.format} · {g.model || "—"} · {fmtDate(g.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {g.job.matchScore != null ? <Badge variant="muted">{g.job.matchScore}% match</Badge> : null}
                    <Button asChild size="sm" variant="ghost"><a href={`/api/pdf/${g.id}`} target="_blank" rel="noreferrer"><Download className="size-4" /></a></Button>
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
