"use client";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Generic repeatable-row editor used by every list section of the profile.
export function Repeatable<T>({
  items,
  onChange,
  empty,
  render,
  addLabel,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  empty: T;
  render: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  addLabel: string;
}) {
  const update = (i: number, patch: Partial<T>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { ...empty }]);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div key={i} className="relative rounded-md border border-border bg-surface p-4">
          <button
            type="button"
            onClick={() => remove(i)}
            className="absolute right-3 top-3 text-muted hover:text-danger"
            aria-label="Remove"
          >
            <Trash2 className="size-4" />
          </button>
          {render(item, (patch) => update(i, patch))}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="self-start">
        <Plus className="size-4" /> {addLabel}
      </Button>
    </div>
  );
}

// Textarea helper: one bullet per line <-> string[].
export function linesToArray(v: string): string[] {
  return v.split("\n").map((s) => s.trim()).filter(Boolean);
}
export function arrayToLines(v?: string[] | null): string {
  return (v ?? []).join("\n");
}
export function csvToArray(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}
