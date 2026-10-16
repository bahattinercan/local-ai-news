import Link from "next/link";
import { CATEGORY_RULES, categoryLabel } from "@/lib/classify/rules";
import { getCategoryCounts } from "@/lib/store";
import { FEED_DEFAULTS, type FeedFilterInput } from "@/lib/query";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { cn } from "@/lib/format";

/**
 * Category strip. The badge counts what the tab opens — the reader's current
 * filters applied to that category — so the number here always equals the total
 * the destination page prints. `active` is passed by the page that owns the
 * category, because a layout never receives the route params.
 */
export async function TabBar({
  locale,
  active,
  filters
}: {
  locale: Locale;
  active?: string;
  filters?: FeedFilterInput;
}) {
  const dict = dictionary(locale);
  const input: FeedFilterInput = filters ?? {
    window: FEED_DEFAULTS.window,
    sort: FEED_DEFAULTS.sort,
    gate: FEED_DEFAULTS.gate
  };
  const { total, counts } = await getCategoryCounts(input);

  const tabs = [
    { key: "", label: t(dict, "nav.all"), count: total },
    ...CATEGORY_RULES
      .filter((rule) => rule.key !== "news")
      .map((rule) => ({
        key: rule.key,
        label: categoryLabel(rule.key),
        count: counts.get(rule.key) ?? 0
      }))
  ];

  /* Switching category keeps the active filters; without this the destination
     would silently reset to the default view and every badge but the default
     one would be wrong. Default values stay out of the URL. */
  const params = new URLSearchParams();
  if (input.window !== FEED_DEFAULTS.window) params.set("window", input.window);
  if (input.sort !== FEED_DEFAULTS.sort) params.set("sort", input.sort);
  if (input.gate !== FEED_DEFAULTS.gate) params.set("gate", input.gate);
  if (input.runner) params.set("runner", input.runner);
  if (input.maxParams) params.set("maxParams", String(input.maxParams));
  if (input.license) params.set("license", input.license);
  if (input.q) params.set("q", input.q);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";

  return (
    <nav
      /* One scrollable row at every width: ten 44 px pills in a wrapping flex
         took two rows at 1440 (120 px) and five on a phone, pushing the first
         model card off the first screen. */
      className="no-scrollbar flex gap-2 overflow-x-auto py-2 text-sm"
      aria-label={t(dict, "nav.primary")}
    >
      {tabs.map((tab) => {
        const href = `${hrefFor(locale, tab.key ? `/c/${tab.key}` : "/")}${suffix}`;
        const isActive = tab.key === (active ?? "");
        return (
          <Link
            key={tab.key || "all"}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-border px-3",
              isActive ? "bg-raised text-accent border-accent/45" : "text-muted hover:text-text hover:border-raised"
            )}
          >
            {tab.label}
            <span className={cn("font-mono text-xs", isActive ? "text-accent" : "text-muted")}>{tab.count}</span>
          </Link>
        );
      })}
    </nav>
  );
}
