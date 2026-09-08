"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Select, Field, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { PROVIDER_LIST, type ProviderId } from "@/lib/constants";
import { Loader2, Check, Download } from "lucide-react";

type SafeSetting = { provider: string; baseUrl: string; model: string | null; isActive: boolean; hasKey: boolean; keyHint: string };
type Model = { id: string; label: string };

// Expected API-key prefix per provider, used for a clear error (not a silent one).
const KEY_PREFIX: Record<ProviderId, string> = {
  openrouter: "sk-or-",
  tokenrouter: "tr_",
  anthropic: "sk-ant-",
  moonshot: "sk-",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, SafeSetting>>({});
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [models, setModels] = useState<Record<string, Model[]>>({});
  const [busy, setBusy] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<Record<string, string>>({});

  const load = () =>
    fetch("/api/settings")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          return null;
        }
        return r.json();
      })
      .then((arr) => {
        if (!Array.isArray(arr)) return;
        const map: Record<string, SafeSetting> = {};
        arr.forEach((s) => (map[s.provider] = s));
        setSettings(map);
      })
      .catch(() => {});
  useEffect(() => { load(); }, []);

  async function saveKey(provider: ProviderId) {
    const key = (keys[provider] ?? "").trim();
    const prefix = KEY_PREFIX[provider];
    if (!key) return;
    if (prefix && !key.startsWith(prefix)) {
      const label = PROVIDER_LIST.find((p) => p.id === provider)?.label ?? provider;
      setMsg((m) => ({ ...m, [provider]: `${label} keys start with “${prefix}”. The pasted key (${key.slice(0, 3)}…) does not match — it will not work.` }));
      return;
    }
    setBusy((b) => ({ ...b, [provider]: "key" }));
    setMsg((m) => ({ ...m, [provider]: "" }));
    try {
      const res = await fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider, apiKey: key }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg((m) => ({ ...m, [provider]: d.error ? (typeof d.error === "string" ? d.error : JSON.stringify(d.error)) : "Failed to save key" }));
        return;
      }
      setMsg((m) => ({ ...m, [provider]: "Key saved" }));
      setKeys((k) => ({ ...k, [provider]: "" }));
      load();
      setTimeout(() => setMsg((m) => ({ ...m, [provider]: "" })), 2000);
    } finally {
      setBusy((b) => ({ ...b, [provider]: "" }));
    }
  }

  async function loadModels(provider: ProviderId) {
    setBusy((b) => ({ ...b, [provider]: "models" }));
    setMsg((m) => ({ ...m, [provider]: "" }));
    const res = await fetch("/api/settings/models", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider, apiKey: keys[provider] || undefined }),
    });
    const d = await res.json();
    setBusy((b) => ({ ...b, [provider]: "" }));
    if (!res.ok) { setMsg((m) => ({ ...m, [provider]: d.error || "Failed to load models" })); return; }
    setModels((mm) => ({ ...mm, [provider]: d.models }));
  }

  async function selectModel(provider: ProviderId, model: string) {
    await fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider, model }) });
    load();
  }

  async function setActive(provider: ProviderId) {
    await fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider, isActive: true }) });
    load();
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted">Configure AI providers. Keys are stored locally in your SQLite database.</p>
      </header>

      {PROVIDER_LIST.map((p) => {
        const s = settings[p.id];
        const busyState = busy[p.id];
        const modelList = models[p.id] ?? [];
        return (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {p.label}
                    {s?.isActive ? <Badge variant="success">Active</Badge> : null}
                  </CardTitle>
                  <CardDescription>{p.docsHint}</CardDescription>
                </div>
                {!s?.isActive && s?.hasKey && s?.model ? (
                  <Button size="sm" variant="outline" onClick={() => setActive(p.id)}>Set active</Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field label="Base URL"><Input value={p.baseUrl} disabled /></Field>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Field label={`API Key${s?.hasKey ? ` (saved: ${s.keyHint})` : ""}`}>
                    <Input type="password" placeholder={s?.hasKey ? "Enter to replace" : "Paste API key"} value={keys[p.id] ?? ""} onChange={(e) => setKeys((k) => ({ ...k, [p.id]: e.target.value }))} />
                  </Field>
                  <p className="mt-1 text-xs text-muted">Keys start with <code className="font-mono">{KEY_PREFIX[p.id]}</code>…</p>
                </div>
                <Button size="sm" onClick={() => saveKey(p.id)} disabled={busyState === "key" || !(keys[p.id]?.length)}>
                  {busyState === "key" ? <Loader2 className="size-4 animate-spin" /> : "Save key"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => loadModels(p.id)} disabled={busyState === "models" || !(s?.hasKey || keys[p.id]?.length)}>
                  {busyState === "models" ? <Loader2 className="size-4 animate-spin" /> : <><Download className="size-4" /> Load models</>}
                </Button>
              </div>

              {modelList.length > 0 || s?.model ? (
                <Field label="Model">
                  <Select value={s?.model ?? ""} onChange={(e) => selectModel(p.id, e.target.value)}>
                    <option value="" disabled>Select a model…</option>
                    {s?.model && !modelList.some((m) => m.id === s.model) ? <option value={s.model}>{s.model}</option> : null}
                    {modelList.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </Select>
                </Field>
              ) : null}

              {msg[p.id] ? (
                <span className={`flex items-center gap-1 text-xs ${msg[p.id].includes("saved") ? "text-success" : "text-danger"}`}>
                  {msg[p.id].includes("saved") ? <Check className="size-3" /> : null}{msg[p.id]}
                </span>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
