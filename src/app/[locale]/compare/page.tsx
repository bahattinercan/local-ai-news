import { getModel } from "@/lib/db/store";
import { formatParams } from "@/lib/runner/vram";
import { categoryLabel } from "@/lib/classify/rules";
import { formatNumber } from "@/lib/format";
import { dictionary, pickLocale, t } from "@/i18n";
import { EmptyState } from "@/components/EmptyState";
import type { ClassifiedModel } from "@/lib/model";

export default async function ComparePage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = pickLocale((await params).locale);
  const dict = dictionary(locale);
  const raw = (await searchParams).ids ?? "";
  const slugs = String(raw).split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6);

  if (slugs.length === 0) {
    return <EmptyState locale={locale} message={t(dict, "compare.title")} />;
  }

  const models = (await Promise.all(slugs.map((slug) => getModel(slug)))).filter(
    (model): model is ClassifiedModel => model !== null
  );

  const rows = [
    { label: categoryLabel("llm", locale), get: (m: (typeof models)[number]) => categoryLabel(m.primaryCategory, locale) },
    { label: t(dict, "card.params"), get: (m: (typeof models)[number]) => formatParams(m.paramsTotal) },
    { label: t(dict, "card.vram"), get: (m: (typeof models)[number]) => `~${m.vramEstGb ?? "—"} GB` },
    { label: t(dict, "detail.quantizations"), get: (m: (typeof models)[number]) => m.quantizations.join(", ") || "—" },
    { label: t(dict, "card.runners"), get: (m: (typeof models)[number]) => m.runners.join(", ") || "—" },
    { label: t(dict, "card.license"), get: (m: (typeof models)[number]) => m.license ?? "—" },
    { label: "♥ / ⬇", get: (m: (typeof models)[number]) => `${formatNumber(m.likes)} / ${formatNumber(m.downloads)}` }
  ];

  return (
    <>
      <h1 className="mb-3 text-xl font-semibold">{t(dict, "compare.title")}</h1>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="py-2 pr-3 text-muted">{t(dict, "common.viewModel")}</th>
            {models.map((model) => (
              <th key={model!.slug} className="py-2 pr-3">
                {model!.externalId}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border">
              <td className="py-2 pr-3 text-muted">{row.label}</td>
              {models.map((model) => (
                <td key={model!.slug} className="py-2 pr-3">
                  {row.get(model!)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
