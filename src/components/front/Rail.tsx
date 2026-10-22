import Link from "next/link";
import { Terminal } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { runCommand } from "@/lib/runner/command";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { CopyCommand } from "../CopyCommand";
import type { ClassifiedModel } from "@/lib/model";

/**
 * The caption over the command specimen: the model and why it is the one being
 * advertised. Exported because `page.tsx` has to know how wide it renders to pick
 * a model whose caption is not truncated (`railLines(promoCaption(model))`).
 */
export function promoCaption(model: ClassifiedModel): string {
  return `${model.name} · ${formatNumber(model.downloads)}`;
}

/**
 * The tinted box in the rail (docs/en/DESIGN-V3.md §1 zone 6, right).
 *
 * The reference spends its one coloured box on an advertisement; the most useful
 * thing this site can advertise is the fact that every model page ends in a
 * command you can paste. So the box is the site's own CTA, on `--promo` with ink
 * text (14.64:1 - checked by `scripts/contrast.ts`). `--promo` is a shade of the
 * page, not a coloured panel: the original blue block read as a foreign element in
 * a newsprint column, so the box is separated by its `--rule` border and its
 * `--surface` command slip alone.
 *
 * It prints a real command for a real model from `runCommand()`, which is the
 * same function the model page uses, so the box can never advertise a command the
 * site does not actually give.
 *
 * Layout: the command owns the full width of the rail and the actions sit on
 * their own row. Sharing one row with the copy button left the command 129 px
 * wide - 8 wrapped lines clamped to 2, i.e. `from transformers i / mport
 * AutoModelFor…` with a third line cut in half (measured 1440 px, 2026-10-18).
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

      {/* The caption is set in the same 11 px mono as the specimen - it is the
          specimen's label, not a headline - and its figure is `shrink-0`: the row
          used to be a single `truncate`, so a 25-character name left the reader
          with "35.4" of "35.4k". */}
      <Link
        href={hrefFor(locale, `/m/${model.slug}`)}
        title={model.externalId}
        className="mt-3 flex min-h-6 items-center gap-2 font-mono text-[11px] hover:underline"
      >
        <span className="truncate">{model.name}</span>
        <span className="shrink-0 text-muted">· {formatNumber(model.downloads)}</span>
      </Link>

      {/* 36 characters a line at 11 px mono, so the command that fits the two-line
          budget reads as a specimen instead of a shred. `break-words` (not
          `break-all`) wraps at the spaces first and inside a token only when the
          token cannot fit a line alone; `-mx-2` buys those 36 columns back from
          the box's padding while keeping `px-2` inside the hairline. `line-clamp-4`
          is a backstop for a command the selector could not avoid, and it renders
          an ellipsis instead of slicing a line through the middle, which is what
          the two-line `break-all` box did. The copy button and the model page
          still carry the whole string. */}
      <code className="mt-2 -mx-2 line-clamp-4 block break-words border border-rule bg-surface px-2 py-1.5 font-mono text-[11px] leading-4">
        {command}
      </code>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        <CopyCommand text={command} label={t(dict, "common.copy")} copiedLabel={t(dict, "common.copied")} />
        <Link href={hrefFor(locale, `/m/${model.slug}`)} className="arrow-link label text-accent">
          {t(dict, "common.viewModel")}
        </Link>
      </div>
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
