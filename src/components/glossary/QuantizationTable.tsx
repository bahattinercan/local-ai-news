import { BYTES_PER_PARAM } from "@/lib/runner/vram";

/**
 * The bytes-per-parameter table, rendered from the constant the estimator uses.
 *
 * The quantization entry used to reprint this table as a sentence, which is two
 * sources of truth for one number: changing `BYTES_PER_PARAM` would have left the
 * glossary quoting the old values forever (docs/en/GLOSSARY-PLAN.md G-D7).
 */
export function QuantizationTable({ title }: { title: string }) {
  const rows = Object.entries(BYTES_PER_PARAM);

  return (
    <section className="rule-strong mt-6 pt-2">
      <h2 className="section-title">{title}</h2>
      <ul className="mt-2 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([scheme, bytes]) => (
          <li
            key={scheme}
            className="flex items-baseline justify-between gap-3 border-b border-rule py-1 text-sm"
          >
            <span className="min-w-0 truncate font-mono text-xs">{scheme}</span>
            <span className="shrink-0 font-mono text-xs text-muted">{bytes.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
