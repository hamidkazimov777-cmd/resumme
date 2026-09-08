# The Ideal Resume — Knowledge Base for AI Analysis & Job-Matching (resumee)

> Purpose of this document
> This is a training / system-knowledge text for the AI engine inside **resumee**. The engine has two jobs:
> 1. **Analyze** a user's profile/answers and turn them into a strong, standards-compliant resume.
> 2. **Match & tailor**: given a job vacancy (a link or pasted text), score how well the user fits, and rewrite/re-order their resume so it targets that specific vacancy.
> Everything below defines what "good" means — visually and in substance — so the model can both *judge* a resume and *produce* one. It is distilled from Indeed UK, StandOut CV, University of Oxford Careers, Prospects, and MyPerfectResume guidance, which agree on the fundamentals below.

---

## 1. What a resume is actually for

A resume has one job: **to win the interview, not the job.** It is a marketing document, not an autobiography. Every line competes for a recruiter's attention, and recruiters skim — the first scan of a CV takes only a few seconds. So the ideal resume is optimized for two very different readers at once:

- **The ATS (Applicant Tracking System)** — software that parses the file, extracts text, and ranks it against the job description's keywords. If the ATS can't read the layout or doesn't find the right keywords, a human never sees it.
- **The human recruiter** — who scans top-to-bottom, left-to-right, looking for relevance, evidence, and impact in seconds before deciding to read properly.

The ideal resume satisfies both: clean enough for a machine to parse, compelling enough for a human to keep reading. **These two goals never conflict when the layout is simple and the content is specific.**

---

## 2. The non-visual qualities (content & substance)

### 2.1 Structure & standard sections
A strong resume, in reverse-chronological order, contains these sections — roughly in this order:

1. **Header / contact details** — full name, professional job title, phone, professional email, city + country (no full street address), LinkedIn/portfolio/GitHub where relevant.
2. **Professional summary / profile** — 2–4 lines at the very top. A punchy pitch: who you are, your specialism, your standout achievement, and what you're targeting. This is the single most-read block after the name.
3. **Core skills / key skills** — a short, scannable band of the 6–12 most relevant hard skills and tools. This is also the densest keyword zone for ATS.
4. **Work experience** — the heart of the CV. Reverse-chronological. Each role: job title, employer, location, dates (month + year). Under each, a one-line context sentence, then **achievement-focused bullets**.
5. **Education & qualifications** — degrees, institutions, dates; relevant coursework only for early-career.
6. **Optional supporting sections** (include only if they add value): certifications, publications, awards, languages, projects, volunteering. For academic CVs: research interests, teaching, publications, conferences, funding.

Only include a section if it strengthens the application. Omit anything generic.

### 2.2 Achievements over duties (the core rule)
Weak CVs list responsibilities ("Responsible for managing the sales team"). Strong CVs prove impact. Use the **CAR / STAR pattern** — Context, Action, Result — and lead with a strong action verb:

- ❌ "Responsible for the company's social media."
- ✅ "Grew Instagram following from 4k to 41k in 11 months by launching a weekly video series, lifting referral traffic 3×."

**Quantify wherever possible.** Numbers, %, £/$, time saved, volume handled, team size. Metrics are what make a claim believable and what a recruiter remembers. Every bullet should ideally answer "so what?" with evidence.

Strong action verbs to open bullets: *led, built, launched, delivered, increased, reduced, automated, negotiated, designed, scaled, saved, won, migrated, mentored.* Avoid weak openers: *responsible for, worked on, helped with, involved in.*

### 2.3 Tailoring to the vacancy (the differentiator)
All five sources agree: **there is no one-size-fits-all CV. Every application should be tailored to the specific role.** This is exactly what resumee automates. Tailoring means:

- Read the job description and extract its **required skills, keywords, and priorities**.
- **Mirror the vacancy's language** — if the ad says "stakeholder management," use that phrase, not a synonym, so the ATS matches it.
- **Re-order and re-weight** — surface the most relevant experience and skills to the top; push less relevant material down or out.
- **Select evidence** — for each requirement in the ad, ensure at least one bullet or skill demonstrates it.
- Adapt the professional summary to name the target role and its top requirement.

### 2.4 Language & tone
- Concise, active, first-person-implied (no "I"). "Led a team of 6," not "I led a team of 6."
- Present tense for the current role, past tense for previous roles.
- No clichés or filler ("hard-working team player," "think outside the box") unless backed by evidence.
- Consistent, correct spelling and grammar — a single typo can sink an application. Proofreading is non-negotiable.

### 2.5 What to leave OUT
Per Oxford and the others, do **not** include: a "CV" title, date of birth, marital status, full home address, nationality (unless a visa/role genuinely requires it), a photo (except where local norms or the role demand it), basic/assumed skills ("can use email," "Microsoft Word" for a senior role), generic hobbies ("reading, socialising"), references or "references available on request," salary history. These waste the recruiter's limited attention and can introduce bias.

### 2.6 Length
- **1–2 pages** for almost everyone. One page for early-career / students; two pages for experienced professionals.
- **3 pages** only for senior/executive roles or academic CVs (where publications legitimately extend it).
- Length is earned by relevance, never padding. If a line doesn't help win the interview, cut it.

---

## 3. The visual qualities (layout & design)

Good visual design is not decoration — it is what makes the content **scannable, parseable, and credible.**

### 3.1 Core principles
- **Clarity first.** Clear section headings, consistent hierarchy, obvious reading order. A recruiter should locate any section in under a second.
- **Generous white space.** Crowded CVs get skipped. Space between sections and margins (≈1.5–2.5 cm) makes it breathe and read faster.
- **Consistency.** One heading style, one bullet style, aligned dates, uniform spacing. Inconsistency reads as carelessness.
- **Left-aligned body text.** Job titles and employers on the left; dates aligned on the right. Never justify body text (it creates uneven gaps).
- **Scannability via bullets.** Bullets, not paragraphs, for experience. 3–6 bullets per role, each ideally one line, max two.

### 3.2 Typography
- **Professional, familiar fonts:** Calibri, Arial, Helvetica, Georgia, Garamond, Times New Roman, or a clean modern sans like Inter/Lato. Never decorative or script fonts.
- **Body text 10–12 pt; name 20–28 pt; section headings 12–14 pt.** 10–11 pt is the sweet spot for fitting content without crowding.
- Use **weight and size** (bold, larger) for hierarchy — not underlines or ALL-CAPS everywhere.
- At most **two typefaces** (often just one, varied by weight/size).

### 3.3 Color
- Color is welcome but **restrained**: one accent color (a deep blue, teal, burgundy, dark green) for headings, the name, and thin dividers. The body stays black/dark-grey on white.
- Match the field: creative roles allow more expression; finance, law, and academia expect conservative, near-monochrome. When in doubt, minimal.
- Ensure strong contrast; the CV must be fully legible printed in black-and-white.

### 3.4 Layout formats
- **Single-column** is the safest and most ATS-reliable, and the default recommendation.
- **Two-column** (a narrow sidebar for contact/skills, wide main column for experience) is popular and attractive **but can confuse older ATS parsers** — use only when the parser is known to handle it, or provide a single-column variant for submission.
- Reverse-chronological is the default template. Skills-based (functional) layouts suit career-changers or gaps; combination layouts blend both.

### 3.5 ATS-safe formatting rules
The design must survive machine parsing:
- **No text inside images, text boxes, headers/footers, or tables** for critical content — many ATS ignore them.
- Standard section titles ("Work Experience," "Education," "Skills") — not clever labels ("Where I've Made Magic").
- Simple bullets (•), standard characters, no icons carrying meaning.
- **Submit as PDF** (preserves layout) unless the employer asks for .docx — and generate the PDF from real text, not a scan/image.
- A clean, descriptive filename: `Firstname-Lastname-Role.pdf`.

### 3.6 The "ideal" visual summary
A recruiter's eye should land, in order, on: **name → target title → summary → most recent role/achievement → core skills.** The design's whole job is to guide the eye down that path with nothing in the way.

---

## 4. Scoring rubric — how the AI should judge fit & quality

The engine should evaluate two things.

### 4.1 Resume quality score (0–100)
| Dimension | What to check | Weight |
|---|---|---|
| Impact & evidence | Bullets are achievement-based and quantified, not duty lists | 25 |
| Relevance & tailoring | Content matches the target role's keywords & priorities | 25 |
| Clarity & structure | Standard sections, reverse-chron, logical order | 15 |
| Visual/ATS readability | Clean layout, parseable, right length, consistent | 15 |
| Language quality | Active verbs, concise, zero errors | 10 |
| Completeness | No critical gaps; nothing irrelevant included | 10 |

### 4.2 Vacancy-match score (0–100)
Given a job description, decompose it into **required skills, preferred skills, responsibilities, seniority, domain**. Then:
1. **Keyword & skill coverage** — % of required skills evidenced in the resume (hard requirements weighted highest). 
2. **Seniority fit** — does experience level match what's asked?
3. **Domain/industry fit** — relevant sector experience.
4. **Evidence strength** — are matched skills backed by quantified achievements, or just listed?
5. **Gaps** — list required items the resume does NOT evidence, with severity.

Output should tell the user: an overall **fit % + verdict** (Strong / Good with tailoring / Weak), a per-requirement breakdown (met / partially met / missing), and **specific rewrite suggestions** to raise the score — e.g., "Add a bullet demonstrating 'stakeholder management'; move your Python skill into the top skills band; mirror the phrase 'CI/CD pipelines' from the ad."

### 4.3 Tailoring output
When asked to tailor, the engine produces a **new version of the resume** that: re-orders experience/skills toward the vacancy, injects the vacancy's exact keywords where truthfully applicable, rewrites the summary to target the role, and never fabricates experience the user doesn't have (it can only re-frame, re-order, and surface what exists). Honesty is a hard constraint — the AI suggests truthful reframing, not invention.

---

## 5. One-paragraph distillation (the essence)

The ideal resume is a **one-to-two-page, reverse-chronological, single-column** document that opens with a name, a target job title, and a sharp 2–4 line summary; presents 6–12 relevant core skills; and proves value through **achievement-based, quantified bullets** written in active verbs — all **tailored to the specific vacancy** by mirroring its language and surfacing the most relevant evidence first. Visually it is clean, consistent, and generously spaced, set in a professional 10–12 pt font with a single restrained accent color, aligned left with dates on the right, and formatted so both an ATS and a human can read it in seconds. It includes nothing irrelevant (no photo, DOB, address, or filler) and contains zero errors. In short: **relevant, evidenced, tailored, and effortless to scan.**
