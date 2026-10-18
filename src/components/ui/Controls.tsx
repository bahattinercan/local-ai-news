import Link from "next/link";
import { cn } from "@/lib/format";
import { Term } from "./Term";
import type { Locale } from "@/i18n";

type Option = [string, string] | string[];

export function Field({
  label,
  name,
  value,
  options,
  termSlug,
  locale
}: {
  label: string;
  name: string;
  value: string;
  options: Option[];
  /** Glossary entry that defines this filter, rendered as a `?` next to the label. */
  termSlug?: string;
  locale?: Locale;
}) {
  return (
    <label className="flex min-w-[110px] flex-col gap-1">
      <span className="label text-muted">
        {termSlug && locale ? (
          <Term slug={termSlug} locale={locale}>
            {label}
          </Term>
        ) : (
          label
        )}
      </span>
      <select
        name={name}
        defaultValue={value}
        className="h-11 border border-control bg-surface px-2.5 text-sm text-text"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SubmitButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="inline-flex h-11 shrink-0 items-center whitespace-nowrap border border-transparent bg-accent px-3.5 text-sm font-medium text-bg"
    >
      {label}
    </button>
  );
}

export function GhostLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex h-11 items-center border border-rule px-3 text-sm text-muted hover:border-rule-strong hover:text-text", className)}>
      {label}
    </Link>
  );
}
