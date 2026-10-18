import Link from "next/link";
import { ScrollStrip } from "../ui/ScrollStrip";
import { getMostDownloaded } from "@/lib/store";
import { formatNumber } from "@/lib/format";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";

/**
 * The ribbon (docs/en/DESIGN-V3.md §1 zone 4).
 *
 * One horizontal ticker of the window's most downloaded models, each with its
 * figure set as a superscript — the reference's `Apies 9.1 · The Godfather 9.4`
 * line, which turns a list into a *ranked* list without spending a table on it.
 *
 * What the superscript is, and why: `downloads` is the one metric present on 86 %
 * of rows, and it is the same number that ordered the row, so the strip can never
 * look unsorted. HF's `trendingScore` is null on every model in the snapshot
 * (measured 1 633/1 633), so there is no "trending" figure to print - see
 * `getMostDownloaded` for the full argument.
 *
 * Overflow is a scroll, never a wrap: a wrapped ribbon costs the first screen the
 * vertical space the whole design just bought back. The strip is focusable so a
 * keyboard user can scroll it, and it prints nothing at all in print.
 */
export async function Ribbon({ locale }: { locale: Locale }) {
  const dict = dictionary(locale);
  const days = 7;
  const rows = await getMostDownloaded(days, { limit: 12 });
  if (rows.length === 0) return null;

  return (
    <section className="ribbon border-b border-rule no-print" aria-label={t(dict, "ribbon.title", { days })}>
      <div className="shell">
        <div className="relative">
          <ScrollStrip
            label={t(dict, "ribbon.title", { days })}
            className="flex items-center gap-3 py-1"
          >
            <span className="label shrink-0 border-r border-rule-strong/25 pr-3">
              {t(dict, "ribbon.title", { days })}
            </span>
            <ol className="flex shrink-0 items-baseline gap-3">
              {rows.map((model, index) => (
                <li key={model.externalId} className="flex shrink-0 items-baseline gap-1">
                  <Link
                    href={hrefFor(locale, `/m/${model.slug}`)}
                    title={model.externalId}
                    className="inline-flex min-h-6 max-w-[11rem] items-center truncate text-sm hover:underline"
                  >
                    {model.name}
                  </Link>
                  <sup className="pl-1 font-mono text-xs text-accent">{formatNumber(model.downloads)}</sup>
                  {index < rows.length - 1 ? (
                    <span className="pl-2 text-rule-strong/30" aria-hidden="true">
                      |
                    </span>
                  ) : null}
                </li>
              ))}
            </ol>
          </ScrollStrip>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-r from-transparent to-bg"
          />
        </div>
      </div>
    </section>
  );
}
