"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Select, Field, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PAGE_FORMATS } from "@/lib/constants";
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
            {busy === "resume" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} Generate resume (no-photo + photo)
          </Button>
          <Button variant="outline" onClick={() => gen("cover_letter")} disabled={!!busy}>
            {busy === "cover_letter" ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Generate cover letter
          </Button>
        </div>
        {error ? <Badge variant="danger">{error}</Badge> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <GenList title="Resumes" items={resumes} onRefresh={() => router.refresh()} />
          <GenList title="Cover letters" items={covers} onRefresh={() => router.refresh()} />
        </div>
      </CardContent>
    </Card>
  );
}

function GenList({ title, items, onRefresh }: { title: string; items: Gen[]; onRefresh: () => void }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>
      {items.length === 0 ? (
        <p className="text-sm text-muted">None yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((g) => <GenRow key={g.id} g={g} onRefresh={onRefresh} />)}
        </ul>
      )}
    </div>
  );
}

function GenRow({ g, onRefresh }: { g: Gen; onRefresh: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const isResume = g.kind === "resume";
  // Each resume version is one fixed variation of the same content: v1 has no
  // photo (ATS-safe), v2 includes the photo. The PDF uses the version's own
  // stored template — no theme switcher, so there's no "which of 4?" confusion.
  const withPhoto = g.template === "photo";
  const href = `/api/pdf/${g.id}?template=${g.template ?? ""}`;

  async function deleteGen() {
    if (!confirm(`Delete ${g.kind === "resume" ? "Resume" : "Cover letter"} v${g.version}?`)) return;
    setDeleting(true);
    await fetch(`/api/generations/${g.id}`, { method: "DELETE" });
    setDeleting(false);
    onRefresh();
  }

  return (
    <li className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">v{g.version}</span>
        {isResume ? (
          <Badge variant={withPhoto ? "muted" : "success"}>{withPhoto ? "With photo" : "No photo"}</Badge>
        ) : null}
        <span className="text-xs text-muted">{g.format} · {new Date(g.createdAt).toLocaleDateString()}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button asChild size="sm" variant="ghost" title="Preview PDF">
          <a href={href} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /></a>
        </Button>
        <Button asChild size="sm" variant="ghost" title="Download PDF">
          <a href={href} download><Download className="size-4" /></a>
        </Button>
        <button
          type="button"
          onClick={deleteGen}
          disabled={deleting}
          title="Delete version"
          className="rounded p-1 text-muted transition-colors hover:text-danger disabled:opacity-50"
        >
          {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <span className="text-xs">✕</span>}
        </button>
      </div>
    </li>
  );
}
