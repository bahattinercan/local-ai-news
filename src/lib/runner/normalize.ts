import type { RawModel } from "../model.ts";
import { classifyModel } from "../classify/rules.ts";
import { evaluateGate } from "../classify/gate.ts";
import { detectQuantizations, detectRunners } from "./detect.ts";
import { estimateVramGb } from "./vram.ts";
import { slugify, type ClassifiedModel } from "../model.ts";

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
    url: `https://huggingface.co/${model.id}`
  };
}
