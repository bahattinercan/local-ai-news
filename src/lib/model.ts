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
  cardMeta?: {
    baseModel?: string;
    datasets?: string[];
    languages?: string[];
  } | null;
}

export function slugify(externalId: string): string {
  return externalId.replace(/[^A-Za-z0-9._-]/g, "-");
}
