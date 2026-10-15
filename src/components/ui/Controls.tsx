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
        className="rounded-md border border-border bg-raised px-2.5 py-1.5 text-sm text-text"
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
      className="shrink-0 whitespace-nowrap rounded-md border border-transparent bg-accent px-3.5 py-2 text-sm font-medium text-[#071014]"
    >
      {label}
    </button>
  );
}

export function GhostLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <a href={href} className={cn("rounded-md border border-border px-3 py-1.5 text-sm text-muted", className)}>
      {label}
    </a>
  );
}
