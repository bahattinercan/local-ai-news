import Link from "next/link";
import { BarChart3, BookOpen, FlaskConical, Menu, Newspaper, Scale } from "lucide-react";
import { getPulse } from "@/lib/store";
import { formatClock, formatEditionDate, formatNumber } from "@/lib/format";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { LangSwitch } from "../LangSwitch";
import { ThemeToggle } from "../ThemeToggle";

/**
 * The nameplate (docs/en/DESIGN-V3.md §1 zones 1–3).
 *
 * Three zones on one row, like the reference: the publication's seal and origin
 * (left), its name between two hairlines plus a dateline (centre), and one live
 * figure from the edition (right).
 *
 * The widths are not decorative. Measured at 1 440 px with a 1 260 px container:
 * the three zones need ~1 160 px, so every block has a fixed job -
 *  - the seal is the *engraving* (the reference puts its seal on the left, and
 *    that is also the only place the old radar ornament survives);
 *  - the right block prints two short mono lines instead of one long one, because
 *    "1 633 models in window · 617 pass the gate" on a single line measured ~250 px
 *    and pushed the nameplate into wrapping to two lines;
 *  - the nameplate never wraps (`whitespace-nowrap`) and steps down to 24 px below
 *    `xl`, where the container cannot afford the 30 px setting.
 */
export async function Masthead({ locale }: { locale: Locale }) {
  const dict = dictionary(locale);
  const days = 7;
  const pulse = await getPulse(days);

  /* The header links are the site's sections, not the categories: categories are the
     desk nav's job, and repeating them here would double every destination. */
  const sections = [
    { href: hrefFor(locale, "/news"), label: t(dict, "nav.news"), icon: Newspaper },
    { href: hrefFor(locale, "/research"), label: t(dict, "nav.research"), icon: FlaskConical },
    { href: hrefFor(locale, "/stats"), label: t(dict, "nav.stats"), icon: BarChart3 },
    { href: hrefFor(locale, "/compare"), label: t(dict, "nav.compare"), icon: Scale },
    { href: hrefFor(locale, "/glossary"), label: t(dict, "nav.glossary"), icon: BookOpen }
  ];

  const edition = formatEditionDate(pulse?.generatedAt, locale);
  const clock = formatClock(pulse?.generatedAt);

  return (
    <header className="border-b border-rule-strong bg-bg">
      <div className="shell">
        <div className="grid grid-cols-1 gap-2 py-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-6">
          {/* --- nameplate + dateline --- */}
          <div className="order-first text-center lg:order-none">
            <Link href={hrefFor(locale, "/")} className="inline-block border-y border-rule px-2 py-1">
              <span className="nameplate block whitespace-nowrap text-lg tracking-[0.16em] min-[400px]:text-xl sm:text-2xl xl:text-3xl">
                {t(dict, "brand")}
              </span>
            </Link>
            <p className="byline mt-1">
              {edition ? <span>{t(dict, "edition.dateline", { date: edition })}</span> : null}
              {edition ? <span aria-hidden="true"> · </span> : null}
              <span>{t(dict, "edition.window", { days })}</span>
            </p>
          </div>

          {/* --- the seal: who publishes this --- */}
          <div className="flex min-w-0 items-center gap-2 lg:order-first">
            <span className="shrink-0" aria-hidden="true">
              <Engraving />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight">{t(dict, "publisher.name")}</p>
              <p className="truncate text-xs text-muted">{t(dict, "publisher.sources")}</p>
            </div>

            {/* Small screens carry the sections in a disclosure; `lg` shows the
                snapshot block instead and the desk nav carries the taxonomy. */}
            <div className="ml-auto flex items-center gap-1 lg:hidden">
              <details className="relative">
                <summary
                  className="flex h-11 w-11 cursor-pointer items-center justify-center border border-rule text-muted"
                  aria-label={t(dict, "nav.sections")}
                >
                  <Menu size={16} aria-hidden="true" />
                </summary>
                <div className="absolute right-0 top-full z-40 mt-1 w-60 border border-rule-strong bg-surface p-1 shadow-[var(--shadow-lift)]">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <Link
                        key={section.href}
                        href={section.href}
                        className="label flex h-11 items-center gap-2 px-3 text-muted hover:bg-raised hover:text-accent"
                      >
                        <Icon size={15} aria-hidden="true" />
                        {section.label}
                      </Link>
                    );
                  })}
                  <div className="mt-1 flex items-center justify-between gap-2 border-t border-rule px-3 pt-2">
                    <span className="label text-muted">{t(dict, "common.language")}</span>
                    <LangSwitch locale={locale} label={t(dict, "common.language")} />
                  </div>
                </div>
              </details>
              <ThemeToggle />
            </div>
          </div>

          {/* --- the edition's figures --- */}
          <div className="hidden items-center justify-end gap-3 lg:flex">
            <div className="text-right whitespace-nowrap">
              <p className="label hidden text-muted xl:block">
                {t(dict, "edition.snapshot")} {clock}
              </p>
              <p className="font-mono text-sm">
                <span className="text-accent">{formatNumber(pulse?.tracked ?? 0)}</span>{" "}
                <span className="text-muted">{t(dict, "edition.models")}</span>
              </p>
              <p className="font-mono text-xs text-muted">
                {formatNumber(pulse?.passed ?? 0)} {t(dict, "edition.gatePassed")}
              </p>
            </div>
            <span className="h-10 w-px bg-rule" aria-hidden="true" />
            <LangSwitch locale={locale} label={t(dict, "common.language")} />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * The seal, and the only piece of the old "radar instrument" identity that
 * survives. A halftone dot burst in ink: static SVG, no filters, no animation,
 * nothing inside the reading area (docs/en/DESIGN-V3.md §1 zone 7).
 */
function Engraving() {
  const dots: Array<{ x: number; y: number; r: number }> = [];
  for (let ring = 1; ring <= 3; ring += 1) {
    const count = ring * 8;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      dots.push({ x: 28 + Math.cos(angle) * ring * 7.5, y: 28 + Math.sin(angle) * ring * 7.5, r: 0.9 + (3 - ring) * 0.45 });
    }
  }

  return (
    <svg viewBox="0 0 56 56" width={44} height={44} className="text-rule-strong">
      <circle cx="28" cy="28" r="26" fill="none" stroke="var(--rule)" strokeWidth="0.75" />
      <circle cx="28" cy="28" r="17" fill="none" stroke="var(--rule)" strokeWidth="0.5" />
      {dots.map((dot, index) => (
        <circle key={index} cx={dot.x} cy={dot.y} r={dot.r} fill="currentColor" />
      ))}
      <circle cx="28" cy="28" r="2.2" fill="var(--accent)" />
    </svg>
  );
}
