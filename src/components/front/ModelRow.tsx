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
 * Unlike `FeedCard` this row is *only* a rank — it exists because a broadsheet
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
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>{categoryLabel(model.primaryCategory)}</span>
            {model.runners.length > 0 ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{model.runners.slice(0, 2).join(", ")}</span>
              </>
            ) : null}
            <span aria-hidden="true">·</span>
            <span className={cn("flex items-center gap-1", age <= 1 ? "text-ok" : undefined)}>
              <Clock size={10} aria-hidden="true" />
              {t(dict, "card.new")} ({age}d)
            </span>
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-mono text-sm text-accent">{formatNumber(model.downloads)}</p>
          {growth !== null ? (
            <p className="font-mono text-[11px] text-ok" title={t(dict, "front.growth")}>
              {formatGrowth(growth)}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
