export interface SafetensorsInfo {
  parameters?: Record<string, number>;
  total?: number;
}

export interface RawModel {
  id: string;
  author?: string | null;
  pipelineTag?: string | null;
  libraryName?: string | null;
  tags: string[];
  likes: number;
  downloads: number;
  trendingScore?: number | null;
  gated: boolean;
  createdAt: string;
  lastModified: string;
  siblings?: string[];
  /** Per-file sizes; only the `?blobs=true` detail response carries them. */
  siblingSizes?: Array<{ name: string; bytes: number }>;
  cardData?: Record<string, unknown> | null;
  safetensors?: SafetensorsInfo | null;
  usedStorage?: number | null;
  spaces?: string[];
}

export interface ClassifiedModel {
  externalId: string;
  slug: string;
  name: string;
  author: string | null;
  primaryCategory: string;
  categories: string[];
  pipelineTag: string | null;
  libraryName: string | null;
  license: string | null;
  licenseName: string | null;
  createdAt: string;
  updatedAt: string;
  firstSeenAt: string;
  downloads: number;
  /**
   * The download count on the run that first saw this model, so a delta measures
   * real in-window growth (`lib/heat.ts`). Null for every model discovered before
   * the field existed, and that is the common case - never treat it as zero.
   */
  downloadsAtFirstSeen?: number | null;
  likes: number;
  trendingScore: number | null;
  gated: boolean;
  qualityPassed: boolean;
  gateReason: string;
  paramsTotal: number | null;
  paramDtypes: Record<string, number> | null;
  storageBytes: number | null;
  quantizations: string[];
  runners: string[];
  vramEstGb: number | null;
  sampleImages: string[];
  spaces: string[];
  url: string;
  /** Weight files only, capped; see MAX_STORED_FILES. */
  files?: Array<{ name: string; bytes: number }> | null;
  /**
   * Short plain-text excerpt of the Hugging Face model card (`lib/card-text.ts`).
   * `undefined` = never fetched, `null` = fetched and the card held no printable
   * prose. The backfill keys on that distinction so an empty card is not re-read
   * on every run.
   */
  cardSummary?: string | null;
  cardMeta?: {
    baseModel?: string;
    datasets?: string[];
    languages?: string[];
  } | null;
}

export function slugify(externalId: string): string {
  return externalId.replace(/[^A-Za-z0-9._-]/g, "-");
}
