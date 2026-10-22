import type { Locale } from "@/i18n";

/**
 * The desk nav's short forms, one row per locale.
 *
 * The strip has a fixed width budget: at 1 440 px `EMBEDDING / RAG` was hard-cut
 * mid-word (measured: the strip needed ~1 375 px in a 1 280 px container), so the
 * desk nav prints an abbreviation where the full name is too wide. Since the
 * category names became localized (commit a0c404a, `categoryLabel(key, locale)`),
 * the abbreviation is a table rather than a rule: the English row is byte-for-byte
 * what the nav printed before localization (owner decision 2026-10-22) - the
 * English UI must not change - and the Turkish row keeps the same shape, the
 * abbreviation everyone actually says (LLM) or the shortest true word (`Kod`,
 * `Ses`, `Gömme`). Its longest form is 7 characters against English's 10
 * (`Multimodal`), so swapping the row in cannot widen the strip.
 *
 * The table lives beside the taxonomy instead of inside `DeskNav` because two very
 * different callers read the same row: the React component that prints it, and
 * `scripts/check-nav-current.ts`, which asserts that the label carrying
 * `aria-current` on `/c/<key>` is exactly this locale's short form. That check runs
 * under `tsx` against server-rendered HTML and must not import React, so the data
 * it expects sits where the taxonomy does.
 */
export const NAV_SHORT: Record<Locale, Record<string, string>> = {
  en: {
    llm: "LLM",
    image: "Image",
    video: "Video",
    coding: "Coding",
    audio: "Audio",
    multimodal: "Multimodal",
    embedding: "Embedding",
    vision: "Vision",
    robotics: "Robotics"
  },
  tr: {
    llm: "LLM",
    image: "Görüntü",
    video: "Video",
    coding: "Kod",
    audio: "Ses",
    multimodal: "Çoklu",
    embedding: "Gömme",
    vision: "Görme",
    robotics: "Robotik"
  }
};
