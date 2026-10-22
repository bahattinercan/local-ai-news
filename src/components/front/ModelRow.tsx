import Link from "next/link";
import { Clock } from "lucide-react";
import { categoryLabel } from "@/lib/classify/rules";
import { cn, daysSince, formatNumber } from "@/lib/format";
import { formatGrowth, growthOf } from "@/lib/heat";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { PressPlate } from "../ui/PressPlate";
import type { ClassifiedModel } from "@/lib/model";

/**
 * A ranked model row for the front page's band: rank, plate, name, one secondary
 * line, one figure (docs/en/DESIGN-V3.md §1 zone 6, centre-bottom).
 *
 * Unlike `FeedCard` this row is *only* a rank - it exists because a broadsheet
 * needs a "most downloaded" column, and it therefore prints one number: the
 * downloads figure that ordered it. `showsGrowth` is decided upstream by
 * `hasGrowthSignal()`: `downloadsAtFirstSeen` only exists for models first seen
 * after the field shipped, so printing `+Δ` on a band where most rows have no
 * baseline would be a column of blanks pretending to be a column of zeros.
 */
export function ModelRow({
  model,
  locale,
  rank,
  showsGrowth = false
}: {
  model: ClassifiedModel;
  locale: Locale;
  rank: number;
  showsGrowth?: boolean;
}) {
  const dict = dictionary(locale);
  const growth = showsGrowth ? growthOf(model) : null;
  const age = daysSince(model.firstSeenAt);

  return (
    <li className="rule-bottom">
      <div className="flex items-center gap-3 py-2">
        <span className="w-5 shrink-0 font-mono text-xs text-muted">{rank}</span>

        <Link href={hrefFor(locale, `/m/${model.slug}`)} tabIndex={-1} className="shrink-0">
          <PressPlate slug={model.slug} name={model.name} className="h-10 w-10 border border-rule" />
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={hrefFor(locale, `/m/${model.slug}`)}
            title={model.externalId}
            className="block min-h-6 truncate text-row font-semibold hover:underline"
          >
            {model.name}
          </Link>
          {/* One line, truncated: the band prints two columns inside a ~570px
              track, so a wrapping meta line made every row a different height and
              the rules came out ragged (measured 2026-10-18). The age moved to the
              figure column, where it stacks under the download count. */}
          <p className="mt-0.5 flex items-center gap-x-2 overflow-hidden text-xs text-muted whitespace-nowrap">
            <span className="shrink-0">{categoryLabel(model.primaryCategory)}</span>
            {/* One runner plus a count, not a list: the column is ~150px and two
                joined names truncated to `Ila…`, i.e. the useful half of the
                sentence was the part that got cut. */}
            {model.runners.length > 0 ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">
                  {model.runners[0]}
                  {model.runners.length > 1 ? ` +${model.runners.length - 1}` : ""}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-mono text-sm text-accent">{formatNumber(model.downloads)}</p>
          {growth !== null ? (
            <p className="font-mono text-[11px] text-ok" title={t(dict, "front.growth")}>
              {formatGrowth(growth)}
            </p>
          ) : (
            <p className={cn("font-mono text-[11px]", age <= 1 ? "text-ok" : "text-muted")} title={t(dict, "card.new")}>
              <Clock size={9} aria-hidden="true" className="mr-0.5 inline" />
              {age}d
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
