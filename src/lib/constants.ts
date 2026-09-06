export type ProviderId = "openrouter" | "tokenrouter" | "anthropic" | "moonshot";

export interface ProviderDef {
  id: ProviderId;
  label: string;
  baseUrl: string;
  // How this provider exposes model listing + chat. All four here speak an
  // OpenAI-compatible surface EXCEPT Anthropic (native Messages API).
  kind: "openai" | "anthropic";
  docsHint: string;
}

export const PROVIDERS: Record<ProviderId, ProviderDef> = {
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    kind: "openai",
    docsHint: "OpenAI-compatible. Models via GET /models.",
  },
  tokenrouter: {
    id: "tokenrouter",
    label: "TokenRouter",
    baseUrl: "https://api.tokenrouter.io/v1",
    kind: "openai",
    docsHint: "OpenAI-compatible gateway.",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    kind: "anthropic",
    docsHint: "Native Messages API. Models via GET /models.",
  },
  moonshot: {
    id: "moonshot",
    label: "Moonshot",
    baseUrl: "https://api.moonshot.ai/v1",
    kind: "openai",
    docsHint: "OpenAI-compatible (Kimi models).",
  },
};

export const PROVIDER_LIST = Object.values(PROVIDERS);

export const SKILL_CATEGORIES = [
  { id: "technical", label: "Technical Skills" },
  { id: "soft", label: "Soft Skills" },
  { id: "management", label: "Management Skills" },
  { id: "tools", label: "Tools" },
  { id: "frameworks", label: "Frameworks" },
  { id: "languages", label: "Languages" },
] as const;

export const WORK_MODES = ["remote", "hybrid", "office"] as const;

export const SENIORITY_LEVELS = [
  "junior",
  "middle",
  "senior",
  "lead",
  "head",
  "director",
  "vp",
  "c-level",
] as const;

export const PAGE_FORMATS = ["A4", "Letter"] as const;
