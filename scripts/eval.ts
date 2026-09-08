/**
 * Resume-scoring eval harness.
 *
 * Runs the real jobAnalysisPrompt against fixed (profile + vacancy) fixtures and
 * checks the AI's scoring output against expectations, so prompt/knowledge-base
 * edits can't silently regress scoring quality.
 *
 * Usage:
 *   EVAL_PROVIDER=anthropic EVAL_MODEL=claude-sonnet-5 EVAL_API_KEY=sk-... \
 *     npm run eval
 *
 * EVAL_PROVIDER is one of the ids in src/lib/constants.ts (openrouter,
 * tokenrouter, anthropic, moonshot). EVAL_BASE_URL optionally overrides the
 * provider's default base URL. If no API key is set, the harness skips (exit 0)
 * so it never breaks CI when unconfigured.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { PROVIDERS, type ProviderId } from "../src/lib/constants";
import { chat, parseJson } from "../src/lib/ai/client";
import { jobAnalysisPrompt } from "../src/lib/prompts/tasks";
import type { JobAnalysis } from "../src/lib/types";

interface Fixture {
  name: string;
  profile: unknown;
  vacancy: string;
  expect: {
    verdictOneOf?: string[];
    minMatchScore?: number;
    maxMatchScore?: number;
    mustGaps?: string[];
    qualityScoreRequired?: boolean;
  };
}

const FIXDIR = join(process.cwd(), "evals/fixtures");
const RESET = "\x1b[0m", RED = "\x1b[31m", GREEN = "\x1b[32m", DIM = "\x1b[2m";

function loadFixtures(): Fixture[] {
  return readdirSync(FIXDIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(FIXDIR, f), "utf8")) as Fixture);
}

/** Check one analysis against a fixture's expectations. Returns failure lines. */
function checkExpectations(a: JobAnalysis, ex: Fixture["expect"]): string[] {
  const fails: string[] = [];
  const score = a.matchScore ?? -1;

  if (ex.minMatchScore != null && score < ex.minMatchScore)
    fails.push(`matchScore ${score} < expected min ${ex.minMatchScore}`);
  if (ex.maxMatchScore != null && score > ex.maxMatchScore)
    fails.push(`matchScore ${score} > expected max ${ex.maxMatchScore}`);

  if (ex.verdictOneOf && !ex.verdictOneOf.includes(a.verdict ?? ""))
    fails.push(`verdict "${a.verdict}" not in ${JSON.stringify(ex.verdictOneOf)}`);

  if (ex.qualityScoreRequired) {
    const t = a.qualityScore?.total;
    if (typeof t !== "number" || t < 0 || t > 100)
      fails.push(`qualityScore.total missing or out of range (got ${t})`);
  }

  if (ex.mustGaps?.length) {
    const haystack = [
      ...(a.gaps ?? []),
      ...(a.weak ?? []),
      ...(a.requirementBreakdown ?? [])
        .filter((r) => r.status !== "met")
        .map((r) => r.requirement),
    ]
      .join(" | ")
      .toLowerCase();
    for (const g of ex.mustGaps) {
      if (!haystack.includes(g.toLowerCase())) fails.push(`expected gap "${g}" not surfaced`);
    }
  }

  return fails;
}

async function main() {
  const providerId = (process.env.EVAL_PROVIDER ?? "anthropic") as ProviderId;
  const apiKey = process.env.EVAL_API_KEY;
  const model = process.env.EVAL_MODEL;

  if (!apiKey || !model) {
    console.log(`${DIM}eval skipped — set EVAL_API_KEY and EVAL_MODEL (and optionally EVAL_PROVIDER) to run.${RESET}`);
    process.exit(0);
  }
  const provider = PROVIDERS[providerId];
  if (!provider) {
    console.error(`Unknown EVAL_PROVIDER "${providerId}". Options: ${Object.keys(PROVIDERS).join(", ")}`);
    process.exit(2);
  }
  const baseUrl = process.env.EVAL_BASE_URL ?? provider.baseUrl;

  const fixtures = loadFixtures();
  console.log(`Running ${fixtures.length} eval fixture(s) against ${providerId}/${model}\n`);

  let failed = 0;
  for (const fx of fixtures) {
    const { system, prompt } = jobAnalysisPrompt(fx.vacancy, JSON.stringify(fx.profile));
    let fails: string[] = [];
    try {
      const { text } = await chat({ provider: providerId, baseUrl, apiKey, model, system, prompt, json: true, maxTokens: 8000 });
      const analysis = parseJson<JobAnalysis>(text);
      fails = checkExpectations(analysis, fx.expect);
      if (!fails.length) {
        console.log(`${GREEN}PASS${RESET} ${fx.name} ${DIM}(match ${analysis.matchScore}, verdict ${analysis.verdict}, quality ${analysis.qualityScore?.total})${RESET}`);
      }
    } catch (e) {
      fails = [`threw: ${(e as Error).message}`];
    }
    if (fails.length) {
      failed++;
      console.log(`${RED}FAIL${RESET} ${fx.name}`);
      for (const f of fails) console.log(`     ${RED}- ${f}${RESET}`);
    }
  }

  console.log(`\n${failed ? RED : GREEN}${fixtures.length - failed}/${fixtures.length} passed${RESET}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
