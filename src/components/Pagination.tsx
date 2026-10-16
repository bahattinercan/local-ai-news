import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";
import { pageCount } from "@/lib/query";
import { dictionary, t, type Locale } from "@/i18n";

export function Pagination({
  locale,
  page,
  total,
  limit,
  formValues
}: {
  locale: Locale;
  page: number;
  total: number;
  limit: number;
  formValues: Record<string, string | undefined>;
}) {
  const dict = dictionary(locale);
  const pages = pageCount(total, limit);
  if (pages <= 1) return null;

  /* Blank and undefined values stay out of the URL: the filter form submits an
     empty string for every untouched select, and `?runner=&q=` links are noise
     (and were what used to 500 the page). */
  const hrefForPage = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...formValues, page: String(target) })) {
      if (value === undefined || value === "") continue;
      params.set(key, value);
    }
    return `?${params.toString()}`;
  };

  const windowStart = Math.max(1, Math.min(page - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, index) => windowStart + index).filter((n) => n <= pages);

  return (
    <nav className="mt-4 flex flex-wrap items-center gap-2 text-sm" aria-label={t(dict, "common.page", { page })}>
      {page > 1 ? (
        <Link href={hrefForPage(page - 1)} aria-label={t(dict, "common.prev")} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted hover:text-text">
          <ChevronLeft size={16} aria-hidden="true" />
        </Link>
      ) : null}

      {numbers.map((number) => (
        <Link
          key={number}
          href={hrefForPage(number)}
          aria-current={number === page ? "page" : undefined}
          className={cn(
            "inline-flex h-11 min-w-11 items-center justify-center rounded-md border border-border px-2.5 font-mono",
            number === page ? "bg-raised text-accent border-accent/45" : "text-muted hover:text-text"
          )}
        >
          {number}
        </Link>
      ))}

      {page < pages ? (
        <Link href={hrefForPage(page + 1)} aria-label={t(dict, "common.next")} className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted hover:text-text">
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      ) : null}

      <span className="text-muted font-mono text-xs">
        {total} · {t(dict, "common.page", { page })}
      </span>
    </nav>
  );
}
