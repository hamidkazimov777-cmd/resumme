// ---------------------------------------------------------------------------
// GOLD-STANDARD FEW-SHOT EXAMPLES
//
// These are the reference resumes from `cv/examples/` (the PNG gold standards)
// digitized into our own `ResumeDoc` schema. They are shown to the model as
// worked examples so it copies the DENSITY, METRIC-LOADING, BULLET LENGTH and
// TONE of a genuinely good resume — not just the rules described in prose.
//
// They are illustrative only. The model must NEVER copy any fact from them into
// a real candidate's resume; they teach form, not content.
// ---------------------------------------------------------------------------

import type { ResumeDoc } from "@/lib/types";

// Example 1 — Senior Backend Engineer (single-column, achievement-first).
const SOFTWARE_ENGINEER: ResumeDoc = {
  fullName: "Daniel R. Okonkwo",
  headline: "Senior Backend Engineer",
  location: "Berlin, Germany",
  contacts: [
    { label: "Email", value: "d.okonkwo@email.com" },
    { label: "Phone", value: "+49 30 000 0000" },
    { label: "LinkedIn", value: "linkedin.com/in/danokonkwo" },
    { label: "GitHub", value: "github.com/danok" },
  ],
  summary:
    "Backend engineer with 7+ years building high-throughput distributed systems in Python and Go. Cut infrastructure costs 38% and scaled a payments platform to 12M daily transactions.",
  skills: [
    { category: "Core", items: ["Python", "Go", "PostgreSQL", "Kafka", "Kubernetes", "AWS"] },
    { category: "Platform", items: ["Microservices", "CI/CD", "Redis", "gRPC", "Terraform", "Observability"] },
  ],
  experience: [
    {
      company: "FinLayer GmbH",
      position: "Senior Backend Engineer",
      dates: "Mar 2021 – Present",
      bullets: [
        "Re-architected the settlement service into event-driven microservices, cutting p99 latency from 840ms to 190ms.",
        "Reduced cloud spend 38% (≈€420k/yr) by right-sizing workloads and introducing autoscaling on Kubernetes.",
        "Led a 5-engineer team delivering a fraud-scoring pipeline that blocked €2.1M in fraudulent volume in year one.",
        "Raised test coverage from 54% to 89% and cut deployment failures 70% via a new CI/CD gate.",
      ],
    },
    {
      company: "Trivio Labs",
      position: "Backend Engineer",
      dates: "Jun 2018 – Feb 2021",
      bullets: [
        "Built a real-time ingestion pipeline on Kafka handling 40k events/sec with 99.98% uptime.",
        "Migrated a monolith to Go microservices, improving throughput 3× and halving infra footprint.",
        "Mentored 3 junior engineers, two promoted within 18 months.",
      ],
    },
    {
      company: "Nordwave Systems",
      position: "Software Developer",
      dates: "Aug 2016 – May 2018",
      bullets: [
        "Developed REST APIs in Python/Django serving 500k monthly active users.",
        "Automated nightly reporting, saving the ops team ~15 hours/week.",
      ],
    },
  ],
  education: [
    { institution: "Technical University of Munich", degree: "B.Sc.", field: "Computer Science", dates: "2012 – 2016" },
  ],
  certifications: [
    { name: "AWS Certified Solutions Architect – Professional", date: "2023" },
    { name: "Certified Kubernetes Administrator (CKA)", date: "2022" },
  ],
  projects: [],
  languages: [
    { name: "English", level: "Fluent" },
    { name: "German", level: "Fluent" },
    { name: "Igbo", level: "Native" },
  ],
  includePhoto: false,
};

// Example 2 — Marketing Manager (two-column sidebar, budget/scope-first).
const MARKETING_MANAGER: ResumeDoc = {
  fullName: "Sofia Marchetti",
  headline: "Marketing Manager",
  location: "Milan, Italy",
  contacts: [
    { label: "Email", value: "sofia.march@email.com" },
    { label: "Phone", value: "+39 02 000 000" },
    { label: "LinkedIn", value: "linkedin.com/in/sofiamarchetti" },
  ],
  summary:
    "Marketing manager with 8 years scaling B2C and B2B brands across EMEA. Led campaigns that grew qualified leads 210% and managed budgets up to €1.4M, with a track record of building high-performing teams.",
  skills: [
    {
      category: "Core Skills",
      items: [
        "Brand Strategy",
        "Performance Marketing",
        "SEO / SEM",
        "Content Marketing",
        "Marketing Analytics (GA4)",
        "Team Leadership",
        "Budget Management",
        "Marketing Automation (HubSpot)",
        "Stakeholder Management",
      ],
    },
  ],
  experience: [
    {
      company: "Lume Cosmetics",
      position: "Marketing Manager",
      dates: "Feb 2021 – Present",
      bullets: [
        "Grew online revenue 74% in two years by restructuring the paid-media mix and launching a loyalty programme.",
        "Increased qualified leads 210% through an SEO + content strategy ranking 40+ keywords on page one.",
        "Managed a €1.4M annual budget and a team of 6, improving marketing ROI from 3.1× to 5.4×.",
        "Cut customer acquisition cost 32% by shifting spend to high-intent channels using GA4 attribution.",
      ],
    },
    {
      company: "Vento Group",
      position: "Digital Marketing Specialist",
      dates: "Mar 2018 – Jan 2021",
      bullets: [
        "Launched the company's first marketing-automation funnel in HubSpot, lifting email conversion 47%.",
        "Ran paid social campaigns across 4 markets, delivering a 4.2× return on ad spend.",
        "Built dashboards that became the leadership team's weekly source of truth.",
      ],
    },
    {
      company: "Aria Media",
      position: "Marketing Assistant",
      dates: "Sep 2016 – Feb 2018",
      bullets: ["Coordinated 20+ events and supported campaigns that grew the newsletter list from 8k to 26k."],
    },
  ],
  education: [
    { institution: "Bocconi University, Milan", degree: "M.Sc.", field: "Marketing Management", dates: "2014 – 2016" },
    { institution: "University of Bologna", degree: "B.A.", field: "Business & Communication", dates: "2011 – 2014" },
  ],
  certifications: [
    { name: "Google Analytics 4 Certified" },
    { name: "HubSpot Inbound Marketing" },
    { name: "Meta Blueprint Certified" },
  ],
  projects: [],
  languages: [
    { name: "Italian", level: "Native" },
    { name: "English", level: "Fluent (C2)" },
    { name: "Spanish", level: "Professional (B2)" },
  ],
  includePhoto: false,
};

export const GOLD_STANDARD_RESUMES: ResumeDoc[] = [SOFTWARE_ENGINEER, MARKETING_MANAGER];

/**
 * A compact few-shot block for the resume-generation prompt. Shows the model
 * what excellent output looks like in our exact schema — note how every bullet
 * leads with an action verb + a number, summaries are 2 sentences, and bullet
 * counts stay tight. Content is illustrative and must never be copied.
 */
export function fewShotResumeBlock(): string {
  return [
    "GOLD-STANDARD EXAMPLES (form only — never copy any fact from these):",
    "Study how each bullet opens with a strong verb and carries a concrete metric, how summaries are exactly two sentences, and how bullet counts stay tight per role.",
    ...GOLD_STANDARD_RESUMES.map(
      (r, i) => `--- EXAMPLE ${i + 1} (${r.headline}) ---\n${JSON.stringify(r)}`
    ),
  ].join("\n\n");
}
