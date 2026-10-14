import { CATEGORY_RULES } from "@/lib/classify/rules";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { cn } from "@/lib/format";

export function TabBar({ locale, active }: { locale: Locale; active?: string }) {
  const dict = dictionary(locale);
  const tabs = [
    { key: "", label: t(dict, "nav.all") },
    ...CATEGORY_RULES.map((rule) => ({ key: rule.key, label: t(dict, `nav.${rule.key}`) }))
  ];

  return (
    <nav className="flex flex-wrap gap-2 py-3 text-sm" aria-label={t(dict, "brand")}>
      {tabs.map((tab) => {
        const href = tab.key ? hrefFor(locale, `/c/${tab.key}`) : hrefFor(locale, "/");
        const isActive = tab.key === (active ?? "");
        return (
          <a
            key={tab.key || "all"}
            href={href}
            className={cn(
              "whitespace-nowrap rounded-md border border-border px-3 py-1.5",
              isActive ? "bg-surface text-accent" : "text-muted"
            )}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
