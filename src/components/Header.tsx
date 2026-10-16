import Link from "next/link";
import { BarChart3, BookOpen, FlaskConical, Menu, Newspaper, Radar, Scale } from "lucide-react";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { LangSwitch } from "./LangSwitch";
import { ThemeToggle } from "./ThemeToggle";

/**
 * One row at every width.
 *
 * Before: brand + tagline + four labelled pills + language switch + theme toggle
 * in a single `flex-wrap`, which measured **103 px** tall at 1440 (the nav fell to
 * a second row), 143 px at 390 and 179 px at 360 — and the header is sticky, so a
 * phone permanently lost 22 % of its viewport. The tagline moved into the page
 * body (it was also `hidden md:block`, i.e. invisible on phones).
 *
 * Below `sm` the four links do not fit next to the brand (measured: the nav was
 * 276 px wide at 320 px), so they move into a `<details>` overflow menu that needs
 * no JavaScript. Every control is a 44 px target.
 */
export function Header({ locale }: { locale: Locale }) {
  const dict = dictionary(locale);
  const links = [
    { href: hrefFor(locale, "/news"), label: t(dict, "nav.news"), icon: Newspaper },
    { href: hrefFor(locale, "/research"), label: t(dict, "nav.research"), icon: FlaskConical },
    { href: hrefFor(locale, "/stats"), label: t(dict, "nav.stats"), icon: BarChart3 },
    { href: hrefFor(locale, "/compare"), label: t(dict, "nav.compare"), icon: Scale },
    { href: hrefFor(locale, "/glossary"), label: t(dict, "nav.glossary"), icon: BookOpen }
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:h-16">
        <Link href={hrefFor(locale, "/")} className="flex h-11 min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border bg-raised" aria-hidden="true">
            <Radar size={16} className="text-accent" />
          </span>
          <span className="truncate font-semibold tracking-tight">{t(dict, "brand")}</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 sm:flex" aria-label={t(dict, "nav.primary")}>
          {links.slice(0, 4).map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                className="flex h-11 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted hover:bg-raised hover:text-accent"
              >
                <Icon size={16} aria-hidden="true" />
                <span className="hidden lg:inline">{link.label}</span>
              </Link>
            );
          })}
          <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
          <LangSwitch locale={locale} label={t(dict, "common.language")} />
          <ThemeToggle />
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:hidden">
          <details className="relative">
            <summary
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border border-border bg-raised text-muted"
              aria-label={t(dict, "nav.primary")}
            >
              <Menu size={16} aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-full z-40 mt-2 w-60 rounded-md border border-border bg-surface p-2 shadow-[var(--shadow-lift)]">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex h-11 items-center gap-2 rounded-md px-3 text-sm text-muted hover:bg-raised hover:text-accent"
                  >
                    <Icon size={16} aria-hidden="true" />
                    {link.label}
                  </Link>
                );
              })}
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 pl-3">
                <span className="text-xs text-muted">{t(dict, "common.language")}</span>
                <LangSwitch locale={locale} label={t(dict, "common.language")} />
              </div>
            </div>
          </details>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
