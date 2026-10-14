import { BarChart3, Newspaper, Radar, Scale } from "lucide-react";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { cn } from "@/lib/format";
import { ThemeToggle } from "./ThemeToggle";

export function Header({ locale }: { locale: Locale }) {
  const dict = dictionary(locale);
  const links = [
    { href: hrefFor(locale, "/news"), label: t(dict, "nav.news"), icon: Newspaper },
    { href: hrefFor(locale, "/stats"), label: t(dict, "nav.stats"), icon: BarChart3 },
    { href: hrefFor(locale, "/compare"), label: t(dict, "nav.compare"), icon: Scale }
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <a href={hrefFor(locale, "/")} className="flex items-center gap-2">
          <span className="relative grid place-items-center w-8 h-8 rounded-md border border-border bg-raised">
            <Radar size={16} className="text-accent" aria-hidden="true" />
          </span>
          <span className="font-semibold tracking-tight">{t(dict, "brand")}</span>
        </a>

        <span className="hidden md:block text-sm text-muted">{t(dict, "tagline")}</span>

        <nav className="ml-auto flex flex-wrap items-center gap-1.5 text-sm" aria-label={t(dict, "brand")}>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.href}
                href={link.href}
                className={cn("flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-muted hover:text-accent hover:border-accent/50")}
              >
                <Icon size={14} aria-hidden="true" />
                {link.label}
              </a>
            );
          })}

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-md border border-border bg-raised px-2 py-1.5">
              {(["en", "tr"] as const).map((option) => (
                <a
                  key={option}
                  href={hrefFor(option, "/")}
                  className={cn("font-mono text-xs", option === locale ? "text-accent" : "text-muted")}
                >
                  {option.toUpperCase()}
                </a>
              ))}
            </div>
            <ThemeToggle />
          </div>
        </nav>
      </div>
    </header>
  );
}
