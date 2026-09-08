import { PROVIDERS, type ProviderId } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Provider abstraction layer.
//
// Two wire protocols are supported:
//   - "openai"    : OpenAI-compatible /chat/completions + /models
//   - "anthropic" : native Messages API + /models
//
// The rest of the app only talks to `listModels` and `chat` — swapping or
// adding a provider is a matter of extending PROVIDERS + this switch.
// ---------------------------------------------------------------------------

export interface ModelInfo {
  id: string;
  label: string;
}

export interface ChatOptions {
  provider: ProviderId;
  baseUrl: string;
  apiKey: string;
  model: string;
  system?: string;
  prompt: string;
  /** Ask the model to return strict JSON. */
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResult {
  text: string;
  raw: unknown;
}

const ANTHROPIC_VERSION = "2023-06-01";

export async function listModels(
  provider: ProviderId,
  baseUrl: string,
  apiKey: string
): Promise<ModelInfo[]> {
  const kind = PROVIDERS[provider].kind;
  const url = `${trim(baseUrl)}/models`;
  const headers = authHeaders(kind, apiKey);

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Model list failed (${res.status}): ${await safeText(res)}`);
  }
  const data = (await res.json()) as { data?: Array<{ id: string }> };
  const list = data.data ?? [];
  return list
    .map((m) => ({ id: m.id, label: m.id }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export async function chat(opts: ChatOptions): Promise<ChatResult> {
  const kind = PROVIDERS[opts.provider].kind;
  return kind === "anthropic" ? chatAnthropic(opts) : chatOpenAI(opts);
}

async function chatOpenAI(opts: ChatOptions): Promise<ChatResult> {
  const url = `${trim(opts.baseUrl)}/chat/completions`;
  const body: Record<string, unknown> = {
    model: opts.model,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.4,
    messages: [
      ...(opts.system ? [{ role: "system", content: opts.system }] : []),
      { role: "user", content: opts.prompt },
    ],
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(url, {
    method: "POST",
    headers: { ...authHeaders("openai", opts.apiKey), "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Chat failed (${res.status}): ${await safeText(res)}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return { text: data.choices?.[0]?.message?.content ?? "", raw: data };
}

async function chatAnthropic(opts: ChatOptions): Promise<ChatResult> {
  const url = `${trim(opts.baseUrl)}/messages`;
  const system = [
    opts.system,
    opts.json ? "Respond ONLY with a single valid JSON object. No prose, no markdown fences." : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // Anthropic limits max_tokens to 8192 on Sonnet models (4096 on Opus).
  const maxTokens = Math.min(opts.maxTokens ?? 4096, 8192);

  const res = await fetch(url, {
    method: "POST",
    headers: { ...authHeaders("anthropic", opts.apiKey), "content-type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: maxTokens,
      temperature: opts.temperature ?? 0.4,
      ...(system ? { system } : {}),
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Chat failed (${res.status}): ${await safeText(res)}`);
  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  const text = (data.content ?? []).map((c) => c.text ?? "").join("");
  return { text, raw: data };
}

function authHeaders(kind: "openai" | "anthropic", apiKey: string): Record<string, string> {
  if (kind === "anthropic") {
    return { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION };
  }
  return { authorization: `Bearer ${apiKey}` };
}

/** Parse a JSON object out of a model response, tolerating markdown fences and unescaped characters. */
export function parseJson<T = unknown>(text: string): T {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Fall back to first {...} or [...] block.
    const match = cleaned.match(/[{[][\s\S]*[}\]]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        // Fix unescaped control characters inside JSON strings (e.g. raw newlines in multi-line strings)
        const sanitized = match[0].replace(/[\u0000-\u001F]+/g, (match) => {
          if (match === "\n") return "\\n";
          if (match === "\r") return "\\r";
          if (match === "\t") return "\\t";
          return "";
        });
        try {
          return JSON.parse(sanitized) as T;
        } catch {
          // fall through
        }
      }
    }
    throw new Error("Model did not return valid JSON.");
  }
}

function trim(url: string) {
  return url.replace(/\/+$/, "");
}

async function safeText(res: Response) {
  try {
    return (await res.text()).slice(0, 500);
  } catch {
    return "<no body>";
  }
}
