import Link from "next/link";
import { dictionary, t, type Locale } from "@/i18n";
import { cn, relativeTime } from "@/lib/format";
import { getGeneratedAt } from "@/lib/store";

/**
 * An empty result explains itself.
 *
 * Measured: `/compare` with no ids rendered a blank viewport (844 px, one screen
 * of nothing) and the feed's zero-result card said only "no models match these
 * filters" — both told the reader that something is missing without saying what
 * to do next. The optional hint and action turn the dead end into the next step.
 */
export function EmptyState({
  locale,
  message,
  hint,
  action
}: {
  locale: Locale;
  message: string;
  hint?: string;
  action?: { href: string; label: string };
}) {
  const dict = dictionary(locale);
  return (
    <div className="card border-dashed p-6 text-center">
      <p className="break-words text-muted">{message || t(dict, "empty.noModels")}</p>
      {hint ? <p className="mx-auto mt-2 max-w-xl text-sm text-muted break-words">{hint}</p> : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-4 inline-flex h-11 items-center rounded-md border border-border px-3.5 text-sm text-muted hover:border-accent/50 hover:text-accent"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export async function DataNotice({ locale, className }: { locale: Locale; className?: string }) {
  const generatedAt = await getGeneratedAt();
  if (!generatedAt) return null;
  const dict = dictionary(locale);
  return (
    <p className={cn("text-xs text-muted break-words font-mono", className ?? "mb-3")}>
      {t(dict, "data.updated", { when: relativeTime(generatedAt) })}
    </p>
  );
}
