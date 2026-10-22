import { estimateVramGb, formatParams } from "@/lib/runner/vram";

/**
 * Worked VRAM examples, computed with the same estimator the model pages use.
 *
 * The entry used to quote "about 8.6 GB / 21.2 GB / 49.9 GB" in prose. Those
 * numbers were correct - measured: `estimateVramGb` returns 8.6, 21.2 and 49.9 for
 * them - but a copy cannot stay correct (docs/en/GLOSSARY-PLAN.md G-D7).
 */
export function VramExamples({
  title,
  caption,
  examples
}: {
  title: string;
  /** Column headers, in order: params, quantization, context, estimate. */
  caption: [string, string, string, string];
  examples: Array<{ params: number; quantization: string; context: number }>;
}) {
  return (
    <section className="rule-strong mt-6 pt-2">
      <h2 className="section-title">{title}</h2>
      <table className="mt-2 w-full text-left text-sm">
        <thead>
          <tr className="label text-muted">
            <th scope="col" className="pb-1 font-medium">{caption[0]}</th>
            <th scope="col" className="pb-1 font-medium">{caption[1]}</th>
            <th scope="col" className="pb-1 text-right font-medium">{caption[2]}</th>
            <th scope="col" className="pb-1 text-right font-medium">{caption[3]}</th>
          </tr>
        </thead>
        <tbody>
          {examples.map((example) => (
            <tr key={`${example.params}-${example.quantization}-${example.context}`} className="border-t border-rule">
              <td className="py-1.5 font-mono text-xs">{formatParams(example.params)}</td>
              <td className="py-1.5 font-mono text-xs">{example.quantization}</td>
              <td className="py-1.5 text-right font-mono text-xs">{example.context.toLocaleString("en-US")}</td>
              <td className="py-1.5 text-right font-mono text-xs text-accent">
                {`~${estimateVramGb(example.params, example.quantization, example.context)} GB`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
