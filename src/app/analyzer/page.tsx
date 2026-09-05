"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Textarea, Field, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";

export default function AnalyzerPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    setBusy(true); setError("");
    const res = await fetch("/api/analyze", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceUrl: url || undefined, rawText: text || undefined }),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setError(d.error || "Analysis failed."); return; }
    router.push(`/analyzer/${d.jobId}`);
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Job Analyzer</h1>
        <p className="text-sm text-muted">Paste a vacancy. We detect market, language, seniority, ATS needs and your match.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>New analysis</CardTitle>
          <CardDescription>Paste the job text for best accuracy. A URL is used as a fallback.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label="Job URL (optional)"><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></Field>
          <Field label="Job description"><Textarea className="min-h-56" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the full job posting here…" /></Field>
          {error ? <Badge variant="danger">{error}</Badge> : null}
          <Button onClick={analyze} disabled={busy || (!text && !url)} variant="accent" className="self-start">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />} Analyze vacancy
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
