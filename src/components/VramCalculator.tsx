"use client";

import { useMemo, useState } from "react";
import { BYTES_PER_PARAM, estimateVramGb, formatParams } from "@/lib/runner/vram";

/**
 * Gate G1 of docs/en/NEWS-PLAN.md.
 *
 * `paramsTotal` only exists for ~20% of gate-passing models, because it comes
 * from safetensors.parameters and GGUF repos do not have it (measured: 46 gguf
 * models, 0% with a parameter count). Deriving it from the file size was
 * measured and rejected: `usedStorage / bytesPerParam` landed within ±30% for
 * only 23/51 models, worst case 108x, because usedStorage counts every file in
 * the repository. So the count is either real or typed in by the user, and the
 * calculator is always reachable.
 */
export function VramCalculator({
  paramsTotal,
  quantizations,
  labels
}: {
  paramsTotal: number | null;
  quantizations: string[];
  labels: { params: string; quantization: string; context: string; result: string; manual: string; derived: string };
}) {
  const quants = useMemo(() => {
    const known = quantizations.filter((q) => BYTES_PER_PARAM[q.toUpperCase().replace("-", "_")]);
    return known.length > 0 ? known : ["BF16"];
  }, [quantizations]);

  const [billions, setBillions] = useState(paramsTotal ? String(Math.round((paramsTotal / 1e9) * 100) / 100) : "");
  const [quantization, setQuantization] = useState(quants[0]);
  const [context, setContext] = useState("4096");

  const parsed = Number(billions.replace(",", "."));
  const params = Number.isFinite(parsed) && parsed > 0 ? parsed * 1e9 : null;
  const contextTokens = Number(context) || 4096;
  const estimate = params ? estimateVramGb(params, quantization, contextTokens) : null;

  return (
    <div className="card p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted whitespace-nowrap">{labels.params}</span>
          <input
            value={billions}
            onChange={(event) => setBillions(event.target.value)}
            inputMode="decimal"
            placeholder="7.6"
            className="rounded-md border border-border bg-raised px-2.5 py-1.5 text-sm text-text"
          />
          <span className="text-xs text-muted">
            {paramsTotal ? labels.derived : labels.manual}
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted whitespace-nowrap">{labels.quantization}</span>
          <select
            value={quantization}
            onChange={(event) => setQuantization(event.target.value)}
            className="rounded-md border border-border bg-raised px-2.5 py-1.5 text-sm text-text"
          >
            {quants.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-muted whitespace-nowrap">{labels.context}</span>
          <select
            value={context}
            onChange={(event) => setContext(event.target.value)}
            className="rounded-md border border-border bg-raised px-2.5 py-1.5 text-sm text-text"
          >
            {["2048", "4096", "8192", "32768", "131072"].map((option) => (
              <option key={option} value={option}>
                {Number(option).toLocaleString("en-US")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-3">
        <span className="text-xs uppercase tracking-wide text-muted">{labels.result}</span>
        <span className="font-mono text-2xl text-accent" data-testid="vram-result">
          {estimate === null ? "—" : `~${estimate} GB`}
        </span>
        {params ? <span className="font-mono text-xs text-muted">{formatParams(params)}</span> : null}
      </div>
    </div>
  );
}
