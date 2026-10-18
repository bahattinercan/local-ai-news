import Link from "next/link";
import { Terminal } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { runCommand } from "@/lib/runner/command";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { CopyCommand } from "../CopyCommand";
import type { ClassifiedModel } from "@/lib/model";

/**
 * The tinted box in the rail (docs/en/DESIGN-V3.md §1 zone 6, right).
 *
 * The reference spends its one coloured box on an advertisement; the most useful
 * thing this site can advertise is the fact that every model page ends in a
 * command you can paste. So the box is the site's own CTA, on the paper token
 * (`--promo`) with ink text (14.22:1 — checked by `scripts/contrast.ts`).
 *
 * It prints a real command for a real model from `runCommand()`, which is the
 * same function the model page uses, so the box can never advertise a command the
 * site does not actually give.
 */
export function PromoBox({ model, locale }: { model: ClassifiedModel; locale: Locale }) {
  const dict = dictionary(locale);
  const command = runCommand(model);

  return (
    <section className="promo border border-rule p-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
        <Terminal size={16} aria-hidden="true" />
        {t(dict, "front.runIt")}
      </h2>
      <p className="mt-1 text-sm">{t(dict, "front.runItNote")}</p>

      <Link
        href={hrefFor(locale, `/m/${model.slug}`)}
        title={model.externalId}
        className="mt-3 flex min-h-6 items-center truncate font-mono text-xs hover:underline"
      >
        {model.name}
        <span className="text-muted"> · {formatNumber(model.downloads)}</span>
      </Link>

      {/* The command is a 95-character repo id at worst, and the rail is ~250 px:
          two clamped lines are the advertisement, the copy button has the whole
          thing, and the model page prints it in full. */}
      <div className="mt-2 flex items-start gap-2">
        <code className="line-clamp-2 min-w-0 flex-1 break-all border border-rule bg-surface px-2 py-1.5 font-mono text-[11px] leading-4">
          {command}
        </code>
        <CopyCommand text={command} label={t(dict, "common.copy")} />
      </div>

      <Link href={hrefFor(locale, `/m/${model.slug}`)} className="arrow-link label mt-3 inline-block text-accent">
        {t(dict, "common.viewModel")}
      </Link>
    </section>
  );
}

/**
 * The "subscribe" box, which on this site is not an email list: the paper already
 * has a syndication feed and a published cadence, so the box says so and links to
 * the RSS route (`/feed.rss` is a route handler, so this stays an `<a>`).
 */
export function RssBox({ locale }: { locale: Locale }) {
  const dict = dictionary(locale);

  return (
    <section className="border border-rule-strong p-4">
      <h2 className="font-display text-lg font-bold tracking-tight">{t(dict, "front.rss")}</h2>
      <p className="mt-1 text-sm text-muted">{t(dict, "front.rssNote")}</p>
      <a
        href={`/feed.rss?lang=${locale}`}
        className="label mt-3 inline-block border border-rule-strong bg-text px-4 py-2.5 text-bg hover:opacity-90"
      >
        {t(dict, "front.rssCta")}
      </a>
    </section>
  );
}
