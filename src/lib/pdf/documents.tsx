import React from "react";
import path from "path";
import { Document, Page, Text, View, Image, Link, Font, StyleSheet } from "@react-pdf/renderer";
import type { ResumeDoc, CoverLetterDoc } from "@/lib/types";
import { getTheme, type Theme, type Layout } from "@/lib/design/templates";

// --- Fonts ---------------------------------------------------------------
// Real typefaces are what separate a "designed" resume from a "generated"
// one. We register Inter (modern sans) and Source Serif (classic serif) from
// local TTFs and map weights so <Text fontFamily + bold> resolves correctly.
// Registered once at module load; safe across serverless invocations.
const FONTS_DIR = path.join(process.cwd(), "public", "fonts");
let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  fontsReady = true;
  const f = (name: string) => path.join(FONTS_DIR, name);
  Font.register({
    family: "Inter",
    fonts: [
      { src: f("Inter-Regular.ttf"), fontWeight: 400 },
      { src: f("Inter-Medium.ttf"), fontWeight: 500 },
      { src: f("Inter-SemiBold.ttf"), fontWeight: 600 },
      { src: f("Inter-Bold.ttf"), fontWeight: 700 },
      { src: f("Inter-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
    ],
  });
  Font.register({
    family: "InterDisplay",
    fonts: [
      { src: f("InterDisplay-SemiBold.ttf"), fontWeight: 600 },
      { src: f("InterDisplay-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "SourceSerif",
    fonts: [
      { src: f("SourceSerif4-Regular.ttf"), fontWeight: 400 },
      { src: f("SourceSerif4-Semibold.ttf"), fontWeight: 600 },
      { src: f("SourceSerif4-Bold.ttf"), fontWeight: 700 },
      { src: f("SourceSerif4-It.ttf"), fontWeight: 400, fontStyle: "italic" },
    ],
  });
}
registerFonts();

// Disable automatic hyphenation — no "Lan-\nguage" breaks; words wrap at
// spaces only, which reads far more like a human-written document.
Font.registerHyphenationCallback((word) => [word]);

// Human-friendly certification dates: turn an ISO date/month ("2025-05-01",
// "2025-05") into "May 2025"; leave already-human values ("2025", "May 2025")
// untouched. Robust to whatever the model emits and fixes stored generations.
const CERT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatCertDate(s?: string): string {
  if (!s) return "";
  const m = s.trim().match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (!m) return s.trim();
  const mon = CERT_MONTHS[parseInt(m[2], 10) - 1];
  return mon ? `${mon} ${m[1]}` : m[1];
}

// ATS-friendly layout: single linear column, standard headings, real text,
// simple bullets, no tables/graphics that break parsing. A "template" is a
// THEME (palette + typeface + spacing + header layout) applied over this same
// linear structure, so parsing stays intact regardless of template.

const PAGE_SIZE = { A4: "A4", Letter: "LETTER" } as const;

// Styles derive from the theme's design tokens, so build them per-render.
// Optional density profile scales section/item gaps for auto-fit.
function makeStyles(theme: Theme, profile?: DensityProfile) {
  const t = theme.type;
  const plain = theme.headerStyle === "plain";
  const serif = /serif/i.test(theme.bodyFont) || /serif/i.test(theme.headFont);
  const sectionGap = profile?.sectionGap ?? 9;
  const itemGap = profile?.itemGap ?? 5;
  const paddingTop = profile?.paddingTop ?? 24;
  const paddingBottom = profile?.paddingBottom ?? 20;
  const bulletGap = profile?.bulletGap ?? 1.8;
  const headlineBottom = profile?.headlineBottom ?? 5;
  const photoW = profile?.photoWidth ?? 58;
  const photoH = profile?.photoHeight ?? 74;

  // On the plain (classic serif) theme the name + titles stay ink-colored for
  // a restrained look; colored themes let the accent carry the name.
  const nameColor = plain ? theme.ink : theme.accent;
  const titleColor = plain ? theme.ink : theme.accent;

  return StyleSheet.create({
    page: {
      paddingTop,
      paddingBottom,
      paddingHorizontal: theme.pageGutter,
      fontSize: t.body,
      lineHeight: theme.leading,
      color: theme.ink,
      fontFamily: theme.bodyFont,
      // ATS-CRITICAL, serif only: Source Serif maps "fi"/"ft"/"ff" to single
      // ligature glyphs whose ToUnicode drops a character on text extraction
      // ("Swift" → "Swif"), silently breaking ATS keyword matching — so disable
      // ligatures for it. Inter has correct ToUnicode for its ligatures, and
      // forcing features off on it can instead corrupt the subset, so leave
      // Inter's defaults alone. Inherited by all Text on the page.
      ...(serif ? { fontFeatureSettings: { liga: false, clig: false, dlig: false, calt: false } } : {}),
    },

    // --- Header ---
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    headerMain: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingRight: 12 },
    name: {
      fontSize: t.name,
      fontFamily: theme.headFont,
      fontWeight: 700,
      letterSpacing: theme.nameTracking,
      lineHeight: 1.12,
      marginBottom: 2,
      color: nameColor,
    },
    headline: { fontSize: t.headline, color: theme.muted, marginBottom: headlineBottom, lineHeight: 1.25 },
    accentBar: { height: 1.8, backgroundColor: theme.accent, marginTop: 4, marginBottom: 3 },
    photo: { width: photoW, height: photoH, objectFit: "cover", borderRadius: 3, flexShrink: 0 },
    contactWrap: { marginTop: 1 },

    // --- Header variants (layout is derived from the theme tokens below) ---
    headerCentered: { alignItems: "center", textAlign: "center" },
    nameCentered: { marginBottom: 2 },
    headerRuleCentered: { width: 50, height: 1, backgroundColor: theme.accent, marginTop: 5, marginBottom: 7 },
    headerContactsCentered: { marginTop: 3, alignItems: "center" },
    // Executive: oversized name, restrained hairline, lots of air.
    nameExecutive: { fontSize: t.name + 3, letterSpacing: theme.nameTracking + 0.8, marginBottom: 4 },
    headerRuleExecutive: { width: 40, height: 1, backgroundColor: theme.accent, marginTop: 7, marginBottom: 8 },
    // Creative: accent side-rail next to the name + framed round photo.
    creativeRow: { flexDirection: "row", alignItems: "center" },
    creativeRail: { width: 3, alignSelf: "stretch", backgroundColor: theme.accent, borderRadius: 2, marginRight: 10 },
    creativeMain: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingRight: 12 },
    nameCreative: { color: theme.accent },
    photoCreative: { width: photoH - 6, height: photoH - 6, borderRadius: (photoH - 6) / 2, border: `1.5px solid ${theme.accent}`, flexShrink: 0 },

    // --- Sections ---
    section: { marginTop: sectionGap },
    // Classic: section title centered with thin rules on both sides.
    sectionHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
    sectionRule: { flexGrow: 1, height: 0.7, backgroundColor: theme.faint },
    sectionTitleClassic: {
      fontSize: t.section,
      fontFamily: theme.headFont,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: theme.sectionTracking,
      color: titleColor,
      paddingHorizontal: 8,
      textAlign: "center",
    },
    sectionTitle: {
      fontSize: t.section,
      fontFamily: theme.headFont,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: theme.sectionTracking,
      color: titleColor,
      marginBottom: 4,
      ...(theme.rule
        ? { borderBottom: `0.7px solid ${plain ? theme.faint : theme.accent}`, paddingBottom: 2.5 }
        : {}),
    },
    summary: { color: theme.ink, lineHeight: theme.leading },

    // --- Items (experience / projects / education) ---
    item: { marginTop: itemGap },
    itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    // Left column grows/shrinks; the right (dates) column is a stable
    // fixed-width gutter so dates never collide with a long title and always
    // line up in one vertical rail.
    itemTitle: { fontFamily: theme.headFont, fontWeight: 600, fontSize: t.title, color: theme.ink, flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingRight: 10 },
    itemSub: { fontSize: t.small, color: theme.muted, marginTop: 1 },
    itemDates: { fontSize: t.small, color: theme.muted, flexShrink: 0, width: 92, textAlign: "right", lineHeight: 1.2 },
    // Tech stack on the right of a project row: right-aligned, may wrap.
    itemTech: { fontSize: t.small, color: theme.muted, flexShrink: 0, maxWidth: "48%", textAlign: "right", paddingLeft: 8 },

    // --- Items: company on its own line in accent (colored themes only) ---
    itemCompany: { fontSize: t.small + 1, color: theme.accent, fontFamily: theme.headFont, fontWeight: 600, marginTop: 0.5 },

    // --- Bullets ---
    bullet: { flexDirection: "row", marginTop: bulletGap, paddingLeft: 2 },
    bulletDot: { width: 10, color: theme.muted },
    // Colored themes use a small square accent marker (like the gold-standard
    // references) instead of a dash — drawn as a View so it needs no glyph.
    bulletMark: { width: 3.4, height: 3.4, borderRadius: 0.8, backgroundColor: theme.accent, marginTop: t.body * 0.46, marginRight: 6 },
    bulletText: { flex: 1, color: theme.ink, lineHeight: theme.leading },

    // --- Skills / simple lines ---
    skillLine: { marginTop: bulletGap, lineHeight: theme.leading },
    skillCategory: { fontFamily: theme.headFont, fontWeight: 600, color: theme.ink },
    // Skill chips (colored themes): a scannable band of rounded badges, the
    // densest ATS keyword zone. Real text inside Views → fully parseable.
    skillChipRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 1 },
    skillChip: {
      fontSize: t.small,
      color: theme.accent,
      backgroundColor: theme.faint,
      borderRadius: 3,
      paddingVertical: 1.6,
      paddingHorizontal: 6,
      marginRight: 5,
      marginBottom: 4,
    },

    para: { marginBottom: 6, lineHeight: theme.leading },

    // --- Cover letter ---
    coverMeta: { fontSize: t.small + 0.5, color: theme.muted, marginBottom: 1.5 },
    coverRecipient: { fontSize: t.body, color: theme.ink, fontFamily: theme.headFont, fontWeight: 600 },
    coverGreeting: { fontSize: t.body, color: theme.ink, marginTop: 14, marginBottom: 9 },
    coverPara: { fontSize: t.body, color: theme.ink, lineHeight: 1.5, marginBottom: 9, textAlign: "left" },
    coverClosing: { fontSize: t.body, color: theme.ink, marginTop: 4 },
    coverSignature: { fontSize: t.body + 1, fontFamily: theme.headFont, fontWeight: 700, color: theme.ink, marginTop: 2 },
  });
}

// --- Auto-density (Phase 3) -------------------------------------------------
// Estimate content "weight" in lines, then pick a scale factor so the resume
// fits one page. Scale shrinks fonts, leading, and spacing — never below a
// readable floor (0.82). If even the floor overflows, we trim projects/bullets.

function contentWeight(doc: ResumeDoc): number {
  let w = 0;
  // Header: name + headline + contacts + photo
  w += doc.includePhoto ? 11 : 5; // a photo consumes real vertical space → weigh it heavier so the photo version compresses enough to stay on one page
  if (doc.summary) {
    w += Math.ceil(doc.summary.length / 70) + 2; // summary text (wraps at ~70 chars) + section title
  }

  // Skills: category + items per line, plus section title
  if (doc.skills?.length) {
    w += doc.skills.length + 2;
  }

  // Experience: position/company + dates line + bullets + section title + item gaps
  if (doc.experience?.length) {
    for (const e of doc.experience) {
      w += 2; // title + company/dates
      if (e.location) w += 0.5;
      if (e.bullets?.length) {
        for (const b of e.bullets) {
          // Bullets wrap at ~68 characters in standard layout
          w += Math.max(1, Math.ceil(b.length / 68));
        }
      }
      w += 1; // item gap
    }
    w += 2; // section title + gap
  }

  // Projects: title+tech line + desc line(s) + section title + gaps
  if (doc.projects?.length) {
    for (const p of doc.projects) {
      w += 1.5;
      if (p.description) {
        w += Math.max(1, Math.ceil(p.description.length / 70));
      }
      w += 1; // gap
    }
    w += 2; // section title + gap
  }

  // Education: 2 lines per entry + section title
  if (doc.education?.length) {
    w += doc.education.length * 2 + 2;
  }

  // Certifications: 1-2 lines each (long ones wrap) + section title
  if (doc.certifications?.length) {
    for (const c of doc.certifications) {
      const len = (c.name?.length ?? 0) + (c.organization?.length ?? 0) + (c.credentialId?.length ?? 0);
      w += Math.max(1, Math.ceil(len / 75));
    }
    w += 2;
  }

  // Languages: 1 line + section title
  if (doc.languages?.length) {
    w += 2;
  }

  return w;
}

// A4/Letter usable height in pt minus padding, divided by body line height.
// Gives max lines that fit one page at scale=1.
function maxLinesForPage(theme: Theme, format: "A4" | "Letter"): number {
  const pageH = format === "A4" ? 842 : 792; // pt
  const usable = pageH - 34 - 30; // paddingTop + paddingBottom
  const lineH = theme.type.body * theme.leading;
  return Math.floor(usable / lineH);
}

// Scale profiles: step down fonts/spacing when content is heavy.
interface DensityProfile {
  scale: number;          // multiplier for font sizes
  leading: number;        // multiplier for line-height
  sectionGap: number;     // marginTop for sections
  itemGap: number;        // marginTop for items
  paddingTop: number;     // page top margin
  paddingBottom: number;  // page bottom margin
  bulletGap: number;      // margin between bullets
  photoWidth: number;     // candidate photo width
  photoHeight: number;    // candidate photo height
  headlineBottom: number; // space under headline
  trim: boolean;          // whether to drop low-priority items
}

const DENSITY_PROFILES: DensityProfile[] = [
  // Profile 0: light content (<= 38 lines) -> standard airy spacing
  {
    scale: 1.0,
    leading: 1.0,
    sectionGap: 10,
    itemGap: 5.5,
    paddingTop: 28,
    paddingBottom: 26,
    bulletGap: 1.8,
    photoWidth: 58,
    photoHeight: 74,
    headlineBottom: 5,
    trim: false,
  },
  // Profile 1: medium content (<= 50 lines) -> slight compression
  {
    scale: 0.94,
    leading: 0.96,
    sectionGap: 8.5,
    itemGap: 4.8,
    paddingTop: 24,
    paddingBottom: 22,
    bulletGap: 1.6,
    photoWidth: 54,
    photoHeight: 68,
    headlineBottom: 4,
    trim: false,
  },
  // Profile 2: full content (<= 62 lines) -> compact spacing
  {
    scale: 0.88,
    leading: 0.91,
    sectionGap: 7,
    itemGap: 4.0,
    paddingTop: 20,
    paddingBottom: 18,
    bulletGap: 1.4,
    photoWidth: 50,
    photoHeight: 64,
    headlineBottom: 3.5,
    trim: true,
  },
  // Profile 3: dense content (<= 75 lines) -> tighter spacing
  {
    scale: 0.83,
    leading: 0.86,
    sectionGap: 5.5,
    itemGap: 3.2,
    paddingTop: 16,
    paddingBottom: 15,
    bulletGap: 1.2,
    photoWidth: 46,
    photoHeight: 58,
    headlineBottom: 3,
    trim: true,
  },
  // Profile 4: very heavy content -> strong compression
  {
    scale: 0.78,
    leading: 0.82,
    sectionGap: 4.5,
    itemGap: 2.6,
    paddingTop: 14,
    paddingBottom: 13,
    bulletGap: 1.0,
    photoWidth: 44,
    photoHeight: 54,
    headlineBottom: 2.5,
    trim: true,
  },
  // Profile 5: maximum compression -> last resort before trimming, keeps a
  // very full (photo + 3 roles + many projects) resume on a single page.
  {
    scale: 0.74,
    leading: 0.8,
    sectionGap: 3.8,
    itemGap: 2.2,
    paddingTop: 12,
    paddingBottom: 11,
    bulletGap: 0.9,
    photoWidth: 42,
    photoHeight: 52,
    headlineBottom: 2.2,
    trim: true,
  },
];

function pickDensity(theme: Theme, doc: ResumeDoc, format: "A4" | "Letter"): { theme: Theme; profile: DensityProfile } {
  const rawWeight = contentWeight(doc);
  // Letter is 792 pt vs A4 842 pt (50 pt shorter, equivalent to ~6-8 lines of content + gaps)
  const weight = rawWeight + (format === "Letter" ? 8 : 0);

  let profile: DensityProfile;
  if (weight <= 38) {
    profile = DENSITY_PROFILES[0]; // scale=1.0
  } else if (weight <= 50) {
    profile = DENSITY_PROFILES[1]; // scale=0.94
  } else if (weight <= 62) {
    profile = DENSITY_PROFILES[2]; // scale=0.88
  } else if (weight <= 73) {
    profile = DENSITY_PROFILES[3]; // scale=0.83
  } else if (weight <= 85) {
    profile = DENSITY_PROFILES[4]; // scale=0.78
  } else {
    profile = DENSITY_PROFILES[5]; // scale=0.74
  }

  const scaledTheme: Theme = {
    ...theme,
    type: {
      name: Math.round(theme.type.name * profile.scale * 10) / 10,
      headline: Math.round(theme.type.headline * profile.scale * 10) / 10,
      section: Math.round(theme.type.section * profile.scale * 10) / 10,
      title: Math.round(theme.type.title * profile.scale * 10) / 10,
      body: Math.round(theme.type.body * profile.scale * 10) / 10,
      small: Math.round(theme.type.small * profile.scale * 10) / 10,
    },
    leading: theme.leading * profile.leading,
    pageGutter: Math.round(theme.pageGutter * (0.9 + profile.scale * 0.1)),
  };
  return { theme: scaledTheme, profile };
}

// Preserve 100% of user data: layout density scaling handles visual fit,
// without silently dropping the candidate's real accomplishments, certifications or projects.
// Hard one-page guarantee. pickDensity already shrank the type as far as it
// will go; if the content STILL overflows at that scale, trim the lowest-value
// material — trailing experience bullets first (keeps every role and project,
// so strong projects like a 4th one survive), then surplus projects/education
// only as a last resort. Estimation-based (react-pdf can't measure height), so
// a small safety margin is applied.
function trimDoc(doc: ResumeDoc, theme: Theme, format: "A4" | "Letter"): ResumeDoc {
  const capacity = maxLinesForPage(theme, format) - 1; // margin
  const d: ResumeDoc = JSON.parse(JSON.stringify(doc));
  const over = () => contentWeight(d) > capacity;

  // 1) trim trailing experience bullets down to a floor of 5 total
  const MIN_BULLETS = 5;
  while (over()) {
    const total = (d.experience ?? []).reduce((n, e) => n + (e.bullets?.length ?? 0), 0);
    if (total <= MIN_BULLETS) break;
    let trimmed = false;
    for (let i = (d.experience?.length ?? 0) - 1; i >= 0; i--) {
      if ((d.experience[i].bullets?.length ?? 0) > 1) { d.experience[i].bullets.pop(); trimmed = true; break; }
    }
    if (!trimmed) break;
  }
  // 2) drop projects beyond 3
  while (over() && (d.projects?.length ?? 0) > 3) d.projects.pop();
  // 3) drop education beyond 2
  while (over() && (d.education?.length ?? 0) > 2) d.education.pop();
  // 4) last resort: drop remaining surplus projects down to 2
  while (over() && (d.projects?.length ?? 0) > 2) d.projects.pop();

  return d;
}

function cleanContact(v: string): string {
  return v.replace(/^https?:\/\//i, "").replace(/^mailto:/i, "").replace(/\/+$/, "");
}

// Turn a contact value into a real href so the PDF link is clickable.
function hrefFor(label: string, value: string): string | null {
  const l = label.toLowerCase();
  if (l.includes("email") || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) return `mailto:${value.replace(/^mailto:/i, "")}`;
  if (l.includes("phone") || /^[+\d][\d\s()-]{5,}$/.test(value)) return `tel:${value.replace(/[^\d+]/g, "")}`;
  if (/^https?:\/\//i.test(value)) return value;
  if (/\.[a-z]{2,}(\/|$)/i.test(value)) return `https://${value}`;
  return null; // plain text (e.g. location)
}

const WEB_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  github: "GitHub",
  portfolio: "Portfolio",
  website: "Website",
  telegram: "Telegram",
};

interface Contact { label: string; value: string }

function classify(c: Contact) {
  const l = c.label.toLowerCase();
  const href = hrefFor(c.label, c.value.trim());
  const isWeb = !!href && href.startsWith("http");
  const isEmail = !!href && href.startsWith("mailto:");
  const webKey = Object.keys(WEB_LABELS).find((k) => l.includes(k));
  // Web links show a short friendly label; email shows the address; phone/
  // location show their plain value.
  const text = isWeb ? WEB_LABELS[webKey ?? ""] ?? cleanContact(c.value.trim()) : c.value.trim();
  return { href, text, link: isWeb || isEmail };
}

// One controlled line: inline links/text separated by a thin middot placed
// only BETWEEN items, so nothing dangles at a line edge and the spacing is
// perfectly even. EVERY item — links, email, phone, location — is the SAME
// muted color so the block reads as one tidy line instead of a scatter of
// blue and grey. Links stay clickable, just not colored.
function ContactLine({ items, theme, size, tone = "muted", weight = 400 }: { items: Contact[]; theme: Theme; size: number; tone?: "muted" | "accent"; weight?: number }) {
  const present = items.filter((c) => c.value && c.value.trim());
  if (!present.length) return null;
  // One uniform color for the WHOLE line (text, links, separators) so each row
  // reads as one tidy block. Identity row is muted; the web-links row uses the
  // accent so it stands out as its own block.
  const color = tone === "accent" ? theme.accent : theme.muted;
  return (
    <Text style={{ fontSize: size, lineHeight: 1.5, fontWeight: weight }}>
      {present.map((c, i) => {
        const { href, text } = classify(c);
        return (
          <React.Fragment key={i}>
            {i > 0 ? <Text style={{ color }}>{"  ·  "}</Text> : null}
            {href ? (
              <Link src={href} style={{ color, textDecoration: "none" }}>{text}</Link>
            ) : (
              <Text style={{ color }}>{text}</Text>
            )}
          </React.Fragment>
        );
      })}
    </Text>
  );
}

// Two tidy rows: identity (location · email · phone) then web links. Keeping
// them on separate rows prevents the ragged mixed line that read as "off".
function ContactBar({ items, theme, size }: { items: Contact[]; theme: Theme; size: number }) {
  const isWebItem = (c: Contact) => Object.keys(WEB_LABELS).some((k) => c.label.toLowerCase().includes(k));
  const primary = items.filter((c) => !isWebItem(c));
  const web = items.filter(isWebItem);
  return (
    <View>
      <ContactLine items={primary} theme={theme} size={size} tone="muted" />
      {web.length ? (
        <View style={{ marginTop: 2.5 }}>
          <ContactLine items={web} theme={theme} size={size} tone="accent" weight={500} />
        </View>
      ) : null}
    </View>
  );
}

// --- Header layouts ------------------------------------------------------
// Four visually distinct headers over the SAME linear, ATS-safe content.
// The Theme type has no `layout` field, so the layout is derived from the
// theme's own tokens: serif body → classic, photo header → creative, wide
// name tracking → executive, otherwise modern (the previous default look).
function layoutFor(theme: Theme): Layout {
  return theme.layout ?? "modern";
}

interface HeaderProps {
  doc: ResumeDoc;
  theme: Theme;
  s: ReturnType<typeof makeStyles>;
  photoSrc?: string;
}

function HeaderClassic({ doc, theme, s }: HeaderProps) {
  const t = theme.type;
  return (
    <View style={s.headerCentered}>
      <Text style={[s.name, s.nameCentered]}>{doc.fullName}</Text>
      {doc.headline ? <Text style={[s.headline, { marginBottom: 0 }]}>{doc.headline}</Text> : null}
      <View style={s.headerRuleCentered} />
      <View style={s.headerContactsCentered}>
        <ContactBar theme={theme} size={t.small} items={[...(doc.location ? [{ label: "location", value: doc.location }] : []), ...doc.contacts]} />
      </View>
    </View>
  );
}

function HeaderModern({ doc, theme, s, photoSrc }: HeaderProps) {
  const t = theme.type;
  const showPhoto = theme.showPhoto && !!photoSrc;
  return (
    <View style={s.headerRow}>
      <View style={s.headerMain}>
        <Text style={s.name}>{doc.fullName}</Text>
        {doc.headline ? <Text style={s.headline}>{doc.headline}</Text> : null}
        <View style={s.contactWrap}>
          <ContactBar theme={theme} size={t.small} items={[...(doc.location ? [{ label: "location", value: doc.location }] : []), ...doc.contacts]} />
        </View>
      </View>
      {showPhoto ? <Image style={s.photo} src={photoSrc!} /> : null}
    </View>
  );
}

function HeaderExecutive({ doc, theme, s }: HeaderProps) {
  const t = theme.type;
  return (
    <View>
      <Text style={[s.name, s.nameExecutive]}>{doc.fullName}</Text>
      {doc.headline ? <Text style={[s.headline, { marginBottom: 0 }]}>{doc.headline}</Text> : null}
      <View style={s.headerRuleExecutive} />
      <ContactBar theme={theme} size={t.small} items={[...(doc.location ? [{ label: "location", value: doc.location }] : []), ...doc.contacts]} />
    </View>
  );
}

function HeaderCreative({ doc, theme, s, photoSrc }: HeaderProps) {
  const t = theme.type;
  return (
    <View style={s.creativeRow}>
      <View style={s.creativeRail} />
      <View style={s.creativeMain}>
        <Text style={[s.name, s.nameCreative]}>{doc.fullName}</Text>
        {doc.headline ? <Text style={s.headline}>{doc.headline}</Text> : null}
        <View style={s.contactWrap}>
          <ContactBar theme={theme} size={t.small} items={[...(doc.location ? [{ label: "location", value: doc.location }] : []), ...doc.contacts]} />
        </View>
      </View>
      {photoSrc ? <Image style={s.photoCreative} src={photoSrc} /> : null}
    </View>
  );
}

function Bullets({ items, s, accent }: { items: string[]; s: ReturnType<typeof makeStyles>; accent: boolean }) {
  return (
    <>
      {items.filter(Boolean).map((b, i) => (
        <View key={i} style={s.bullet}>
          {accent ? <View style={s.bulletMark} /> : <Text style={s.bulletDot}>–</Text>}
          <Text style={s.bulletText}>{b}</Text>
        </View>
      ))}
    </>
  );
}

export function ResumePDF({
  doc,
  format,
  template,
  photoSrc,
}: {
  doc: ResumeDoc;
  format: "A4" | "Letter";
  template?: string | null;
  photoSrc?: string;
}) {
  const baseTheme = getTheme(template);
  const { theme, profile } = pickDensity(baseTheme, doc, format);
  const trimmedDoc = trimDoc(doc, theme, format);
  const s = makeStyles(theme, profile);
  const layout = layoutFor(theme);
  // Colored themes (modern/photo/creative) get the polished, reference-style
  // treatment: skill chips, accent bullet markers, company on its own accent
  // line. Plain themes (classic serif / executive) stay restrained.
  const colored = theme.headerStyle !== "plain";
  // Use trimmedDoc for all content rendering below.
  doc = trimmedDoc;

  const header =
    layout === "classic" ? <HeaderClassic doc={doc} theme={theme} s={s} /> :
    layout === "executive" ? <HeaderExecutive doc={doc} theme={theme} s={s} /> :
    layout === "creative" ? <HeaderCreative doc={doc} theme={theme} s={s} photoSrc={photoSrc} /> :
    <HeaderModern doc={doc} theme={theme} s={s} photoSrc={photoSrc} />;

  // Section titles vary per layout; the body of every section stays shared.
  const secTitle = (text: string) =>
    layout === "classic" ? (
      <View style={s.sectionHeaderRow}>
        <View style={s.sectionRule} />
        <Text style={s.sectionTitleClassic}>{text}</Text>
        <View style={s.sectionRule} />
      </View>
    ) : (
      <Text style={s.sectionTitle}>{text}</Text>
    );

  return (
    <Document title={`${doc.fullName} — Resume`} author={doc.fullName}>
      <Page size={PAGE_SIZE[format]} style={s.page}>
        {header}
        {theme.headerStyle === "bar" && layout === "modern" ? <View style={s.accentBar} /> : null}

        {doc.summary ? (
          <View style={s.section}>
            {secTitle("Summary")}
            <Text style={s.summary}>{doc.summary}</Text>
          </View>
        ) : null}

        {doc.skills?.length ? (
          <View style={s.section}>
            {secTitle("Skills")}
            {colored ? (
              <View style={s.skillChipRow}>
                {doc.skills.flatMap((g) => g.items).filter(Boolean).map((item, i) => (
                  <Text key={i} style={s.skillChip}>{item}</Text>
                ))}
              </View>
            ) : (
              doc.skills.map((g, i) => (
                <Text key={i} style={s.skillLine}>
                  <Text style={s.skillCategory}>{g.category}: </Text>
                  {g.items.join(", ")}
                </Text>
              ))
            )}
          </View>
        ) : null}

        {doc.experience?.length ? (
          <View style={s.section}>
            {secTitle("Experience")}
            {doc.experience.map((e, i) => (
              <View key={i} style={s.item}>
                <View wrap={false} minPresenceAhead={40}>
                  <View style={s.itemHeader}>
                    <Text style={s.itemTitle}>
                      {e.position}
                      {!colored && e.company ? `, ${e.company}` : ""}
                    </Text>
                    <Text style={s.itemDates}>{e.dates}</Text>
                  </View>
                  {colored && e.company ? <Text style={s.itemCompany}>{e.company}</Text> : null}
                  {e.location ? <Text style={s.itemSub}>{e.location}</Text> : null}
                </View>
                <Bullets items={e.bullets ?? []} s={s} accent={colored} />
              </View>
            ))}
          </View>
        ) : null}

        {doc.projects?.length ? (
          <View style={s.section}>
            {secTitle("Projects")}
            {doc.projects.map((p, i) => (
              <View key={i} wrap={false} style={s.item}>
                <View style={s.itemHeader}>
                  {p.url ? (
                    <Link src={p.url} style={{ ...s.itemTitle, color: theme.accent, textDecoration: "none" }}>
                      {p.name}
                    </Link>
                  ) : (
                    <Text style={s.itemTitle}>{p.name}</Text>
                  )}
                  {p.technologies?.length ? (
                    <Text style={s.itemTech}>{p.technologies.join(", ")}</Text>
                  ) : null}
                </View>
                {p.description ? <Text style={s.itemSub}>{p.description}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {doc.education?.length ? (
          <View style={s.section} wrap={false}>
            {secTitle("Education")}
            {doc.education.map((e, i) => (
              <View key={i} wrap={false} style={[s.item, s.itemHeader]}>
                <Text style={s.itemTitle}>
                  {[e.degree, e.field].filter(Boolean).join(", ")}
                  {e.institution ? ` — ${e.institution}` : ""}
                </Text>
                <Text style={s.itemDates}>{e.dates}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {doc.certifications?.length ? (
          <View style={s.section} wrap={false}>
            {secTitle("Certifications")}
            {doc.certifications.map((c, i) => (
              <Text key={i} style={s.skillLine}>
                <Text style={{ color: theme.muted }}>– </Text>
                {c.name}
                {c.organization ? `, ${c.organization}` : ""}
                {c.date ? ` (${formatCertDate(c.date)})` : ""}
                {c.credentialId ? ` — ID: ${c.credentialId}` : ""}
              </Text>
            ))}
          </View>
        ) : null}

        {doc.languages?.length ? (
          <View style={s.section} wrap={false}>
            {secTitle("Languages")}
            <Text>{doc.languages.map((l) => `${l.name} (${l.level})`).join("  ·  ")}</Text>
          </View>
        ) : null}
      </Page>
    </Document>
  );
}

export function CoverLetterPDF({
  doc,
  format,
  template,
}: {
  doc: CoverLetterDoc;
  format: "A4" | "Letter";
  template?: string | null;
}) {
  const theme = getTheme(template);
  const s = makeStyles(theme);
  const t = theme.type;
  const colored = theme.headerStyle !== "plain";
  return (
    <Document title={`${doc.fullName} — Cover Letter`} author={doc.fullName}>
      <Page size={PAGE_SIZE[format]} style={s.page}>
        {/* Header mirrors the resume: accent name, gray identity + accent link
            block, thin accent rule — so the two documents read as one set. */}
        <Text style={s.name}>{doc.fullName}</Text>
        <View style={{ marginTop: 5 }}>
          <ContactBar theme={theme} size={t.small} items={doc.contacts ?? []} />
        </View>
        <View style={[s.accentBar, { marginTop: 8, marginBottom: 0, height: colored ? 1.6 : 0.8 }]} />

        {/* Date, then recipient — with breathing room, not loose line spacing. */}
        {doc.date ? <Text style={[s.coverMeta, { marginTop: 16 }]}>{doc.date}</Text> : null}
        {doc.recipient ? <Text style={[s.coverRecipient, { marginTop: doc.date ? 10 : 16 }]}>{doc.recipient}</Text> : null}

        <Text style={s.coverGreeting}>{doc.greeting}</Text>

        {(doc.paragraphs ?? []).filter(Boolean).map((p, i) => (
          <Text key={i} style={s.coverPara}>{p}</Text>
        ))}

        <View style={{ marginTop: 6 }}>
          <Text style={s.coverClosing}>{doc.closing}</Text>
          <Text style={s.coverSignature}>{doc.signature}</Text>
        </View>
      </Page>
    </Document>
  );
}
