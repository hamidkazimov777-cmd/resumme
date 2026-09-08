// Design skill — resume visual templates + automatic selection.
// A template is a THEME over the same ATS-safe linear document (color, fonts,
// spacing and header layout only — never tables/columns that break parsing).
// Switching a template is pure layout: it re-renders the stored content with
// no AI call.

export type TemplateId = "ats" | "modern" | "photo" | "executive";

// Visual layout family — how the header + section chrome is arranged. The body
// of every section stays the same ATS-safe linear flow.
export type Layout = "classic" | "modern" | "executive" | "creative";

// Type scale: a single source of truth for font sizes so every section is
// proportioned consistently (this is what makes a layout read as "designed"
// instead of "generated"). Sizes are PDF points.
export interface TypeScale {
  name: number;      // candidate name
  headline: number;  // role headline under the name
  section: number;   // section titles (EXPERIENCE, ...)
  title: number;     // item titles (position, project, degree)
  body: number;      // bullets, summary, descriptions
  small: number;     // dates, locations, contact, meta
}

// The full design token set for a theme.
export interface Theme {
  id: TemplateId;
  label: string;
  description: string;
  // palette
  accent: string;      // brand accent (name on colored themes, links, rules)
  ink: string;         // primary text
  muted: string;       // secondary text (dates, locations, meta)
  faint: string;       // hairlines, separators
  // typography
  bodyFont: string;    // registered family for body text
  headFont: string;    // registered family for name + section + item titles
  type: TypeScale;
  // layout
  layout: Layout;       // explicit visual family (header + section chrome)
  headerStyle: "plain" | "bar" | "photo";
  showPhoto: boolean;
  rule: boolean;          // hairline under section titles
  nameTracking: number;   // letter-spacing on the name (premium touch)
  sectionTracking: number; // letter-spacing on section titles
  pageGutter: number;     // horizontal page padding
  leading: number;        // base line-height multiplier
}

const SANS_TYPE: TypeScale = {
  name: 21, headline: 11, section: 9.5, title: 10.5, body: 9.6, small: 8.6,
};
const SERIF_TYPE: TypeScale = {
  name: 22, headline: 11.5, section: 9.5, title: 10.5, body: 9.8, small: 8.8,
};
// Executive scale: bigger name, airier body — confidence through space.
const EXEC_TYPE: TypeScale = {
  name: 26, headline: 12, section: 9.5, title: 11, body: 10, small: 9,
};

export const TEMPLATES: Record<TemplateId, Theme> = {
  // Classic — restrained serif, near-black, the "executive / ATS-safe" look.
  ats: {
    id: "ats",
    label: "Classic",
    description: "Timeless serif, near-black. Safest for US/UK and large-company ATS.",
    accent: "#1c1c1c",
    ink: "#1a1a1a",
    muted: "#5a5a5a",
    faint: "#d8d8d8",
    bodyFont: "SourceSerif",
    headFont: "SourceSerif",
    type: SERIF_TYPE,
    layout: "classic",
    headerStyle: "plain",
    showPhoto: false,
    rule: true,
    nameTracking: 0.2,
    sectionTracking: 1.6,
    pageGutter: 46,
    leading: 1.42,
  },
  // Modern — clean sans, single confident accent, generous air.
  modern: {
    id: "modern",
    label: "Modern",
    description: "Clean sans with a single accent color. For product, startup and creative roles.",
    accent: "#1f4fd8",
    ink: "#16181d",
    muted: "#5b6470",
    faint: "#e3e6ea",
    bodyFont: "Inter",
    headFont: "Inter",
    type: SANS_TYPE,
    layout: "modern",
    headerStyle: "bar",
    showPhoto: false,
    rule: true,
    nameTracking: 0.1,
    sectionTracking: 1.8,
    pageGutter: 46,
    leading: 1.4,
  },
  // Photo — modern sans with a portrait. For photo-expecting markets.
  photo: {
    id: "photo",
    label: "Photo",
    description: "Modern layout with a portrait. For markets that expect a photo (DACH, Gulf, CIS).",
    accent: "#1f4fd8",
    ink: "#16181d",
    muted: "#5b6470",
    faint: "#e3e6ea",
    bodyFont: "Inter",
    headFont: "Inter",
    type: SANS_TYPE,
    layout: "creative",
    headerStyle: "photo",
    showPhoto: true,
    rule: true,
    nameTracking: 0.1,
    sectionTracking: 1.8,
    pageGutter: 46,
    leading: 1.4,
  },
  // Executive — premium sans, oversized tracked name, maximal restraint & air.
  // For senior / leadership roles where confidence reads better than density.
  executive: {
    id: "executive",
    label: "Executive",
    description: "Understated premium: oversized name, thin hairline, generous white space. For senior & leadership roles.",
    accent: "#0f2a52",
    ink: "#171a20",
    muted: "#5d6672",
    faint: "#e6e8ec",
    bodyFont: "Inter",
    headFont: "InterDisplay",
    type: EXEC_TYPE,
    layout: "executive",
    headerStyle: "plain",
    showPhoto: false,
    rule: false,
    nameTracking: 1.1,
    sectionTracking: 2.2,
    pageGutter: 54,
    leading: 1.5,
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

  // 2) Senior / leadership roles → understated premium executive layout.
  if (EXEC.test(input.seniority ?? "") || EXEC.test(input.title ?? "")) return "executive";

  // 3) Conservative markets → plainest classic layout.
  if (CONSERVATIVE_MARKETS.test(market)) return "ats";

  // 4) Creative / product / startup signals → modern accent.
  if (CREATIVE.test(roleText)) return "modern";

  // 5) Default: safe classic.
  return "ats";
}

// Pick TWO distinct templates for the pair of resume versions produced per
// generation: always one Modern + one Photo. Without a photo on file the
// photo version falls back to executive (senior roles) or classic.
export function selectTemplatePair(input: Parameters<typeof selectTemplate>[0]): [TemplateId, TemplateId] {
  if (input.hasPhotoFile) return ["modern", "photo"];
  const senior = EXEC.test(input.seniority ?? "") || EXEC.test(input.title ?? "");
  return ["modern", senior ? "executive" : "ats"];
}
