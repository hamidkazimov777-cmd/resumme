"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import type { IntelligenceData } from "@/lib/types";

function List({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>
      <ul className="flex flex-wrap gap-1.5">
        {items.map((x, i) => <li key={i}><Badge variant="muted">{x}</Badge></li>)}
      </ul>
    </div>
  );
}

export function IntelligencePanel() {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [stale, setStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = () => fetch("/api/intelligence").then((r) => r.json()).then((d) => { setData(d.data); setStale(d.stale); });
  useEffect(() => { load(); }, []);

  async function run() {
    setBusy(true); setError("");
    const res = await fetch("/api/intelligence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ force: true }) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error || "Failed."); return; }
    setData(d.data); setStale(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><Sparkles className="size-4 text-accent" /> Candidate Intelligence Profile</CardTitle>
            <CardDescription>Deep AI analysis computed once and reused across all generations.</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={run} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {data ? "Re-analyze" : "Analyze"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? <Badge variant="danger">{error}</Badge> : null}
        {stale && data ? <Badge variant="warning">Profile changed since last analysis — re-analyze for best results.</Badge> : null}
        {!data ? (
          <p className="text-sm text-muted">Save your profile, then run analysis. Requires an active AI provider in Settings.</p>
        ) : (
          <>
            <div><h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Level</h4><p className="text-sm">{data.level}</p></div>
            <div><h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Career path</h4><p className="text-sm">{data.careerPath}</p></div>
            <List title="Strengths" items={data.strengths} />
            <List title="Competencies" items={data.competencies} />
            <List title="Industries" items={data.industries} />
            <List title="Key achievements" items={data.achievements} />
            <List title="Unique value" items={data.uniqueValue} />
            <List title="Career directions" items={data.directions} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
