import { Filter, X } from "lucide-react";
import { RUNNERS } from "@/lib/runner/detect";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { SORTS, WINDOWS } from "@/lib/query";
import { Field, SubmitButton } from "./ui/Controls";

const SIZES = [3, 8, 13, 30];

export function FilterBar({
  locale,
  category,
  query,
  gateForced
}: {
  locale: Locale;
  category?: string;
  query: Record<string, unknown>;
  gateForced: boolean;
}) {
  const dict = dictionary(locale);
  const action = category ? hrefFor(locale, `/c/${category}`) : hrefFor(locale, "/");

  const fields = [
    { name: "window", label: t(dict, "filters.window"), options: WINDOWS.map((w) => [w, w]) },
    { name: "sort", label: t(dict, "filters.sort"), options: SORTS.map((s) => [s, s]) },
    {
      name: "gate",
      label: t(dict, "filters.gate"),
      options: [["passed", t(dict, "filters.passedOnly")], ["all", t(dict, "filters.showEverything")]]
    },
    { name: "runner", label: t(dict, "filters.runner"), options: [["", "—"], ...RUNNERS.map((r) => [r, r])] },
    { name: "maxParams", label: t(dict, "filters.size"), options: [["", "—"], ...SIZES.map((s) => [String(s), `≤${s}B`])] },
    { name: "license", label: t(dict, "filters.license"), options: [["", "—"], ["apache-2.0", "apache-2.0"], ["mit", "mit"], ["other", "other"]] }
  ];

  const active = fields
    .filter((field) => String(query[field.name] ?? "") !== "")
    .map((field) => `${field.label}: ${String(query[field.name])}`);

  return (
    /* One line at desktop widths: the fixed controls total ~903px (6 selects +
       Apply + 7 x 8px gaps) and the search field is the only item with flex-1,
       so it absorbs the slack instead of pushing Apply onto a second row.
       Measured row width is 1094px at a 1440+ viewport. */
    <form method="get" action={action} className="card p-3 text-sm">
      <div className="flex flex-wrap items-end gap-2">
        {fields.map((field) => (
          <Field key={field.name} name={field.name} label={field.label} value={String(query[field.name] ?? "")} options={field.options} />
        ))}
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 xl:min-w-[180px]">
          <span className="text-xs uppercase tracking-wide text-muted whitespace-nowrap">{t(dict, "filters.search")}</span>
          <input
            name="q"
            defaultValue={String(query.q ?? "")}
            placeholder="model name…"
            className="w-full rounded-md border border-border bg-raised px-2.5 py-1.5 text-sm text-text"
          />
        </label>
        <SubmitButton label={t(dict, "filters.apply")} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        {active.length > 0 ? (
          <span className="flex items-center gap-2">
            <Filter size={12} aria-hidden="true" />
            {t(dict, "filters.active")}: {active.join(" · ")}
          </span>
        ) : null}
        <a href={action} className="flex items-center gap-1 hover:text-text">
          <X size={12} aria-hidden="true" />
          {t(dict, "filters.clear")}
        </a>
        {gateForced ? <span className="text-warn">{t(dict, "filters.showEverything")} ≤ 30d + category</span> : null}
      </div>
    </form>
  );
}
