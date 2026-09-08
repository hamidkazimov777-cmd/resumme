"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";

export function DeleteJobButton({ jobId, jobTitle }: { jobId: string; jobTitle?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${jobTitle || "this vacancy"}" and all its generated documents?`)) return;
    setBusy(true);
    const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/analyzer");
      router.refresh();
    } else {
      setBusy(false);
      alert("Failed to delete vacancy.");
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={busy}
      className="text-muted hover:text-danger hover:bg-danger/10 gap-1.5"
      title="Delete vacancy"
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      <span>Delete</span>
    </Button>
  );
}
