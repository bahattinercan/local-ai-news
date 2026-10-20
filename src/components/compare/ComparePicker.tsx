import Link from "next/link";
import { Plus } from "lucide-react";
import { CopyCommand } from "@/components/CopyCommand";
import { categoryLabel } from "@/lib/classify/rules";
import { COMPARE_CAP, compareHref } from "@/lib/compare";
import { formatNumber } from "@/lib/format";
import type { ClassifiedModel } from "@/lib/model";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";

/**
 * The sheet's controls (docs/en/COMPARE-PLAN.md C3).
 *
 * They were missing entirely: the only compare link on the site lived on a feed
 * card and *replaced* the whole id list, so a second model could only be added by
 * editing the address. Everything here is a plain GET form or a link — no client
 * state, no JavaScript, and the address stays the single source of truth.
 */

export function CompareAddForm({
  locale,
  selected,
  value = ""
}: {
  locale: Locale;
  selected: ClassifiedModel[];
  /** Echoed back after a failed add, so the reader can fix a typo instead of retyping. */
  value?: string;
}) {
  const dict = dictionary(locale);
  const full = selected.length >= COMPARE_CAP;

  if (full) {
    return <p className="mt-3 text-sm text-muted">{t(dict, "compare.capReached", { cap: COMPARE_CAP })}</p>;
  }

  return (
    <form method="get" action={hrefFor(locale, "/compare")} className="mt-3 flex flex-wrap items-end gap-2">
      {selected.length > 0 ? (
        <input type="hidden" name="ids" value={selected.map((model) => model.slug).join(",")} />
      ) : null}
      <div className="min-w-[220px] flex-1">
        <label htmlFor="compare-add" className="label block text-muted">
          {t(dict, "compare.addModel")}
        </label>
        <input
          id="compare-add"
          name="add"
          type="text"
          defaultValue={value}
          autoComplete="off"
          spellCheck={false}
          placeholder={t(dict, "compare.pastePlaceholder")}
          aria-describedby="compare-add-hint"
          className="mt-1 h-9 w-full border border-rule bg-bg px-2 font-mono text-sm"
        />
      </div>
      <button
        type="submit"
        className="label flex h-9 shrink-0 items-center gap-1.5 border border-rule-strong bg-text px-3 text-bg hover:opacity-90"
      >
        <Plus size={13} aria-hidden="true" />
        {t(dict, "compare.addButton")}
      </button>
      <p id="compare-add-hint" className="w-full text-xs text-muted">
        {t(dict, "compare.pasteHint")}
      </p>
    </form>
  );
}

/** Add-chips: each one links to the current list plus that model, in order. */
export function CompareSuggestions({
  locale,
  models,
  selected,
  title
}: {
  locale: Locale;
  models: ClassifiedModel[];
  selected: ClassifiedModel[];
  title: string;
}) {
  const ids = selected.map((model) => model.slug);
  if (models.length === 0) return null;

  return (
    <section className="mt-4">
      <h2 className="label text-muted">{title}</h2>
      <ul className="mt-1.5 flex flex-wrap gap-2">
        {models.map((model) => (
          <li key={model.slug}>
            <Link
              href={compareHref(locale, [...ids, model.slug])}
              className="inline-flex min-h-6 max-w-full items-center gap-1.5 border border-rule px-2 py-1 text-sm hover:border-accent hover:text-accent"
            >
              <Plus size={12} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 truncate">{model.name}</span>
              <span className="shrink-0 font-mono text-xs text-muted">{formatNumber(model.downloads)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Pairs computed from the snapshot, not hand-picked: one per category, preferring
 * categories where both models report params and a VRAM estimate, so the sheet a
 * reader lands on has its FIT rows filled (17.7 % of rows carry params).
 */
export function ComparePairs({
  locale,
  pairs
}: {
  locale: Locale;
  pairs: Array<{ category: string; models: ClassifiedModel[] }>;
}) {
  const dict = dictionary(locale);
  if (pairs.length === 0) return null;

  return (
    <section className="mt-4">
      <h2 className="label text-muted">{t(dict, "compare.pairsTitle")}</h2>
      <ul className="mt-1.5">
        {pairs.map((pair) => (
          <li key={pair.models.map((model) => model.slug).join("|")} className="rule-bottom">
            <Link
              href={compareHref(locale, pair.models.map((model) => model.slug))}
              className="group flex flex-wrap items-baseline gap-x-2 py-1.5 text-sm"
            >
              <span className="label shrink-0 text-muted">{categoryLabel(pair.category)}</span>
              <span className="min-w-0 break-words font-semibold group-hover:text-accent">{pair.models[0].name}</span>
              <span className="text-muted">{t(dict, "compare.vs")}</span>
              <span className="min-w-0 break-words font-semibold group-hover:text-accent">{pair.models[1].name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Count, swap, clear — and a copyable absolute link to this exact sheet. */
export function CompareActions({
  locale,
  models,
  absoluteUrl
}: {
  locale: Locale;
  models: ClassifiedModel[];
  absoluteUrl: string;
}) {
  const dict = dictionary(locale);
  const ids = models.map((model) => model.slug);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      {models.length === 2 ? (
        <Link href={compareHref(locale, [...ids].reverse())} className="text-accent">
          {t(dict, "compare.swap")}
        </Link>
      ) : null}
      <Link href={hrefFor(locale, "/compare")} className="text-muted hover:text-text">
        {t(dict, "compare.clear")}
      </Link>
      <CopyCommand text={absoluteUrl} label={t(dict, "compare.copyLink")} copiedLabel={t(dict, "common.copied")} />
    </div>
  );
}
