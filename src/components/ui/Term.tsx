import Link from "next/link";
import type { ReactNode } from "react";
import { getGlossaryEntry, glossaryText } from "@/lib/glossary";
import { hrefFor, type Locale } from "@/i18n";

/**
 * A term with its definition one click (or one hover) away.
 *
 * Measured complaint: "quality gate", "runner", "~2.1 GB VRAM" and "New (8d)"
 * appear all over the UI and were defined nowhere, while the site already had a
 * bilingual glossary with entries for the first, second and fourth of them. This
 * renders the existing label plus a 24 px `?` that carries the glossary summary
 * as its tooltip and links to the entry.
 *
 * The target is 24 px so the tap-target invariant stays honest (the checker that
 * guards it flags anything smaller), and a link inside a `<label>` is safe: the
 * HTML activation behaviour explicitly does nothing for interactive descendants.
 */
export function Term({ slug, locale, children }: { slug: string; locale: Locale; children: ReactNode }) {
  const entry = getGlossaryEntry(slug);
  if (!entry) return <>{children}</>;
  const text = glossaryText(entry, locale);

  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <Link
        href={hrefFor(locale, `/glossary/${slug}`)}
        title={text.summary}
        aria-label={`${text.term}: ${text.summary}`}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-raised font-mono text-[11px] text-muted hover:border-accent/50 hover:text-accent"
      >
        ?
      </Link>
    </span>
  );
}
