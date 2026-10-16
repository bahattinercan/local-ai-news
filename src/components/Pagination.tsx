import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";
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
  const pages = Math.max(1, Math.ceil(total / limit));
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
        <a href={hrefForPage(page - 1)} className="rounded-md border border-border px-2.5 py-1.5 text-muted hover:text-text">
          <ChevronLeft size={14} aria-hidden="true" />
        </a>
      ) : null}

      {numbers.map((number) => (
        <a
          key={number}
          href={hrefForPage(number)}
          className={cn(
            "rounded-md border border-border px-2.5 py-1.5 font-mono",
            number === page ? "bg-raised text-accent border-accent/45" : "text-muted hover:text-text"
          )}
        >
          {number}
        </a>
      ))}

      {page < pages ? (
        <a href={hrefForPage(page + 1)} className="rounded-md border border-border px-2.5 py-1.5 text-muted hover:text-text">
          <ChevronRight size={14} aria-hidden="true" />
        </a>
      ) : null}

      <span className="text-muted font-mono text-xs">
        {total} · {t(dict, "common.page", { page })}
      </span>
    </nav>
  );
}
