import type { Locale } from "@/i18n";

export interface CategoryRule {
  key: string;
  labelEn: string;
  labelTr: string;
  pipelineTags: string[];
  searchQuery?: string;
  nameRegex?: string;
  tagRegex?: string;
  sortOrder: number;
}

export const CATEGORY_RULES: CategoryRule[] = [
  { key: "llm", labelEn: "Language / LLM", labelTr: "Dil / LLM", pipelineTags: ["text-generation"], sortOrder: 1 },
  {
    key: "image",
    labelEn: "Image",
    labelTr: "Görüntü",
    pipelineTags: ["text-to-image", "image-generation", "image-to-image", "image-editing"],
    sortOrder: 2
  },
  {
    key: "video",
    labelEn: "Video",
    labelTr: "Video",
    pipelineTags: ["text-to-video", "image-to-video", "video-generation", "video-to-video"],
    sortOrder: 3
  },
  {
    key: "coding",
    labelEn: "Coding",
    labelTr: "Kod",
    pipelineTags: [],
    searchQuery: "coder",
    nameRegex: "(^|[-_. ])(code|coder|codex|coding|swe|agentic)([-_. ]|$)",
    tagRegex: "^(code-generation|coding|codex|swe|agentic)$",
    sortOrder: 4
  },
  {
    key: "audio",
    labelEn: "Audio",
    labelTr: "Ses",
    pipelineTags: [
      "automatic-speech-recognition",
      "text-to-speech",
      "audio-to-text",
      "music-generation",
      "audio-classification"
    ],
    sortOrder: 5
  },
  {
    key: "multimodal",
    labelEn: "Multimodal",
    labelTr: "Çoklu Mod",
    pipelineTags: ["visual-question-answering", "image-to-text", "document-question-answering"],
    tagRegex: "^(multimodal|vlm|vision-language)$",
    sortOrder: 6
  },
  {
    key: "embedding",
    labelEn: "Embedding / RAG",
    labelTr: "Gömme / RAG",
    pipelineTags: ["feature-extraction", "sentence-similarity"],
    tagRegex: "^(embedding|embeddings|reranker)$",
    sortOrder: 7
  },
  {
    key: "vision",
    labelEn: "Vision / CV",
    labelTr: "Görme / CV",
    pipelineTags: [
      "object-detection",
      "image-segmentation",
      "depth-estimation",
      "zero-shot-image-classification",
      "image-classification"
    ],
    sortOrder: 8
  },
  {
    key: "robotics",
    labelEn: "Robotics / Agent",
    labelTr: "Robotik / Agent",
    pipelineTags: ["robotics", "visual-document-retrieval"],
    tagRegex: "^(robotics|function-calling|tool-calling|agent)$",
    sortOrder: 9
  },
  { key: "news", labelEn: "News", labelTr: "Haber", pipelineTags: [], sortOrder: 10 }
];

export const CURATED_ORGS = [
  "Qwen",
  "deepseek-ai",
  "meta-llama",
  "mistralai",
  "google",
  "microsoft",
  "unsloth",
  "bartowski",
  "lm-community",
  "cognitivecomputations",
  "nvidia",
  "alibaba-nlp",
  "Cohere",
  "LiquidAI",
  "Lightricks",
  "black-forest-labs",
  "openai",
  "bigcode",
  "JetBrains",
  "Reka",
  "moonshot-ai",
  "minimax",
  "zai-org"
];

/**
 * A model can match several rules. Primary wins by this precedence, not by tab order.
 * A coding model with pipeline_tag=text-generation must land in Coding, not Language.
 */
export const PRIMARY_PRECEDENCE = [
  "coding",
  "video",
  "image",
  "audio",
  "multimodal",
  "embedding",
  "vision",
  "robotics",
  "llm"
];

export interface ClassifyInput {
  externalId: string;
  pipelineTag?: string | null;
  name: string;
  author?: string | null;
  tags: string[];
}

export function classifyModel(
  input: ClassifyInput,
  overrides: Record<string, string> = {}
): { primary: string; all: string[] } {
  if (overrides[input.externalId]) {
    return { primary: overrides[input.externalId], all: [overrides[input.externalId]] };
  }

  const all: string[] = [];
  const tagSet = new Set(input.tags.map((t) => t.toLowerCase()));

  for (const rule of CATEGORY_RULES) {
    if (rule.key === "news") continue;

    const tagMatch = input.pipelineTag && rule.pipelineTags.includes(input.pipelineTag);
    const nameMatch = rule.nameRegex ? new RegExp(rule.nameRegex, "i").test(input.name) : false;
    const tagRuleMatch = rule.tagRegex ? input.tags.some((tag) => new RegExp(rule.tagRegex as string, "i").test(tag)) : false;

    if (tagMatch || nameMatch || tagRuleMatch) all.push(rule.key);
  }

  if (all.length === 0) {
    if (tagSet.has("llm") || tagSet.has("gguf") || tagSet.has("instruction-tuning")) all.push("llm");
    else if (tagSet.has("lora") || tagSet.has("diffusers") || tagSet.has("stable-diffusion")) all.push("image");
    else all.push("vision");
  }

  const ordered = PRIMARY_PRECEDENCE.filter((key) => all.includes(key));
  return { primary: ordered[0], all: ordered };
}

/**
 * Category names are UI copy in the reader's language (owner decision
 * 2026-10-22, which reverses the 2026-10-15 "terms stay English" decision that
 * `docs/en/DESIGN.md` §9 recorded).
 *
 * What does *not* move is the taxonomy identity: `/c/coding` stays the URL, the
 * `labelEn` / `labelTr` fields stay the data (`/api/categories` is unchanged),
 * and `sortOrder` still orders the desks. Only the printed name is localized.
 *
 * `locale` is required rather than defaulted, so a call site cannot silently
 * fall back to one language: forgetting it is a compile error, not an English
 * label on a Turkish page. An unknown key still returns itself.
 */
export function categoryLabel(key: string, locale: Locale): string {
  const rule = CATEGORY_RULES.find((r) => r.key === key);
  if (!rule) return key;
  return locale === "tr" ? rule.labelTr : rule.labelEn;
}
