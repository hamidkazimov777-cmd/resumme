import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { ResumeDoc, CoverLetterDoc } from "@/lib/types";
import { getTheme, type Theme } from "@/lib/design/templates";

// ATS-friendly layout: single linear column, standard headings, real text,
// simple "-" bullets, no tables/graphics. A "template" is a THEME (accent
// color + header layout + optional photo) applied over this same structure —
// parsing stays intact regardless of template.

const PAGE_SIZE = { A4: "A4", Letter: "LETTER" } as const;

// Styles depend on the theme's accent, so build them per-render.
function makeStyles(theme: Theme) {
  const titleColor = theme.headerStyle === "plain" ? "#111" : theme.accent;
  return StyleSheet.create({
    page: { paddingVertical: 30, paddingHorizontal: 40, fontSize: 9.4, lineHeight: 1.3, color: "#111", fontFamily: "Helvetica" },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 14 },
    headerMain: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
    accentBar: { height: 3, backgroundColor: theme.accent, marginBottom: 8, marginTop: 2 },
    name: { fontSize: 18, fontFamily: "Helvetica-Bold", lineHeight: 1.15, marginBottom: 3, color: theme.headerStyle === "plain" ? "#111" : theme.accent },
    headline: { fontSize: 10.5, color: "#333", marginBottom: 5 },
    contactRow: { fontSize: 8.5, color: "#444", marginBottom: 7 },
    photo: { width: 60, height: 80, objectFit: "cover", borderRadius: 2, flexShrink: 0 },
    sectionTitle: {
      fontSize: 10, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1,
      marginTop: 8, marginBottom: 3, color: titleColor,
      ...(theme.rule ? { borderBottom: `1px solid ${theme.headerStyle === "plain" ? "#ccc" : theme.accent}`, paddingBottom: 2 } : {}),
    },
    summary: { marginBottom: 2 },
    itemHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
    itemTitle: { fontFamily: "Helvetica-Bold", fontSize: 10 },
    itemSub: { fontSize: 9, color: "#555" },
    itemDates: { fontSize: 9, color: "#555" },
    bullet: { flexDirection: "row", marginTop: 2, paddingLeft: 4 },
    bulletDot: { width: 10 },
    bulletText: { flex: 1 },
    skillLine: { marginTop: 2 },
    para: { marginBottom: 8 },
  });
}

function cleanContact(v: string): string {
  return v.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

type StyleObj = ReturnType<typeof makeStyles>[keyof ReturnType<typeof makeStyles>];

function Contacts({ items, style }: { items: { label: string; value: string }[]; style: StyleObj }) {
  return <Text style={style}>{items.map((c) => cleanContact(c.value)).filter(Boolean).join("  ·  ")}</Text>;
}

function Bullets({ items, s }: { items: string[]; s: ReturnType<typeof makeStyles> }) {
  return (
    <>
      {items.filter(Boolean).map((b, i) => (
        <View key={i} style={s.bullet}>
          <Text style={s.bulletDot}>-</Text>
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
  const theme = getTheme(template);
  const s = makeStyles(theme);
  const showPhoto = theme.showPhoto && !!photoSrc;

  const header = (
    <View style={s.headerRow}>
      <View style={s.headerMain}>
        <Text style={s.name}>{doc.fullName}</Text>
        {doc.headline ? <Text style={s.headline}>{doc.headline}</Text> : null}
        <Contacts style={s.contactRow} items={[...(doc.location ? [{ label: "loc", value: doc.location }] : []), ...doc.contacts]} />
      </View>
      {showPhoto ? <Image style={s.photo} src={photoSrc!} /> : null}
    </View>
  );

  return (
    <Document title={`${doc.fullName} — Resume`} author={doc.fullName}>
      <Page size={PAGE_SIZE[format]} style={s.page}>
        {header}
        {theme.headerStyle === "bar" ? <View style={s.accentBar} /> : null}

        {doc.summary ? (
          <View>
            <Text style={s.sectionTitle}>Summary</Text>
            <Text style={s.summary}>{doc.summary}</Text>
          </View>
        ) : null}

        {doc.skills?.length ? (
          <View>
            <Text style={s.sectionTitle}>Skills</Text>
            {doc.skills.map((g, i) => (
              <Text key={i} style={s.skillLine}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{g.category}: </Text>
                {g.items.join(", ")}
              </Text>
            ))}
          </View>
        ) : null}

        {doc.experience?.length ? (
          <View>
            <Text style={s.sectionTitle}>Experience</Text>
            {doc.experience.map((e, i) => (
              <View key={i}>
                <View wrap={false} minPresenceAhead={36}>
                  <View style={s.itemHeader}>
                    <Text style={s.itemTitle}>
                      {e.position}
                      {e.company ? `, ${e.company}` : ""}
                    </Text>
                    <Text style={s.itemDates}>{e.dates}</Text>
                  </View>
                  {e.location ? <Text style={s.itemSub}>{e.location}</Text> : null}
                </View>
                <Bullets items={e.bullets ?? []} s={s} />
              </View>
            ))}
          </View>
        ) : null}

        {doc.projects?.length ? (
          <View>
            <Text style={s.sectionTitle}>Projects</Text>
            {doc.projects.map((p, i) => (
              <View key={i} wrap={false} style={{ marginTop: 3 }}>
                <Text>
                  <Text style={s.itemTitle}>{p.name}</Text>
                  {p.description ? <Text> — {p.description}</Text> : null}
                </Text>
                {p.technologies?.length ? <Text style={s.itemSub}>Tech: {p.technologies.join(", ")}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {doc.education?.length ? (
          <View>
            <Text style={s.sectionTitle}>Education</Text>
            {doc.education.map((e, i) => (
              <View key={i} style={s.itemHeader}>
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
          <View>
            <Text style={s.sectionTitle}>Certifications</Text>
            {doc.certifications.map((c, i) => (
              <Text key={i} style={s.skillLine}>
                - {c.name}
                {c.organization ? `, ${c.organization}` : ""}
                {c.date ? ` (${c.date})` : ""}
                {c.credentialId ? ` — ID: ${c.credentialId}` : ""}
              </Text>
            ))}
          </View>
        ) : null}

        {doc.languages?.length ? (
          <View>
            <Text style={s.sectionTitle}>Languages</Text>
            <Text>{doc.languages.map((l) => `${l.name} (${l.level})`).join(", ")}</Text>
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
  return (
    <Document title={`${doc.fullName} — Cover Letter`} author={doc.fullName}>
      <Page size={PAGE_SIZE[format]} style={s.page}>
        <Text style={s.name}>{doc.fullName}</Text>
        <Contacts style={s.contactRow} items={doc.contacts ?? []} />
        {theme.headerStyle === "bar" ? <View style={s.accentBar} /> : null}
        {doc.date ? <Text style={s.para}>{doc.date}</Text> : null}
        {doc.recipient ? <Text style={s.para}>{doc.recipient}</Text> : null}
        <Text style={s.para}>{doc.greeting}</Text>
        {(doc.paragraphs ?? []).map((p, i) => (
          <Text key={i} style={s.para}>
            {p}
          </Text>
        ))}
        <Text>{doc.closing}</Text>
        <Text style={{ fontFamily: "Helvetica-Bold", marginTop: 4 }}>{doc.signature}</Text>
      </Page>
    </Document>
  );
}
