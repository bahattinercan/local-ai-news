import { Fragment } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { categoryLabel } from "@/lib/classify/rules";
import { daysTracked, type CompareDifference, type CompareGroup } from "@/lib/compare";
import { cn } from "@/lib/format";
import type { ClassifiedModel } from "@/lib/model";
import { PressPlate } from "@/components/ui/PressPlate";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";

/**
 * The pair sheet (docs/en/COMPARE-PLAN.md §3.2).
 *
 * Three measured decisions are baked into this markup:
 *
 *  - `table-layout: fixed` with a fixed 88 px / 140 px label column. The old sheet
 *    let the browser distribute width, so the label column fell to 77 px with
 *    three models and 60 px with six — the labels that explain the numbers were
 *    the first thing to go.
 *  - `overflow-x: auto` **with `overflow-y: clip`** on the wrapper. A plain
 *    `overflow-x: auto` computes `overflow-y: auto` and turns the wrapper into a
 *    scroll port, which silently killed the sticky header (measured: header top
 *    −31 px after a 362 px page scroll). `clip` keeps the horizontal scroll and
 *    leaves `position: sticky` referencing the viewport.
 *  - Below 768 px the table keeps a 148 px minimum per model column and scrolls
 *    horizontally, with the label column pinned left, instead of squeezing six
 *    columns into 341 px (measured: 29 px labels, a 289 px header row).
 */
export function CompareSheet({
  locale,
  models,
  groups,
  differences,
  footnoteId
}: {
  locale: Locale;
  models: ClassifiedModel[];
  groups: CompareGroup[];
  differences: CompareDifference[];
  footnoteId: string;
}) {
  const dict = dictionary(locale);
  const now = Date.now();

  const withoutSlug = (slug: string) =>
    hrefFor(
      locale,
      models.length <= 1
        ? "/compare"
        : `/compare?ids=${models
            .filter((model) => model.slug !== slug)
            .map((model) => encodeURIComponent(model.slug))
            .join(",")}`
    );

  return (
    <>
      <div
        className="compare-scroll"
        role="group"
        aria-label={t(dict, "compare.caption", { count: models.length })}
        tabIndex={0}
      >
        <table
          className="compare-table"
          style={{ ["--compare-cols" as string]: String(models.length) }}
          aria-describedby={footnoteId}
        >
          <caption className="sr-only">{t(dict, "compare.caption", { count: models.length })}</caption>
          <colgroup>
            <col className="compare-label-col" />
            {models.map((model) => (
              <col key={model.slug} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="compare-label p-0" aria-hidden="true" />
              {models.map((model, index) => (
                <th scope="col" key={model.slug} className="p-0 text-left align-bottom font-normal">
                  <div className="px-3 pt-2 pb-1.5">
                    <div className="flex items-start gap-2">
                      {/* Decorative, and the first thing to go when a column is
                          narrow: at 768 px with four models the plate plus the
                          remove button left the name 53 px of room and the
                          header row grew to 189 px. */}
                      <PressPlate
                        slug={model.slug}
                        name={model.name}
                        className="hidden h-8 w-8 shrink-0 border border-rule lg:block"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-1">
                          <Link
                            href={hrefFor(locale, `/m/${model.slug}`)}
                            title={model.externalId}
                            className="line-clamp-2 min-w-0 break-words text-row font-semibold leading-tight hover:text-accent"
                          >
                            {model.name}
                          </Link>
                          <Link
                            href={withoutSlug(model.slug)}
                            aria-label={`${t(dict, "compare.remove")}: ${model.name}`}
                            className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-muted hover:text-accent"
                          >
                            <X size={13} aria-hidden="true" />
                          </Link>
                        </div>
                        <p className="mt-0.5 min-w-0 truncate text-xs text-muted">
                          {model.externalId.split("/")[0]} · {categoryLabel(model.primaryCategory)} ·{' '}
                          {t(dict, "compare.ageDays", { days: daysTracked(model.firstSeenAt, now) })}
                        </p>
                        {index === 0 ? (
                          /* Phones drop the marker: the column is first in reading
                             order, and the header row has 30 px less to spend there. */
                          <p className="label hidden text-muted sm:block">{t(dict, "compare.baseline")}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.key}>
                <tr className="compare-group">
                  <th scope="colgroup" colSpan={models.length + 1} className="px-3 py-1.5 text-left">
                    <span className="section-title flex-wrap">
                      {group.title}
                      <span className="section-note">
                        {t(dict, "compare.coverage", { reported: group.reported, total: models.length })}
                      </span>
                    </span>
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.key}>
                    <th
                      scope="row"
                      title={row.hint ?? undefined}
                      className="compare-label px-2 py-2 text-left align-top text-[11px] leading-snug font-normal text-muted sm:px-3 sm:text-xs"
                    >
                      {row.label}
                      {row.reported < models.length ? (
                        <span className="block text-[11px] text-muted/70">
                          {t(dict, "compare.partial", { reported: row.reported, total: models.length })}
                        </span>
                      ) : null}
                    </th>
                    {row.values.map((cell, index) => (
                      <td
                        key={models[index].slug}
                        className={cn(
                          "px-3 py-2 align-top font-mono text-sm tabular-nums",
                          cell.best && "font-semibold text-accent",
                          cell.text === null && "text-muted"
                        )}
                      >
                        {cell.text === null ? (
                          <span title={t(dict, "compare.notReported")}>—</span>
                        ) : cell.href ? (
                          <a href={cell.href} className="hover:text-accent">
                            {cell.text}
                          </a>
                        ) : (
                          cell.text
                        )}
                        {cell.best ? <span className="text-xs font-normal text-muted"> · {t(dict, "compare.best")}</span> : null}
                        {cell.delta ? <span className="block text-xs font-normal text-muted">{cell.delta}</span> : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {differences.length > 0 ? (
        <section className="mt-5">
          <h2 className="section-title flex-wrap">
            {t(dict, "compare.topDifferences")}
            <span className="section-note">{t(dict, "compare.topDifferencesNote")}</span>
          </h2>
          <ul className="mt-1">
            {differences.map((difference) => (
              <li key={difference.key} className="rule-bottom py-1.5 text-sm">
                <span className="text-muted">{difference.label}</span>{" "}
                <span className="font-mono tabular-nums">
                  {difference.left} vs {difference.right}
                </span>{" "}
                <span className="font-mono text-xs text-muted">({difference.ratio})</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

/**
 * The rule the sheet follows, printed instead of implied (C7). It is referenced by
 * `aria-describedby` from the table, so a screen reader gets it too.
 */
export function CompareFootnote({ locale, id }: { locale: Locale; id: string }) {
  const dict = dictionary(locale);
  return (
    <p id={id} className="mt-4 text-xs leading-relaxed text-muted">
      {t(dict, "compare.howToRead")}
    </p>
  );
}
