// Design skill — resume visual templates + automatic selection.
// A template is a THEME over the same ATS-safe linear document (color and
// header layout only — never tables/columns that break parsing). Switching a
// template is pure layout: it re-renders the stored content with no AI call.

export type TemplateId = "ats" | "modern" | "photo";

export interface Theme {
  id: TemplateId;
  label: string;
  description: string;
  accent: string; // hex; used for name + section titles on non-plain themes
  headerStyle: "plain" | "bar" | "photo";
  showPhoto: boolean;
  rule: boolean; // underline rule under section titles
}

export const TEMPLATES: Record<TemplateId, Theme> = {
  ats: {
    id: "ats",
    label: "ATS Plain",
    description: "Black-and-white, maximally parseable. Safest for US/UK and large-company ATS.",
    accent: "#111111",
    headerStyle: "plain",
    showPhoto: false,
    rule: true,
  },
  modern: {
    id: "modern",
    label: "Modern Accent",
    description: "Single column with an accent color. Good for product, startup and creative roles.",
    accent: "#1a56db",
    headerStyle: "bar",
    showPhoto: false,
    rule: true,
  },
  photo: {
    id: "photo",
    label: "With Photo",
    description: "Portrait top-right. For markets that expect a photo (DACH, Gulf, CIS).",
    accent: "#1a56db",
    headerStyle: "photo",
    showPhoto: true,
    rule: true,
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATES);

export function getTheme(id?: string | null): Theme {
  return (id && TEMPLATES[id as TemplateId]) || TEMPLATES.ats;
}

const CREATIVE = /(design|designer|creative|art|brand|product|startup|marketing|ux|ui)/i;
const CONSERVATIVE_MARKETS = /(usa|united states|us|uk|united kingdom|canada|australia)/i;
const EXEC = /(director|vp|c-level|head|chief|executive)/i;

// Auto-selection: the "skill" that picks a template without user input.
export function selectTemplate(input: {
  market?: string | null;
  seniority?: string | null;
  title?: string | null;
  industries?: string[] | null;
  includePhoto?: boolean | null;
  hasPhotoFile?: boolean; // only choose "photo" if a photo actually exists
}): TemplateId {
  const market = input.market ?? "";
  const roleText = `${input.title ?? ""} ${(input.industries ?? []).join(" ")}`;

  // 1) Photo-expecting markets → photo template, but only if a photo exists.
  if (input.includePhoto && input.hasPhotoFile) return "photo";

  // 2) Conservative markets or executive roles → plainest ATS layout.
  if (CONSERVATIVE_MARKETS.test(market) || EXEC.test(input.seniority ?? "")) return "ats";

  // 3) Creative / product / startup signals → modern accent.
  if (CREATIVE.test(roleText)) return "modern";

  // 4) Default: safe ATS.
  return "ats";
}
