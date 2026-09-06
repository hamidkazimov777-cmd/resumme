"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Select, Field, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PAGE_FORMATS } from "@/lib/constants";
import { TEMPLATE_LIST, getTheme } from "@/lib/design/templates";
import { Loader2, FileText, Mail, Download, ExternalLink } from "lucide-react";

type Gen = { id: string; kind: string; version: number; format: string; template?: string | null; createdAt: string };

export function GenerationStudio({ jobId, generations }: { jobId: string; generations: Gen[] }) {
  const router = useRouter();
  const [format, setFormat] = useState<"A4" | "Letter">("A4");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function gen(kind: "resume" | "cover_letter") {
    setBusy(kind); setError("");
    const res = await fetch("/api/generate", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ jobId, kind, format }),
    });
    const d = await res.json();
    setBusy("");
    if (!res.ok) { setError(d.error || "Generation failed."); return; }
    router.refresh();
  }

  const resumes = generations.filter((g) => g.kind === "resume");
  const covers = generations.filter((g) => g.kind === "cover_letter");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate documents</CardTitle>
        <CardDescription>Tailored to this vacancy using your Intelligence Profile and the hidden master prompt system.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-end gap-3">
          <div className="w-40">
            <Field label="Page format">
              <Select value={format} onChange={(e) => setFormat(e.target.value as "A4" | "Letter")}>
                {PAGE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </Select>
            </Field>
          </div>
          <Button variant="accent" onClick={() => gen("resume")} disabled={!!busy}>
            {busy === "resume" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} Generate resume
          </Button>
          <Button variant="outline" onClick={() => gen("cover_letter")} disabled={!!busy}>
            {busy === "cover_letter" ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Generate cover letter
          </Button>
        </div>
        {error ? <Badge variant="danger">{error}</Badge> : null}

        <div className="grid grid-cols-2 gap-6">
          <GenList title="Resumes" items={resumes} />
          <GenList title="Cover letters" items={covers} />
        </div>
      </CardContent>
    </Card>
  );
}

function GenList({ title, items }: { title: string; items: Gen[] }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>
      {items.length === 0 ? (
        <p className="text-sm text-muted">None yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((g) => <GenRow key={g.id} g={g} />)}
        </ul>
      )}
    </div>
  );
}

function GenRow({ g }: { g: Gen }) {
  // Template switching is pure layout — re-renders the same content, no AI call.
  const auto = getTheme(g.template).id;
  const [tpl, setTpl] = useState(auto);
  const isResume = g.kind === "resume";
  const href = `/api/pdf/${g.id}?template=${tpl}`;

  return (
    <li className="flex flex-col gap-2 rounded-md border border-border bg-surface px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm">v{g.version} · {g.format} · {new Date(g.createdAt).toLocaleDateString()}</span>
        <div className="flex gap-1">
          <Button asChild size="sm" variant="ghost"><a href={href} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /></a></Button>
          <Button asChild size="sm" variant="ghost"><a href={href} download><Download className="size-4" /></a></Button>
        </div>
      </div>
      {isResume ? (
        <div className="flex flex-wrap items-center gap-1">
          {TEMPLATE_LIST.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.description}
              onClick={() => setTpl(t.id)}
              className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${tpl === t.id ? "border-accent bg-accent text-white" : "border-border text-muted hover:text-foreground"}`}
            >
              {t.label}{t.id === auto ? " · auto" : ""}
            </button>
          ))}
        </div>
      ) : null}
    </li>
  );
}
