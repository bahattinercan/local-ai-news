import Image from "next/image";
import { Clock, Download, HardDrive, Heart, Scale } from "lucide-react";
import { cn, daysSince, formatBytes, formatNumber } from "@/lib/format";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { categoryLabel } from "@/lib/classify/rules";
import { formatParams } from "@/lib/runner/vram";
import type { ClassifiedModel } from "@/lib/model";
import { Chip } from "./ui/Chip";
import { Meter } from "./ui/Stat";

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

  return (
    <article className="card p-4 overflow-hidden">
      <div className="flex gap-3">
        {model.sampleImages[0] ? (
          <Image
            src={model.sampleImages[0]}
            alt={model.name}
            width={88}
            height={88}
            className="h-22 w-22 rounded-md object-cover border border-border"
          />
        ) : (
          <div
            className="h-22 w-22 rounded-md border border-border bg-raised grid place-items-center font-mono text-sm text-muted"
            aria-hidden="true"
          >
            {(model.author || model.name).slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            {/* `min-w-0` + `line-clamp-2` instead of `break-words`: `overflow-wrap:
                break-word` does not lower min-content, so the id still set the
                track width. The chip keeps `shrink-0` so the badge never gets
                squeezed by a long id. */}
            <a href={hrefFor(locale, `/m/${model.slug}`)} className="min-w-0 line-clamp-2 font-medium hover:text-accent">
              {model.externalId}
            </a>
            <Chip
              label={model.qualityPassed ? t(dict, "card.gatePassed") : t(dict, "card.gateFailed")}
              tone={model.qualityPassed ? "ok" : "warn"}
              className="shrink-0"
            />
          </div>

          <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
            <span>{categoryLabel(model.primaryCategory)}</span>
            <span aria-hidden="true">·</span>
            <span>{model.libraryName ?? "—"}</span>
            <span aria-hidden="true">·</span>
            <span>{model.paramsTotal ? `${formatParams(model.paramsTotal)} ${t(dict, "card.params")}` : t(dict, "card.paramsUnknown")}</span>
            <span aria-hidden="true">·</span>
            <span className={cn(age <= 7 ? "text-ok" : "text-muted")}>
              {t(dict, "card.new")} ({age}d)
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-xs text-muted">
            <span className="flex items-center gap-1">
              <Heart size={12} aria-hidden="true" /> {formatNumber(model.likes)}
            </span>
            <span className="flex items-center gap-1">
              <Download size={12} aria-hidden="true" /> {formatNumber(model.downloads)}
            </span>
            {model.storageBytes ? (
              <span className="flex items-center gap-1">
                <HardDrive size={12} aria-hidden="true" /> {formatBytes(model.storageBytes)}
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <Clock size={12} aria-hidden="true" /> {model.runners.length ? model.runners.join(" · ") : "—"}
            </span>
          </div>

          <div className="mt-2">
            <Meter value={model.downloads} max={maxDownloads} tone={model.qualityPassed ? "accent" : "muted"} />
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
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
