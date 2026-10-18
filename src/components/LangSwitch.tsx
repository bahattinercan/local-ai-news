"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOCALES, type Locale } from "@/i18n";
import { cn } from "@/lib/format";

/**
 * Language switch that keeps the reader on the page they are reading.
 *
 * It used to link to `hrefFor(option, "/")` — i.e. every switch dumped you on
 * the home page of the other locale, which is why nobody could compare the same
 * view in two languages. `usePathname` is enough to swap the locale segment;
 * the query string is deliberately not carried over (it would need
 * `useSearchParams`, which forces a Suspense boundary into every static route).
 */
export function LangSwitch({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname() ?? `/${locale}`;
  const rest = pathname.replace(/^\/(en|tr)(?=\/|$)/, "");

  return (
    <div className="flex h-11 shrink-0 items-center gap-0.5 border border-rule bg-surface px-1" aria-label={label}>
      {LOCALES.map((option) => (
        <Link
          key={option}
          href={`/${option}${rest}`}
          hrefLang={option}
          aria-current={option === locale ? "true" : undefined}
          className={cn(
            "flex h-8 w-7 items-center justify-center font-mono text-xs",
            option === locale ? "bg-raised text-accent" : "text-muted hover:text-text"
          )}
        >
          {option.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
