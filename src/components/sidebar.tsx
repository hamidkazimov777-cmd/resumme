"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, User, Briefcase, History, Settings, FileText, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Candidate Profile", icon: User },
  { href: "/analyzer", label: "Job Analyzer", icon: Briefcase },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

const HIDDEN_ON = ["/login", "/register"];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  const hidden = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (hidden) return;
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setEmail(d.user?.email ?? null)).catch(() => {});
  }, [hidden, pathname]);

  if (hidden) return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center gap-2 px-5">
        <FileText className="size-5 text-accent" />
        <span className="text-sm font-semibold tracking-tight">Resumee</span>
      </div>
      <nav className="flex flex-col gap-0.5 px-3 py-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-card font-medium text-foreground shadow-sm" : "text-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-2 p-4">
        {email ? <p className="truncate text-xs text-muted" title={email}>{email}</p> : null}
        <button onClick={logout} className="flex items-center gap-2 rounded-md px-1 py-1 text-xs text-muted transition-colors hover:text-foreground">
          <LogOut className="size-3.5" /> Sign out
        </button>
      </div>
    </aside>
  );
}
