"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteGenerationButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete ${label}?`)) return;
    setBusy(true);
    const res = await fetch(`/api/generations/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      setBusy(false);
      alert("Failed to delete generation.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      title="Delete generation"
      className="rounded p-1.5 text-muted transition-colors hover:text-danger hover:bg-danger/10 disabled:opacity-50"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </button>
  );
}
