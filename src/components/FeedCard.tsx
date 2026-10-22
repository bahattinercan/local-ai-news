import Link from "next/link";
import { Download, HardDrive, Heart, Scale } from "lucide-react";
import { cn, daysSince, formatBytes, formatNumber } from "@/lib/format";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { categoryLabel } from "@/lib/classify/rules";
import { formatParams } from "@/lib/runner/vram";
import type { ClassifiedModel } from "@/lib/model";
import { getGlossaryEntry, glossaryText } from "@/lib/glossary";
import { Chip } from "./ui/Chip";
import { PressPlate } from "./ui/PressPlate";
import { Term } from "./ui/Term";
import { Meter } from "./ui/Stat";

/**
 * A ruled index row (docs/en/DESIGN-V3.md §1 rule 2, §7.2 `ModelRow`).
 *
 * The card wrapper is gone: a border, a radius, a shadow and 16 px of padding on
 * all four sides wrapped the same two lines of text, and the gap between cards
 * added the rest. A 1 px rule and 12 px of padding separate rows just as clearly
 * and cost roughly 40 % less height per row.
 *
 * Every data rule from DESIGN-V2 §7 is kept, because they were earned by
 * measurement on the served snapshot: a row renders a field only when it exists
 * (`paramsTotal` 6.2 %, `vramEstGb` 6.2 %, `license` 24.5 %, `storageBytes` 26.1 %,
 * `runners` 100 %), `downloads` carries the weight, and the avatar is a 52 px
 * plate instead of an 88 px monogram.
 */
export function FeedCard({
  model,
  locale,
  maxDownloads = 0
}: {
  model: ClassifiedModel;
  locale: Locale;
  maxDownloads?: number;
}) {
  const dict = dictionary(locale);
  const age = daysSince(model.firstSeenAt);
  const share = maxDownloads > 0 && model.downloads > 0 ? Math.round((model.downloads / maxDownloads) * 100) : null;
  /* The chip links its own definition; VRAM is the most misread metric here. */
  const vramEntry = getGlossaryEntry("vram");
  const vramSummary = vramEntry ? glossaryText(vramEntry, locale).summary : "";
  const href = hrefFor(locale, `/m/${model.slug}`);

  return (
    <article className="rule-bottom overflow-hidden">
      <div className="flex gap-3 py-3">
        <Link href={href} tabIndex={-1} className="shrink-0" aria-hidden="true">
          <PressPlate slug={model.slug} name={model.name} className="h-12 w-12 border border-rule" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {/* `min-w-0` + `line-clamp-2` instead of `break-words`: `overflow-wrap:
                break-word` does not lower min-content, so a 45-character repo id
                still set the grid track width. The chip keeps `shrink-0` so the
                badge is never squeezed by a long id. */}
            <Link href={href} className="min-h-6 min-w-0 line-clamp-2 text-row font-semibold hover:underline">
              {model.externalId}
            </Link>
            {model.qualityPassed ? null : <Chip label={t(dict, "card.gateFailed")} tone="warn" className="shrink-0" />}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted">
            <span>{categoryLabel(model.primaryCategory, locale)}</span>
            {model.libraryName ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{model.libraryName}</span>
              </>
            ) : null}
            {model.paramsTotal ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{`${formatParams(model.paramsTotal)} ${t(dict, "card.params")}`}</span>
              </>
            ) : null}
            <span aria-hidden="true">·</span>
            <span className={cn(age <= 7 ? "text-ok" : "text-muted")}>
              <Term slug="first-seen" locale={locale}>
                {t(dict, "card.new")} ({age}d)
              </Term>
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm">
            <span className="flex items-center gap-1 font-medium text-accent">
              <Download size={13} aria-hidden="true" /> {formatNumber(model.downloads)}
            </span>
            {model.likes > 0 ? (
              <span className="flex items-center gap-1 text-muted">
                <Heart size={13} aria-hidden="true" /> {formatNumber(model.likes)}
              </span>
            ) : null}
            {model.storageBytes ? (
              <span className="flex items-center gap-1 text-muted">
                <HardDrive size={13} aria-hidden="true" /> {formatBytes(model.storageBytes)}
              </span>
            ) : null}
            {model.runners.length > 0 ? <span className="text-muted">{model.runners.join(" · ")}</span> : null}
          </div>

          {share !== null ? (
            <div className="mt-2">
              <Meter
                value={model.downloads}
                max={maxDownloads}
                tone={model.qualityPassed ? "accent" : "muted"}
                label={`${t(dict, "card.popularity")}: ${share}%`}
              />
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {model.license ? <Chip label={model.license} /> : null}
            {model.vramEstGb ? (
              <Link
                href={hrefFor(locale, "/glossary/vram")}
                title={vramSummary}
                aria-label={`${t(dict, "card.vram")} ~${model.vramEstGb} GB - ${vramSummary}`}
              >
                <Chip label={`${t(dict, "card.vram")} ~${model.vramEstGb} GB`} tone="accent" />
              </Link>
            ) : null}
            <Link
              href={hrefFor(locale, `/compare?ids=${model.slug}`)}
              className="inline-flex min-h-6 items-center gap-1 text-accent"
            >
              <Scale size={12} aria-hidden="true" />
              {t(dict, "compare.add")}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
