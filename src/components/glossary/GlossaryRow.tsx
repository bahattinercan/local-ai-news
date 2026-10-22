import Link from "next/link";
import { GLOSSARY_CATEGORIES, glossaryText, type GlossaryEntry } from "@/lib/glossary";
import { hrefFor, type Locale } from "@/i18n";

/**
 * One ruled row of the glossary index (docs/en/GLOSSARY-PLAN.md G-D1).
 *
 * A card wrapped the same two lines in a border, a radius, a shadow and 16 px of
 * padding on all four sides, and the two-column grid then stretched every row to
 * the tallest card: measured 132 px for all 11 rows at 1440, i.e. up to half a row
 * of dead space under the short entries. A hairline and 10 px of padding separate
 * them just as clearly.
 *
 * The `N §` badge is gone too. It was `body.length` - the paragraph count - printed
 * as if a reader could decode it; the row now states the cost of reading the term
 * (G-D3), which is the only number a reader can act on before clicking.
 */
export function GlossaryRow({
  entry,
  locale,
  minutesLabel
}: {
  entry: GlossaryEntry;
  locale: Locale;
  /** Already formatted by the page, so this component stays dictionary-free. */
  minutesLabel: string;
}) {
  const text = glossaryText(entry, locale);

  return (
    <li className="rule-bottom">
      <Link
        href={hrefFor(locale, `/glossary/${entry.slug}`)}
        className="group flex items-baseline gap-3 py-2.5"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base font-bold tracking-tight group-hover:text-accent sm:text-lg">
            {text.term}
          </span>
          <span className="mt-0.5 block line-clamp-2 text-sm text-muted">{text.summary}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="label block text-accent">{GLOSSARY_CATEGORIES[entry.category][locale]}</span>
          <span className="mt-0.5 block font-mono text-xs text-muted" title={minutesLabel}>
            {minutesLabel}
          </span>
        </span>
      </Link>
    </li>
  );
}
