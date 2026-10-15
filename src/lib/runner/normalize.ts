import type { RawModel } from "../model.ts";
import { classifyModel } from "../classify/rules.ts";
import { evaluateGate } from "../classify/gate.ts";
import { detectQuantizations, detectRunners } from "./detect.ts";
import { estimateVramGb } from "./vram.ts";
import { slugify, type ClassifiedModel } from "../model.ts";

/** Weight files worth listing; a repo can also carry samples, configs and scripts. */
const WEIGHT_EXTENSIONS = [".gguf", ".safetensors", ".bin", ".pt", ".onnx", ".pth"];

/** Cap so the snapshot does not grow without bound (a repo can have 100+ files). */
const MAX_STORED_FILES = 40;

function weightFiles(model: RawModel): ClassifiedModel["files"] {
  const sized = model.siblingSizes;
  if (!sized || sized.length === 0) return null;

  const weights = sized.filter((file) =>
    WEIGHT_EXTENSIONS.some((extension) => file.name.toLowerCase().endsWith(extension))
  );
  if (weights.length === 0) return null;

  return [...weights].sort((a, b) => b.bytes - a.bytes).slice(0, MAX_STORED_FILES);
}

function cardMeta(model: RawModel): ClassifiedModel["cardMeta"] {
  const data = model.cardData ?? {};
  const asStringArray = (value: unknown): string[] | undefined =>
    Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string").slice(0, 12) : undefined;

  // HF uses several spellings for the parent model depending on the card version.
  const baseModel =
    (typeof data.base_model === "string" ? data.base_model : undefined) ??
    (Array.isArray(data.base_model) && typeof data.base_model[0] === "string" ? data.base_model[0] : undefined) ??
    (typeof data.base_model_relation === "string" ? data.base_model_relation : undefined);

  const meta = {
    baseModel,
    datasets: asStringArray(data.datasets),
    languages: asStringArray(data.language)
  };

  return meta.baseModel || meta.datasets || meta.languages ? meta : null;
}

export interface NormalizeOptions {
  firstSeenAt: string;
  overrides?: Record<string, string>;
}

export function normalizeModel(model: RawModel, options: NormalizeOptions): ClassifiedModel {
  const gate = evaluateGate(model);
  const { primary, all } = classifyModel(
    {
      externalId: model.id,
      pipelineTag: model.pipelineTag ?? null,
      name: model.id.split("/")[1] ?? model.id,
      author: model.author ?? null,
      tags: model.tags
    },
    options.overrides
  );

  const quantizations = detectQuantizations(model);
  const paramsCount = model.safetensors?.total ?? null;
  const primaryQuant = quantizations[0] ?? Object.keys(model.safetensors?.parameters ?? {})[0] ?? "BF16";

  const cardData = model.cardData ?? {};
  const widget = Array.isArray(cardData.widget) ? (cardData.widget as Array<{ output?: { url?: string } }>) : [];

  return {
    externalId: model.id,
    slug: slugify(model.id),
    name: model.id.split("/")[1] ?? model.id,
    author: model.author ?? null,
    primaryCategory: primary,
    categories: all,
    pipelineTag: model.pipelineTag ?? null,
    libraryName: model.libraryName ?? null,
    license: (cardData.license as string) ?? null,
    licenseName: (cardData.license_name as string) ?? null,
    createdAt: model.createdAt,
    updatedAt: model.lastModified,
    firstSeenAt: options.firstSeenAt,
    downloads: model.downloads,
    likes: model.likes,
    trendingScore: model.trendingScore ?? null,
    gated: model.gated,
    qualityPassed: gate.passed,
    gateReason: gate.reason,
    paramsTotal: paramsCount,
    paramDtypes: model.safetensors?.parameters ?? null,
    storageBytes: model.usedStorage ?? null,
    quantizations,
    runners: detectRunners(model),
    vramEstGb: estimateVramGb(paramsCount ?? 0, primaryQuant),
    sampleImages: widget.map((w) => w.output?.url).filter((u): u is string => Boolean(u)),
    spaces: model.spaces ?? [],
    files: weightFiles(model),
    cardMeta: cardMeta(model),
    url: `https://huggingface.co/${model.id}`
  };
}
