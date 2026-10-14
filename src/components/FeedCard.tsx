import Image from "next/image";
import { cn, daysSince, formatNumber } from "@/lib/format";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { categoryLabel } from "@/lib/classify/rules";
import { formatParams } from "@/lib/runner/vram";
import type { ClassifiedModel } from "@/lib/model";

export function FeedCard({ model, locale }: { model: ClassifiedModel; locale: Locale }) {
  const dict = dictionary(locale);
  const age = daysSince(model.firstSeenAt);

  return (
    <article className="border border-border rounded-lg bg-surface p-3 overflow-hidden">
      <div className="flex flex-wrap gap-3">
        {model.sampleImages[0] ? (
          <Image
            src={model.sampleImages[0]}
            alt={model.name}
            width={120}
            height={120}
            className="h-24 w-24 rounded object-cover"
          />
        ) : (
          <div className="h-24 w-24 rounded bg-border" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <a href={hrefFor(locale, `/m/${model.slug}`)} className="font-medium break-words">
            {model.externalId}
          </a>

          <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted">
            <span>{categoryLabel(model.primaryCategory, locale)}</span>
            <span>{model.libraryName ?? "—"}</span>
            <span>{formatParams(model.paramsTotal)} {t(dict, "card.params")}</span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            <span className={cn("rounded px-2 py-0.5", age <= 7 ? "text-ok" : "text-muted")}>
              {t(dict, "card.new")} ({age}d)
            </span>
            <span className="text-muted">♥ {formatNumber(model.likes)}</span>
            <span className="text-muted">⬇ {formatNumber(model.downloads)}</span>
            <span
              className={cn(
                "rounded px-2 py-0.5",
                model.qualityPassed ? "text-ok" : "text-warn"
              )}
            >
              {model.qualityPassed ? t(dict, "card.gatePassed") : t(dict, "card.gateFailed")}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted">
            <span>
              {t(dict, "card.runners")}: {model.runners.length ? model.runners.join(" · ") : "—"}
            </span>
            <span>
              {t(dict, "card.vram")} ~{model.vramEstGb ?? "—"} GB
            </span>
            <span>
              {t(dict, "card.license")}: {model.license ?? "—"}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
