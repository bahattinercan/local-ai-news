import type { RawModel } from "../model.ts";

export interface RawPaper {
  id: string;
  title: string;
  summary?: string;
  thumbnail?: string;
  organization?: string | null;
  githubRepo?: string | null;
  projectPage?: string | null;
  upvotes?: number;
  publishedAt: string;
  submittedOnDailyAt?: string;
}

export interface HfListParams {
  pipelineTag?: string;
  tag?: string;
  sort?: "createdAt" | "lastModified" | "downloads" | "likes" | "trendingScore";
  limit?: number;
  cursor?: string;
}

export interface HfPage {
  items: RawModel[];
  nextCursor: string | null;
}

export interface HfClientOptions {
  token?: string;
  maxRequestsPerWindow?: number;
  windowMs?: number;
  maxWaitMs?: number;
  fetchImpl?: typeof fetch;
}

export class RateLimitBudget {
  readonly max: number;
  readonly windowMs: number;
  private used = 0;
  private windowStart = Date.now();

  constructor(max = 500, windowMs = 300_000) {
    this.max = max;
    this.windowMs = windowMs;
  }

  get remaining(): number {
    if (Date.now() - this.windowStart > this.windowMs) {
      this.used = 0;
      this.windowStart = Date.now();
    }
    return this.max - this.used;
  }

  consume(): void {
    this.remaining;
    this.used += 1;
  }
}

const BASE = "https://huggingface.co";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseNextCursor(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>\s*;\s*rel="next"/);
  if (!match) return null;
  try {
    const url = new URL(match[1]);
    return url.searchParams.get("cursor");
  } catch {
    return null;
  }
}

export class HfClient {
  private readonly fetchImpl: typeof fetch;
  private readonly budget: RateLimitBudget;
  private readonly maxWaitMs: number;

  constructor(options: HfClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.budget = new RateLimitBudget(options.maxRequestsPerWindow ?? 500, options.windowMs ?? 300_000);
    this.maxWaitMs = options.maxWaitMs ?? 30_000;
    this.token = options.token;
  }

  readonly token?: string;

  get requestsUsed(): number {
    return this.budget.max - this.budget.remaining;
  }

  private async request(url: string): Promise<Response> {
    if (this.budget.remaining <= 0) {
      throw new Error(`rate limit budget exhausted (${this.budget.max} per ${this.budget.windowMs / 1000}s)`);
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    const response = await this.fetchImpl(url, { headers });
    this.budget.consume();

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
      const wait = Math.min(retryAfter * 1000 || 5000, this.maxWaitMs);
      await sleep(wait);
      return this.request(url);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return response;
  }

  async listModels(params: HfListParams = {}): Promise<HfPage> {
    const url = new URL(`${BASE}/api/models`);
    if (params.pipelineTag) url.searchParams.set("pipeline_tag", params.pipelineTag);
    if (params.tag) url.searchParams.set("tag", params.tag);
    if (params.sort) url.searchParams.set("sort", params.sort);
    url.searchParams.set("limit", String(Math.min(params.limit ?? 100, 100)));
    if (params.cursor) url.searchParams.set("cursor", params.cursor);

    const response = await this.request(url.toString());
    const body = (await response.json()) as Array<Record<string, unknown>>;

    return {
      items: body.map((item) => mapModelItem(item)),
      nextCursor: parseNextCursor(response.headers.get("Link"))
    };
  }

  async getModel(id: string): Promise<RawModel> {
    const response = await this.request(`${BASE}/api/models/${id}?full=true`);
    return mapModelItem((await response.json()) as Record<string, unknown>);
  }

  async getTrending(): Promise<RawModel[]> {
    const response = await this.request(`${BASE}/api/trending?type=model`);
    const body = (await response.json()) as { recentlyTrending?: Array<{ repoData: Record<string, unknown> }> };
    return (body.recentlyTrending ?? []).map((entry) => mapModelItem(entry.repoData));
  }

  async getDailyPapers(date?: string): Promise<RawPaper[]> {
    const url = new URL(`${BASE}/api/daily_papers`);
    if (date) url.searchParams.set("date", date);
    url.searchParams.set("limit", "50");

    const response = await this.request(url.toString());
    const body = (await response.json()) as Array<Record<string, unknown>>;

    return body.map((entry) => {
      const paper = (entry.paper ?? entry) as Record<string, unknown>;
      return {
        id: String(paper.id ?? entry._id ?? ""),
        title: String(paper.title ?? ""),
        summary: (paper.summary as string) ?? undefined,
        thumbnail: (paper.thumbnail as string) ?? (entry.thumbnail as string) ?? undefined,
        organization: (paper.organization as string) ?? (entry.organization as string) ?? null,
        githubRepo: (paper.githubRepo as string) ?? null,
        projectPage: (paper.projectPage as string) ?? null,
        upvotes: (paper.upvotes as number) ?? (entry.numComments as number) ?? 0,
        publishedAt: String(paper.publishedAt ?? entry.publishedAt ?? ""),
        submittedOnDailyAt: (entry.submittedOnDailyAt as string) ?? undefined
      };
    });
  }
}

function mapModelItem(item: Record<string, unknown>): RawModel {
  return {
    id: String(item.id ?? item.modelId ?? ""),
    author: (item.author as string) ?? null,
    pipelineTag: (item.pipeline_tag as string) ?? null,
    libraryName: (item.library_name as string) ?? null,
    tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
    likes: Number(item.likes ?? 0),
    downloads: Number(item.downloads ?? 0),
    trendingScore: item.trendingScore != null ? Number(item.trendingScore) : null,
    gated: Boolean(item.gated),
    createdAt: String(item.createdAt ?? ""),
    lastModified: String(item.lastModified ?? ""),
    siblings: Array.isArray(item.siblings)
      ? (item.siblings as Array<{ rfilename: string }>).map((s) => s.rfilename)
      : undefined,
    cardData: (item.cardData as Record<string, unknown>) ?? null,
    safetensors: (item.safetensors as RawModel["safetensors"]) ?? null,
    usedStorage: item.usedStorage != null ? Number(item.usedStorage) : null,
    spaces: Array.isArray(item.spaces) ? (item.spaces as string[]) : undefined
  };
}
