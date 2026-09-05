import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ResumeDoc, CoverLetterDoc } from "@/lib/types";

// ATS-friendly layout: single linear column, standard headings, real text,
// simple "-" bullets, no tables/graphics. Selectable + machine-parseable.

const PAGE_SIZE = { A4: "A4", Letter: "LETTER" } as const;

const s = StyleSheet.create({
  page: { paddingVertical: 30, paddingHorizontal: 40, fontSize: 9.4, lineHeight: 1.3, color: "#111", fontFamily: "Helvetica" },
  name: { fontSize: 18, fontFamily: "Helvetica-Bold", lineHeight: 1.15, marginBottom: 3 },
  headline: { fontSize: 10.5, color: "#333", marginBottom: 5 },
  contactRow: { fontSize: 8.5, color: "#444", marginBottom: 7 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 1, marginTop: 8, marginBottom: 3, borderBottom: "1px solid #ccc", paddingBottom: 2 },
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

// Drop the scheme so long URLs read cleanly and don't dominate the header.
function cleanContact(v: string): string {
  return v.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

function Contacts({ items }: { items: { label: string; value: string }[] }) {
  return (
    <Text style={s.contactRow}>
      {items.map((c) => cleanContact(c.value)).filter(Boolean).join("  ·  ")}
    </Text>
  );
}

function Bullets({ items }: { items: string[] }) {
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

export function ResumePDF({ doc, format }: { doc: ResumeDoc; format: "A4" | "Letter" }) {
  return (
    <Document title={`${doc.fullName} — Resume`} author={doc.fullName}>
      <Page size={PAGE_SIZE[format]} style={s.page}>
        <Text style={s.name}>{doc.fullName}</Text>
        {doc.headline ? <Text style={s.headline}>{doc.headline}</Text> : null}
        <Contacts items={[...(doc.location ? [{ label: "loc", value: doc.location }] : []), ...doc.contacts]} />

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
              // Allow the block to break across pages (fills the page instead of
              // leaving a gap), but keep the header + first line together and
              // never orphan a header at the very bottom of a page.
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
                <Bullets items={e.bullets ?? []} />
              </View>
            ))}
          </View>
        ) : null}

        {doc.projects?.length ? (
          <View>
            <Text style={s.sectionTitle}>Projects</Text>
            {doc.projects.map((p, i) => (
              // Compact: name + description on one flow, tech folded into a
              // single trailing line. URL omitted here (links live in contacts)
              // to keep the resume to a single page.
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

export function CoverLetterPDF({ doc, format }: { doc: CoverLetterDoc; format: "A4" | "Letter" }) {
  return (
    <Document title={`${doc.fullName} — Cover Letter`} author={doc.fullName}>
      <Page size={PAGE_SIZE[format]} style={s.page}>
        <Text style={s.name}>{doc.fullName}</Text>
        <Contacts items={doc.contacts ?? []} />
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
