"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { Upload, Loader2, AlertTriangle } from "lucide-react";

export function PhotoUploader({
  initialPath,
  onUploaded,
}: {
  initialPath: string | null;
  onUploaded: (path: string) => void;
}) {
  const [path, setPath] = useState(initialPath);
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true); setError(""); setWarnings([]);
    const fd = new FormData();
    fd.append("photo", file);
    const res = await fetch("/api/profile/photo", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error || "Upload failed."); return; }
    setPath(data.photoPath);
    setWarnings(data.warnings || []);
    onUploaded(data.photoPath);
  }

  return (
    <div className="flex items-start gap-6">
      <div className="flex size-32 items-center justify-center overflow-hidden rounded-md border border-border bg-surface">
        {path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${path}?t=${Date.now()}`} alt="Profile" className="size-full object-cover" />
        ) : (
          <span className="text-xs text-muted">No photo</span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload photo
        </Button>
        <p className="max-w-sm text-xs text-muted">JPEG/PNG/WebP · up to 5MB · portrait ~3×4 (ratio ≈ 0.75).</p>
        {error ? <Badge variant="danger">{error}</Badge> : null}
        {warnings.map((w, i) => (
          <span key={i} className="flex items-center gap-1 text-xs text-warning"><AlertTriangle className="size-3" /> {w}</span>
        ))}
      </div>
    </div>
  );
}
