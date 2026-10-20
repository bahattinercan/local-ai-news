/**
 * "In this snapshot" — the one figure a definition is allowed to quote.
 *
 * Numbers are derived by `getGlossaryEvidence()` from the same cached snapshot the
 * feed reads (docs/en/GLOSSARY-PLAN.md G-D6), and the block always prints its
 * denominator: `paramsTotal` exists on 8 % of the snapshot, and hiding that would
 * turn the entry's own thesis into a boast.
 */
export function Evidence({
  title,
  note,
  coverage,
  rows,
  caption
}: {
  title: string;
  /** Which figure this is: "Repositories that publish a quantization". */
  note?: string;
  /** Already formatted: "198 of 915 models list a quantization". */
  coverage: string;
  /** Value distribution — label and count, most common first. */
  rows: Array<[string, number]>;
  caption?: string;
}) {
  return (
    <section className="rule-strong mt-6 pt-2">
      <h2 className="section-title">
        {title}
        {note ? <span className="section-note">{note}</span> : null}
      </h2>
      <p className="mt-2 text-sm text-muted">{coverage}</p>
      {rows.length > 0 ? (
        <ul className="mt-2 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          {rows.map(([label, count]) => (
            <li
              key={label}
              className="flex items-baseline justify-between gap-3 border-b border-rule py-1 text-sm"
            >
              <span className="min-w-0 truncate font-mono text-xs">{label}</span>
              <span className="shrink-0 font-mono text-xs text-muted">{count}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {caption ? <p className="mt-2 text-xs text-muted">{caption}</p> : null}
    </section>
  );
}
