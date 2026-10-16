import Image from "next/image";
import { Download, HardDrive, Heart, Scale } from "lucide-react";
import { cn, daysSince, formatBytes, formatNumber } from "@/lib/format";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { categoryLabel } from "@/lib/classify/rules";
import { formatParams } from "@/lib/runner/vram";
import type { ClassifiedModel } from "@/lib/model";
import { Chip } from "./ui/Chip";
import { Meter } from "./ui/Stat";

/**
 * Data-first card.
 *
 * The gates in docs/en/DESIGN-V2.md §7 are the reason for every conditional
 * below: on the served snapshot `paramsTotal` exists on 6.5 % of models, `vramEstGb`
 * on 6.5 %, `license` on 27.4 %, `storageBytes` on 29.8 %, `runners` on 70.3 % and
 * `sampleImages` on 1.0 %. The old card printed a row for each of them anyway, so
 * four of its six rows read "params unknown" / "—" on a median card and a card
 * with no data looked exactly like a card full of data. A row now renders only
 * when it has something to say, the avatar shrank from 88 px to 44 px (56 px more
 * width for the title), and `downloads` is the one metric that gets weight.
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

  return (
    <article className="card p-4 overflow-hidden">
      <div className="flex gap-3">
        {model.sampleImages[0] ? (
          <Image
            src={model.sampleImages[0]}
            alt={model.name}
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-md object-cover border border-border"
          />
        ) : (
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-border bg-raised font-mono text-xs text-muted"
            aria-hidden="true"
          >
            {(model.author || model.name).slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {/* `min-w-0` + `line-clamp-2` instead of `break-words`: `overflow-wrap:
                break-word` does not lower min-content, so a 45-character repo id
                still set the grid track width. The chip keeps `shrink-0` so the
                badge is never squeezed by a long id. */}
            <a href={hrefFor(locale, `/m/${model.slug}`)} className="min-w-0 line-clamp-2 font-medium hover:text-accent">
              {model.externalId}
            </a>
            {model.qualityPassed ? null : <Chip label={t(dict, "card.gateFailed")} tone="warn" className="shrink-0" />}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span>{categoryLabel(model.primaryCategory)}</span>
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
              {t(dict, "card.new")} ({age}d)
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm">
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
            {model.vramEstGb ? <Chip label={`${t(dict, "card.vram")} ~${model.vramEstGb} GB`} tone="accent" /> : null}
            <a href={hrefFor(locale, `/compare?ids=${model.slug}`)} className="inline-flex min-h-7 items-center gap-1 text-accent">
              <Scale size={12} aria-hidden="true" />
              {t(dict, "compare.add")}
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
