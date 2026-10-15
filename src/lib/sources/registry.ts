export type SourceFormat = "hf-api" | "atom" | "rss" | "json";

export interface SourceDefinition {
  key: string;
  baseUrl: string;
  tier: number;
  enabled: boolean;
  /** How the source is polled. Everything that is not `hf-api` needs a feed adapter. */
  format: SourceFormat;
  note?: string;
  /**
   * News kind produced by this source, if it produces news. Kept here so the
   * registry stays the single place a source is declared.
   */
  newsKind?: "paper" | "release" | "announcement" | "runtime" | "community";
}

/**
 * Source inventory.
 *
 * Decision 3 ("Hugging Face only") is revised as of 2026-10-15: local-AI news
 * now also comes from runtime release feeds and the r/LocalLLaMA community
 * feed. See docs/en/NEWS-PLAN.md. A new source ships only after
 * `npm run sources-check` reports 200 with items > 0 for it (gate G4).
 */
export const SOURCES: SourceDefinition[] = [
  // --- Hugging Face (decision 3, still the model source of truth) ---
  {
    key: "hf_models",
    baseUrl: "https://huggingface.co/api/models",
    tier: 1,
    enabled: true,
    format: "hf-api",
    note: "search + pagination"
  },
  {
    key: "hf_model_detail",
    baseUrl: "https://huggingface.co/api/models/{id}?full=true",
    tier: 2,
    enabled: true,
    format: "hf-api",
    note: "cardData, safetensors, siblings, spaces"
  },
  {
    key: "hf_trending",
    baseUrl: "https://huggingface.co/api/trending?type=model",
    tier: 2,
    enabled: true,
    format: "hf-api",
    note: "authorData.avatarUrl is only available here"
  },
  {
    key: "hf_daily_papers",
    baseUrl: "https://huggingface.co/api/daily_papers",
    tier: 2,
    enabled: true,
    format: "hf-api",
    newsKind: "paper",
    note: "?date=YYYY-MM-DD, ~50/day"
  },

  // --- Local-AI news feeds (added 2026-10-15) ---
  {
    key: "reddit_localllama",
    baseUrl: "https://www.reddit.com/r/LocalLLaMA/.rss",
    tier: 2,
    enabled: true,
    format: "atom",
    newsKind: "community",
    note: "needs a browser User-Agent + Accept; 200 on a first call, 429 on bursts (measured 2026-10-15)"
  },
  {
    key: "gh_llama_cpp",
    baseUrl: "https://github.com/ggml-org/llama.cpp/releases.atom",
    tier: 2,
    enabled: true,
    format: "atom",
    newsKind: "runtime",
    note: "runtime releases"
  },
  {
    key: "gh_ollama",
    baseUrl: "https://github.com/ollama/ollama/releases.atom",
    tier: 2,
    enabled: true,
    format: "atom",
    newsKind: "runtime",
    note: "runtime releases"
  },
  {
    key: "gh_vllm",
    baseUrl: "https://github.com/vllm-project/vllm/releases.atom",
    tier: 2,
    enabled: true,
    format: "atom",
    newsKind: "runtime",
    note: "runtime releases"
  },

  // --- Measured as unusable; kept here so nobody re-adds them blindly ---
  {
    key: "hf_blog_rss",
    baseUrl: "https://huggingface.co/blog.rss",
    tier: 4,
    enabled: false,
    format: "rss",
    note: "404 — no RSS feed exists"
  },
  {
    key: "hf_users",
    baseUrl: "https://huggingface.co/api/users/{name}",
    tier: 5,
    enabled: false,
    format: "hf-api",
    note: "error without a token"
  },
  {
    key: "hf_organizations",
    baseUrl: "https://huggingface.co/api/organizations/{name}",
    tier: 5,
    enabled: false,
    format: "hf-api",
    note: "error without a token"
  },
  {
    key: "lmstudio_changelog",
    baseUrl: "https://lmstudio.ai/changelog",
    tier: 4,
    enabled: false,
    format: "json",
    note: "HTML only, no feed (measured 2026-10-15)"
  }
];

export function getSource(key: string): SourceDefinition | undefined {
  return SOURCES.find((s) => s.key === key);
}

/** Sources that produce news items, in registry order. */
export function newsSources(): SourceDefinition[] {
  return SOURCES.filter((source) => source.enabled && source.newsKind !== undefined);
}
