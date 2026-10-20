import Link from "next/link";
import { ChevronUp, Filter, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode } from "react";
import { RUNNERS } from "@/lib/runner/detect";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { FEED_DEFAULTS, SORTS, WINDOWS } from "@/lib/query";
import { Field, SubmitButton } from "./ui/Controls";

const SIZES = [3, 8, 13, 30];

export function FilterBar({
  locale,
  category,
  query,
  gateForced,
  children
}: {
  locale: Locale;
  category?: string;
  query: Record<string, unknown>;
  gateForced: boolean;
  /** Saved filters, rendered inside the disclosure so they leave the first screen. */
  children?: ReactNode;
}) {
  const dict = dictionary(locale);
  const action = category ? hrefFor(locale, `/c/${category}`) : hrefFor(locale, "/models");

  /* `defaultValue` is what the select is pre-set to, so the summary below can
     tell "this filter is on" apart from "this is just the default". Before,
     every page claimed three active filters (window/sort/gate) that the user
     never chose. */
  const fields = [
    { name: "window", label: t(dict, "filters.window"), defaultValue: FEED_DEFAULTS.window, options: WINDOWS.map((w) => [w, w]), termSlug: "first-seen" },
    { name: "sort", label: t(dict, "filters.sort"), defaultValue: FEED_DEFAULTS.sort, options: SORTS.map((s) => [s, s]) },
    {
      name: "gate",
      label: t(dict, "filters.gate"),
      defaultValue: FEED_DEFAULTS.gate,
      termSlug: "quality-gate",
      options: [["passed", t(dict, "filters.passedOnly")], ["all", t(dict, "filters.showEverything")]]
    },
    { name: "runner", label: t(dict, "filters.runner"), defaultValue: "", options: [["", "—"], ...RUNNERS.map((r) => [r, r])], termSlug: "runner" },
    { name: "maxParams", label: t(dict, "filters.size"), defaultValue: "", options: [["", "—"], ...SIZES.map((s) => [String(s), `≤${s}B`])] },
    { name: "license", label: t(dict, "filters.license"), defaultValue: "", options: [["", "—"], ["apache-2.0", "apache-2.0"], ["mit", "mit"], ["other", "other"]] }
  ];

  /* Window and sort decide what the list *is*; the other four narrow it. Only
     the first two (plus search and Apply) stay on the first screen — the rest
     live in the disclosure with the saved-filter control. */
  const primary = fields.slice(0, 2);
  const secondary = fields.slice(2);

  /* Read the summary back off the select's own options, so it always prints the
     same words the control shows ("Sadece geçenler", not the raw "passed"). */
  function display(field: (typeof fields)[number], value: string): string {
    return field.options.find(([optionValue]) => optionValue === value)?.[1] ?? value;
  }

  const isSet = (field: (typeof fields)[number]) => {
    const value = String(query[field.name] ?? "");
    return value !== "" && value !== field.defaultValue;
  };

  const active = fields.filter(isSet).map((field) => `${field.label}: ${display(field, String(query[field.name]))}`);
  if (String(query.q ?? "") !== "") active.push(`${t(dict, "filters.search")}: ${String(query.q)}`);
  const secondaryActive = secondary.filter(isSet).length;

  return (
    <form method="get" action={action} className="rule-strong rule-bottom mb-4 pb-3 text-sm">
      <div className="flex flex-wrap items-end gap-2">
        {primary.map((field) => (
          <Field
            key={field.name}
            name={field.name}
            label={field.label}
            value={String(query[field.name] ?? "")}
            options={field.options}
            termSlug={field.termSlug}
            locale={locale}
          />
        ))}
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 xl:min-w-[180px]">
          <span className="label whitespace-nowrap text-muted">{t(dict, "filters.search")}</span>
          <input
            name="q"
            defaultValue={String(query.q ?? "")}
            placeholder="model name…"
            className="h-11 w-full border border-control bg-surface px-2.5 text-sm text-text"
          />
        </label>
        <SubmitButton label={t(dict, "filters.apply")} />

        {/* `.filters-more` (globals.css) keeps the summary in the row above — the
            button does not move — while the panel becomes a flex row of its own,
            so its four selects sit side by side across the full width instead of
            wrapping inside a button-width box. */}
        <details className="filters-more group">
          <summary className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 border border-rule px-3 text-muted hover:border-rule-strong hover:text-text">
            <SlidersHorizontal size={14} aria-hidden="true" className="group-open:hidden" />
            <ChevronUp size={14} aria-hidden="true" className="hidden group-open:inline" />
            {t(dict, "filters.more")}
            {secondaryActive > 0 ? <span className="font-mono text-xs text-accent">{secondaryActive}</span> : null}
          </summary>
          <div className="mt-2 hidden w-full flex-wrap items-end gap-2 border border-rule bg-surface p-2 group-open:flex">
            {secondary.map((field) => (
              <Field
                key={field.name}
                name={field.name}
                label={field.label}
                value={String(query[field.name] ?? "")}
                options={field.options}
                termSlug={field.termSlug}
                locale={locale}
                /* `flex-1` divides the row between the four selects instead of
                   leaving two thirds of it empty after content-sized boxes. */
                className="min-w-[150px] flex-1"
              />
            ))}
            {children}
          </div>
        </details>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        {active.length > 0 ? (
          <>
            <span className="flex items-center gap-2">
              <Filter size={12} aria-hidden="true" />
              {t(dict, "filters.active")}: {active.join(" · ")}
            </span>
            <Link href={action} className="flex items-center gap-1 hover:text-text">
              <X size={12} aria-hidden="true" />
              {t(dict, "filters.clear")}
            </Link>
          </>
        ) : null}
        {gateForced ? <span className="text-warn">{t(dict, "filters.showEverything")} ≤ 30d + category</span> : null}
      </div>
    </form>
  );
}
