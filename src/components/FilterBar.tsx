import { RUNNERS } from "@/lib/runner/detect";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { SORTS, WINDOWS } from "@/lib/query";

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

  return (
    <form method="get" action={action} className="flex flex-wrap items-end gap-3 border border-border rounded-lg bg-surface p-3 text-sm">
      {fields.map((field) => (
        <label key={field.name} className="flex flex-col gap-1">
          <span className="text-muted">{field.label}</span>
          <select name={field.name} defaultValue={String(query[field.name] ?? "")} className="rounded border border-border bg-bg px-2 py-1">
            {field.options.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ))}

      <label className="flex flex-col gap-1">
        <span className="text-muted">{t(dict, "filters.search")}</span>
        <input name="q" defaultValue={String(query.q ?? "")} className="rounded border border-border bg-bg px-2 py-1" />
      </label>

      <button type="submit" className="rounded border border-border bg-bg px-3 py-1.5">
        {t(dict, "filters.apply")}
      </button>

      {gateForced ? <span className="text-warn">{t(dict, "filters.showEverything")} ≤ 30d + category</span> : null}
    </form>
  );
}
