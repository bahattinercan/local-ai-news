import { CATEGORY_RULES } from "@/lib/classify/rules";
import { getStats } from "@/lib/store";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { cn } from "@/lib/format";

export async function TabBar({ locale, active }: { locale: Locale; active?: string }) {
  const dict = dictionary(locale);
  const counts = await getStats(30);
  const countMap = new Map(counts.map((row) => [row.category, row.count]));

  const tabs = [
    { key: "", label: t(dict, "nav.all"), count: counts.reduce((sum, row) => sum + row.count, 0) },
    ...CATEGORY_RULES
      .filter((rule) => rule.key !== "news")
      .map((rule) => ({
        key: rule.key,
        label: t(dict, `nav.${rule.key}`),
        count: countMap.get(rule.key) ?? 0
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
