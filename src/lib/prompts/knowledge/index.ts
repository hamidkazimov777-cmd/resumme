// ---------------------------------------------------------------------------
// KNOWLEDGE BASE LOADER
//
// `ideal-resume.md` is the single source of truth for what "a good resume" is.
// It is an EXTERNAL, EDITABLE asset — tune the resume standards by editing that
// markdown file, with no code change. This loader reads it from disk once and
// caches it for the process lifetime.
//
// Distilled from Indeed UK, StandOut CV, Oxford Careers, Prospects and
// MyPerfectResume. Server-only (uses `fs`); never import from client code.
// ---------------------------------------------------------------------------

import { readFileSync } from "fs";
import { join } from "path";

let cached: string | null = null;

/** The full ideal-resume knowledge base, verbatim. Cached after first read. */
export function knowledgeBase(): string {
  if (cached !== null) return cached;
  try {
    const path = join(process.cwd(), "src/lib/prompts/knowledge/ideal-resume.md");
    cached = readFileSync(path, "utf8").trim();
  } catch {
    // If the asset is missing (unexpected packaging), fall back to an empty
    // string so master.ts still composes its supplemental blocks.
    cached = "";
  }
  return cached;
}
