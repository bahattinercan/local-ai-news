import { CATEGORY_RULES, categoryLabel } from "@/lib/classify/rules";
import { getCategoryCounts } from "@/lib/store";
import { FEED_DEFAULTS, windowDays } from "@/lib/query";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { cn } from "@/lib/format";

/**
 * Counts describe the feed the tab opens (default window, quality gate applied,
 * gated repos hidden), not the raw number of tracked models.
 */
export async function TabBar({ locale, active }: { locale: Locale; active?: string }) {
  const dict = dictionary(locale);
  const { total, counts } = await getCategoryCounts(windowDays(FEED_DEFAULTS.window), FEED_DEFAULTS.gate);

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

  return (
    <nav
      className="flex flex-wrap gap-2 py-3 text-sm"
      aria-label={t(dict, "brand")}
    >
      {tabs.map((tab) => {
        const href = tab.key ? hrefFor(locale, `/c/${tab.key}`) : hrefFor(locale, "/");
        const isActive = tab.key === (active ?? "");
        return (
          <a
            key={tab.key || "all"}
            href={href}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-md border border-border px-3 py-1.5",
              isActive ? "bg-raised text-accent border-accent/45" : "text-muted hover:text-text hover:border-raised"
            )}
          >
            {tab.label}
            <span className={cn("font-mono text-xs", isActive ? "text-accent" : "text-muted")}>{tab.count}</span>
          </a>
        );
      })}
    </nav>
  );
}
