"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, User, Briefcase, History, Settings, FileText, LogOut, Menu, X } from "lucide-react";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  const hidden = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (hidden) return;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setEmail(d.user?.email ?? null))
      .catch(() => {});
  }, [hidden, pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (hidden) return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const navLinks = (
    <nav className="flex flex-col gap-0.5 px-3 py-2">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
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
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex h-14 w-full items-center justify-between border-b border-border bg-surface px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <FileText className="size-5 text-accent" />
          <span className="text-sm font-semibold tracking-tight">Resumee</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-md p-1.5 text-muted hover:text-foreground"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen ? (
        <div className="fixed inset-0 top-14 z-50 flex flex-col bg-surface/95 p-4 backdrop-blur md:hidden">
          {navLinks}
          <div className="mt-auto border-t border-border pt-4">
            {email ? <p className="mb-2 truncate text-xs text-muted">{email}</p> : null}
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          </div>
        </div>
      ) : null}

      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex h-14 items-center gap-2 px-5">
          <FileText className="size-5 text-accent" />
          <span className="text-sm font-semibold tracking-tight">Resumee</span>
        </div>
        {navLinks}
        <div className="mt-auto flex flex-col gap-2 p-4">
          {email ? <p className="truncate text-xs text-muted" title={email}>{email}</p> : null}
          <button
            onClick={logout}
            className="flex items-center gap-2 rounded-md px-1 py-1 text-xs text-muted transition-colors hover:text-foreground"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
