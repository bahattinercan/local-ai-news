import { cn } from "@/lib/format";

type Option = [string, string] | string[];

export function Field({
  label,
  name,
  value,
  options
}: {
  label: string;
  name: string;
  value: string;
  options: Option[];
}) {
  return (
    <label className="flex flex-col gap-1 min-w-[110px]">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <select
        name={name}
        defaultValue={value}
        className="h-11 rounded-md border border-border bg-raised px-2.5 text-sm text-text"
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
      className="inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-md border border-transparent bg-accent px-3.5 text-sm font-medium text-[#071014]"
    >
      {label}
    </button>
  );
}

export function GhostLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <a href={href} className={cn("inline-flex h-11 items-center rounded-md border border-border px-3 text-sm text-muted", className)}>
      {label}
    </a>
  );
}
