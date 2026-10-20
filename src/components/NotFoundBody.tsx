"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { dictionary, hrefFor, pickLocale, t } from "@/i18n";

/**
 * A 404 that is a navigation aid, not a dead end (docs/en/SEO-PLAN.md §3.4).
 *
 * The locale comes from the address because `not-found.tsx` receives no params;
 * `usePathname` is the only way a client component can know which dictionary to
 * read. Next injects `noindex` for the 404 status itself.
 */
export function NotFoundBody() {
  const pathname = usePathname() ?? "/en";
  const locale = pickLocale(pathname.split("/").filter(Boolean)[0]);
  const dict = dictionary(locale);

  return (
    <div className="mx-auto max-w-2xl py-8">
      <p className="label text-accent">404</p>
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{t(dict, "notFound.title")}</h1>
      <p className="mt-2 text-sm text-muted">{t(dict, "notFound.lede")}</p>

      <form method="get" action={hrefFor(locale, "/models")} role="search" className="mt-6 flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 basis-60 flex-col gap-1">
          <span className="label text-muted">{t(dict, "notFound.searchLabel")}</span>
          <input
            type="search"
            name="q"
            className="h-11 w-full border border-control bg-surface px-2.5 text-sm text-text"
          />
        </label>
        <button type="submit" className="h-11 border border-rule-strong bg-text px-3 text-sm text-bg">
          {t(dict, "filters.apply")}
        </button>
      </form>

      <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link href={hrefFor(locale, "/models")} className="text-accent">
          {t(dict, "nav.models")}
        </Link>
        <Link href={hrefFor(locale, "/news")} className="text-accent">
          {t(dict, "nav.news")}
        </Link>
        <Link href={hrefFor(locale, "/glossary")} className="text-accent">
          {t(dict, "nav.glossary")}
        </Link>
        <Link href={hrefFor(locale, "/")} className="text-muted hover:text-text">
          {t(dict, "common.home")}
        </Link>
      </nav>
    </div>
  );
}
