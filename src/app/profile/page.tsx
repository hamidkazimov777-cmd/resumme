"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Textarea, Select, Field, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Repeatable, linesToArray, arrayToLines, csvToArray } from "@/components/repeatable";
import { SKILL_CATEGORIES, WORK_MODES } from "@/lib/constants";
import { parseArray } from "@/lib/utils";
import { PhotoUploader } from "@/components/photo-uploader";
import { IntelligencePanel } from "@/components/intelligence-panel";
import { Loader2, Save, Check } from "lucide-react";

type Lang = { name: string; level: string };
type Sk = { category: string; name: string; level: string };
type Exp = {
  company: string; companyUrl: string; position: string; startDate: string; endDate: string;
  current: boolean; location: string; employment: string;
  responsibilities: string[]; achievements: string[]; metrics: string[];
};
type Edu = { institution: string; institutionUrl: string; degree: string; field: string; startYear: string; endYear: string };
type Cert = { name: string; organization: string; url: string; credentialId: string; issueDate: string };
type Proj = { name: string; description: string; technologies: string[]; url: string; results: string[] };

type Form = {
  firstName: string; lastName: string; middleName: string; birthDate: string; city: string; country: string;
  email: string; phone: string; telegram: string; linkedin: string; github: string; website: string; portfolio: string;
  workModes: string[]; relocation: boolean; businessTrips: boolean;
  languages: Lang[]; skills: Sk[]; experiences: Exp[]; educations: Edu[]; certifications: Cert[]; projects: Proj[];
};

const S = (v: unknown) => (v == null ? "" : String(v));
const month = (v: unknown) => (v ? String(v).slice(0, 7) : "");

export default function ProfilePage() {
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [photoPath, setPhotoPath] = useState<string | null>(null);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    fetch("/api/profile").then((r) => {
      if (r.status === 401) {
        window.location.href = "/login";
        return null;
      }
      return r.json();
    }).then((p) => {
      if (!p) return;
      setPhotoPath(p.photoPath ?? null);
      setForm({
        firstName: S(p.firstName), lastName: S(p.lastName), middleName: S(p.middleName),
        birthDate: p.birthDate ? String(p.birthDate).slice(0, 10) : "",
        city: S(p.city), country: S(p.country),
        email: S(p.email), phone: S(p.phone), telegram: S(p.telegram), linkedin: S(p.linkedin),
        github: S(p.github), website: S(p.website), portfolio: S(p.portfolio),
        workModes: parseArray(p.workModes), relocation: !!p.relocation, businessTrips: !!p.businessTrips,
        languages: (p.languages ?? []).map((l: Lang) => ({ name: S(l.name), level: S(l.level) })),
        skills: (p.skills ?? []).map((s: Sk) => ({ category: S(s.category) || "technical", name: S(s.name), level: S(s.level) })),
        experiences: (p.experiences ?? []).map((e: Record<string, unknown>) => ({
          company: S(e.company), companyUrl: S(e.companyUrl), position: S(e.position),
          startDate: month(e.startDate), endDate: month(e.endDate), current: !!e.current,
          location: S(e.location), employment: S(e.employment),
          responsibilities: parseArray(e.responsibilities as string), achievements: parseArray(e.achievements as string), metrics: parseArray(e.metrics as string),
        })),
        educations: (p.educations ?? []).map((e: Record<string, unknown>) => ({
          institution: S(e.institution), institutionUrl: S(e.institutionUrl), degree: S(e.degree),
          field: S(e.field), startYear: S(e.startYear), endYear: S(e.endYear),
        })),
        certifications: (p.certifications ?? []).map((c: Record<string, unknown>) => ({
          name: S(c.name), organization: S(c.organization), url: S(c.url), credentialId: S(c.credentialId),
          issueDate: c.issueDate ? String(c.issueDate).slice(0, 10) : "",
        })),
        projects: (p.projects ?? []).map((pr: Record<string, unknown>) => ({
          name: S(pr.name), description: S(pr.description), technologies: parseArray(pr.technologies as string),
          url: S(pr.url), results: parseArray(pr.results as string),
        })),
      });
    });
  }, []);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setIsDirty(true);
    setForm((f) => (f ? { ...f, [k]: v } : f));
  };

  async function save() {
    if (!form) return;
    setSaving(true); setSaved(false);
    const payload = {
      ...form,
      educations: form.educations.map((e) => ({
        ...e, startYear: e.startYear ? Number(e.startYear) : null, endYear: e.endYear ? Number(e.endYear) : null,
      })),
    };
    const res = await fetch("/api/profile", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (res.ok) {
      setIsDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  if (!form) {
    return <div className="flex items-center gap-2 text-muted"><Loader2 className="size-4 animate-spin" /> Loading profile…</div>;
  }

  const toggleMode = (m: string) =>
    set("workModes", form.workModes.includes(m) ? form.workModes.filter((x) => x !== m) : [...form.workModes, m]);

  return (
    <div className="flex flex-col gap-8 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Candidate Profile</h1>
          <p className="text-sm text-muted">The single source of truth for every generation.</p>
        </div>
      </header>

      {/* Personal */}
      <Card>
        <CardHeader><CardTitle>Personal</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Field label="First name"><Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
          <Field label="Last name"><Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
          <Field label="Middle name"><Input value={form.middleName} onChange={(e) => set("middleName", e.target.value)} /></Field>
          <Field label="Date of birth"><Input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} /></Field>
          <Field label="City"><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="Country"><Input value={form.country} onChange={(e) => set("country", e.target.value)} /></Field>
        </CardContent>
      </Card>

      {/* Photo */}
      <Card>
        <CardHeader>
          <CardTitle>Photo</CardTitle>
          <CardDescription>Professional portrait, ~3×4 CV ratio. Used only where the target market expects a photo.</CardDescription>
        </CardHeader>
        <CardContent><PhotoUploader initialPath={photoPath} onUploaded={setPhotoPath} /></CardContent>
      </Card>

      {/* Contacts */}
      <Card>
        <CardHeader><CardTitle>Contacts</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Telegram"><Input value={form.telegram} onChange={(e) => set("telegram", e.target.value)} /></Field>
          <Field label="LinkedIn"><Input value={form.linkedin} onChange={(e) => set("linkedin", e.target.value)} /></Field>
          <Field label="GitHub"><Input value={form.github} onChange={(e) => set("github", e.target.value)} /></Field>
          <Field label="Website"><Input value={form.website} onChange={(e) => set("website", e.target.value)} /></Field>
          <Field label="Portfolio"><Input value={form.portfolio} onChange={(e) => set("portfolio", e.target.value)} /></Field>
        </CardContent>
      </Card>

      {/* Work preferences */}
      <Card>
        <CardHeader><CardTitle>Work Preferences</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            {WORK_MODES.map((m) => (
              <button key={m} type="button" onClick={() => toggleMode(m)}
                className={`rounded-md border px-3 py-1.5 text-sm capitalize transition-colors ${form.workModes.includes(m) ? "border-accent bg-accent text-white" : "border-border hover:bg-surface"}`}>
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.relocation} onChange={(e) => set("relocation", e.target.checked)} /> Open to relocation</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.businessTrips} onChange={(e) => set("businessTrips", e.target.checked)} /> Open to business trips</label>
          </div>
        </CardContent>
      </Card>

      {/* Languages */}
      <Card>
        <CardHeader><CardTitle>Languages</CardTitle></CardHeader>
        <CardContent>
          <Repeatable<Lang> items={form.languages} onChange={(v) => set("languages", v)} empty={{ name: "", level: "" }} addLabel="Add language"
            render={(item, update) => (
              <div className="grid grid-cols-2 gap-3 pr-8">
                <Field label="Language"><Input value={item.name} onChange={(e) => update({ name: e.target.value })} placeholder="English" /></Field>
                <Field label="Level"><Input value={item.level} onChange={(e) => update({ level: e.target.value })} placeholder="B2 / Native" /></Field>
              </div>
            )} />
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
        <CardContent>
          <Repeatable<Sk> items={form.skills} onChange={(v) => set("skills", v)} empty={{ category: "technical", name: "", level: "" }} addLabel="Add skill"
            render={(item, update) => (
              <div className="grid grid-cols-3 gap-3 pr-8">
                <Field label="Category">
                  <Select value={item.category} onChange={(e) => update({ category: e.target.value })}>
                    {SKILL_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </Select>
                </Field>
                <Field label="Skill"><Input value={item.name} onChange={(e) => update({ name: e.target.value })} /></Field>
                <Field label="Level (optional)"><Input value={item.level} onChange={(e) => update({ level: e.target.value })} placeholder="Expert" /></Field>
              </div>
            )} />
        </CardContent>
      </Card>

      {/* Experience */}
      <Card>
        <CardHeader><CardTitle>Work Experience</CardTitle><CardDescription>One line per bullet in the text areas.</CardDescription></CardHeader>
        <CardContent>
          <Repeatable<Exp> items={form.experiences} onChange={(v) => set("experiences", v)}
            empty={{ company: "", companyUrl: "", position: "", startDate: "", endDate: "", current: false, location: "", employment: "", responsibilities: [], achievements: [], metrics: [] }}
            addLabel="Add experience"
            render={(item, update) => (
              <div className="grid grid-cols-2 gap-3 pr-8">
                <Field label="Company"><Input value={item.company} onChange={(e) => update({ company: e.target.value })} /></Field>
                <Field label="Position"><Input value={item.position} onChange={(e) => update({ position: e.target.value })} /></Field>
                <Field label="Company website"><Input value={item.companyUrl} onChange={(e) => update({ companyUrl: e.target.value })} /></Field>
                <Field label="Location"><Input value={item.location} onChange={(e) => update({ location: e.target.value })} /></Field>
                <Field label="Start"><Input type="month" value={item.startDate} onChange={(e) => update({ startDate: e.target.value })} /></Field>
                <Field label="End"><Input type="month" value={item.endDate} disabled={item.current} onChange={(e) => update({ endDate: e.target.value })} /></Field>
                <Field label="Employment type"><Input value={item.employment} onChange={(e) => update({ employment: e.target.value })} placeholder="Full-time" /></Field>
                <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={item.current} onChange={(e) => update({ current: e.target.checked })} /> Current role</label>
                <div className="col-span-2"><Field label="Responsibilities"><Textarea value={arrayToLines(item.responsibilities)} onChange={(e) => update({ responsibilities: linesToArray(e.target.value) })} /></Field></div>
                <div className="col-span-2"><Field label="Achievements"><Textarea value={arrayToLines(item.achievements)} onChange={(e) => update({ achievements: linesToArray(e.target.value) })} /></Field></div>
                <div className="col-span-2"><Field label="Metrics / quantified results"><Textarea value={arrayToLines(item.metrics)} onChange={(e) => update({ metrics: linesToArray(e.target.value) })} placeholder="Cut latency 40%\nGrew MRR to $120k" /></Field></div>
              </div>
            )} />
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader><CardTitle>Education</CardTitle></CardHeader>
        <CardContent>
          <Repeatable<Edu> items={form.educations} onChange={(v) => set("educations", v)}
            empty={{ institution: "", institutionUrl: "", degree: "", field: "", startYear: "", endYear: "" }} addLabel="Add education"
            render={(item, update) => (
              <div className="grid grid-cols-2 gap-3 pr-8">
                <Field label="Institution"><Input value={item.institution} onChange={(e) => update({ institution: e.target.value })} /></Field>
                <Field label="Website"><Input value={item.institutionUrl} onChange={(e) => update({ institutionUrl: e.target.value })} /></Field>
                <Field label="Degree"><Input value={item.degree} onChange={(e) => update({ degree: e.target.value })} /></Field>
                <Field label="Field"><Input value={item.field} onChange={(e) => update({ field: e.target.value })} /></Field>
                <Field label="Start year"><Input value={item.startYear} onChange={(e) => update({ startYear: e.target.value })} placeholder="2018" /></Field>
                <Field label="End year"><Input value={item.endYear} onChange={(e) => update({ endYear: e.target.value })} placeholder="2022" /></Field>
              </div>
            )} />
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader><CardTitle>Certifications</CardTitle></CardHeader>
        <CardContent>
          <Repeatable<Cert> items={form.certifications} onChange={(v) => set("certifications", v)}
            empty={{ name: "", organization: "", url: "", credentialId: "", issueDate: "" }} addLabel="Add certification"
            render={(item, update) => (
              <div className="grid grid-cols-2 gap-3 pr-8">
                <Field label="Name"><Input value={item.name} onChange={(e) => update({ name: e.target.value })} /></Field>
                <Field label="Organization"><Input value={item.organization} onChange={(e) => update({ organization: e.target.value })} /></Field>
                <Field label="URL"><Input value={item.url} onChange={(e) => update({ url: e.target.value })} /></Field>
                <Field label="Credential ID"><Input value={item.credentialId} onChange={(e) => update({ credentialId: e.target.value })} /></Field>
                <Field label="Issue date"><Input type="date" value={item.issueDate} onChange={(e) => update({ issueDate: e.target.value })} /></Field>
              </div>
            )} />
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader><CardTitle>Projects</CardTitle></CardHeader>
        <CardContent>
          <Repeatable<Proj> items={form.projects} onChange={(v) => set("projects", v)}
            empty={{ name: "", description: "", technologies: [], url: "", results: [] }} addLabel="Add project"
            render={(item, update) => (
              <div className="grid grid-cols-2 gap-3 pr-8">
                <Field label="Name"><Input value={item.name} onChange={(e) => update({ name: e.target.value })} /></Field>
                <Field label="URL"><Input value={item.url} onChange={(e) => update({ url: e.target.value })} /></Field>
                <div className="col-span-2"><Field label="Description"><Textarea value={item.description} onChange={(e) => update({ description: e.target.value })} /></Field></div>
                <Field label="Technologies (comma separated)"><Input value={item.technologies.join(", ")} onChange={(e) => update({ technologies: csvToArray(e.target.value) })} /></Field>
                <div className="col-span-2"><Field label="Results (one per line)"><Textarea value={arrayToLines(item.results)} onChange={(e) => update({ results: linesToArray(e.target.value) })} /></Field></div>
              </div>
            )} />
        </CardContent>
      </Card>

      <IntelligencePanel />

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 md:left-60 right-0 z-20 border-t border-border bg-background/90 px-4 md:px-8 py-3 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-3">
          {saved ? <span className="flex items-center gap-1 text-sm text-success"><Check className="size-4" /> Saved</span> : null}
          <Button onClick={save} disabled={saving} variant="accent">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save profile
          </Button>
        </div>
      </div>
    </div>
  );
}
