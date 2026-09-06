"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Field, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(isRegister ? { email, password, name } : { email, password }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); setError(d.error || "Something went wrong."); return; }
    router.push(params.get("next") || "/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-1 flex items-center gap-2">
            <FileText className="size-5 text-accent" />
            <span className="text-sm font-semibold tracking-tight">Resumee</span>
          </div>
          <CardTitle>{isRegister ? "Create your account" : "Welcome back"}</CardTitle>
          <CardDescription>
            {isRegister ? "Start building tailored, ATS-ready resumes." : "Sign in to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {isRegister ? (
              <Field label="Name (optional)"><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></Field>
            ) : null}
            <Field label="Email">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
            <Field label="Password" hint={isRegister ? "At least 8 characters." : undefined}>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isRegister ? "new-password" : "current-password"} />
            </Field>
            {error ? <Badge variant="danger">{error}</Badge> : null}
            <Button type="submit" variant="accent" disabled={busy} className="mt-1">
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {isRegister ? "Create account" : "Sign in"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted">
            {isRegister ? (
              <>Already have an account? <Link href="/login" className="text-accent hover:underline">Sign in</Link></>
            ) : (
              <>No account? <Link href="/register" className="text-accent hover:underline">Create one</Link></>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
