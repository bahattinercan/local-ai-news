export interface SourceDefinition {
  key: string;
  baseUrl: string;
  tier: number;
  enabled: boolean;
  note?: string;
}

/** Source inventory. Everything here is Hugging Face (decision 3). */
export const SOURCES: SourceDefinition[] = [
  { key: "hf_models", baseUrl: "https://huggingface.co/api/models", tier: 1, enabled: true, note: "search + pagination" },
  { key: "hf_model_detail", baseUrl: "https://huggingface.co/api/models/{id}?full=true", tier: 2, enabled: true, note: "cardData, safetensors, siblings, spaces" },
  { key: "hf_trending", baseUrl: "https://huggingface.co/api/trending?type=model", tier: 2, enabled: true, note: "authorData.avatarUrl is only available here" },
  { key: "hf_daily_papers", baseUrl: "https://huggingface.co/api/daily_papers", tier: 2, enabled: true, note: "?date=YYYY-MM-DD, ~50/day" },
  { key: "hf_blog_rss", baseUrl: "https://huggingface.co/blog.rss", tier: 4, enabled: false, note: "404 — no RSS feed exists" },
  { key: "hf_users", baseUrl: "https://huggingface.co/api/users/{name}", tier: 5, enabled: false, note: "error without a token" },
  { key: "hf_organizations", baseUrl: "https://huggingface.co/api/organizations/{name}", tier: 5, enabled: false, note: "error without a token" }
];

export function getSource(key: string): SourceDefinition | undefined {
  return SOURCES.find((s) => s.key === key);
}
