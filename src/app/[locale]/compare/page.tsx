import { getModel } from "@/lib/store";
import { formatParams } from "@/lib/runner/vram";
import { categoryLabel } from "@/lib/classify/rules";
import { formatNumber } from "@/lib/format";
import { dictionary, pickLocale, t } from "@/i18n";
import { EmptyState } from "@/components/EmptyState";
import Link from "next/link";
import { TabBar } from "@/components/TabBar";
import type { ClassifiedModel } from "@/lib/model";

type Direction = "max" | "min" | null;

interface Row {
  label: string;
  get: (_model: ClassifiedModel) => string;
  numeric?: (_model: ClassifiedModel) => number | null;
  direction?: Direction;
}

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
  const slugs = String(raw).split(",").map((slug) => slug.trim()).filter(Boolean).slice(0, 6);

  if (slugs.length === 0) {
    return (
      <>
        <TabBar locale={locale} />
        <EmptyState locale={locale} message={t(dict, "compare.title")} />
      </>
    );
  }

  const models = (await Promise.all(slugs.map((slug) => getModel(slug)))).filter(
    (model): model is ClassifiedModel => model !== null
  );

  if (models.length === 0) {
    return (
      <>
        <TabBar locale={locale} />
        <EmptyState locale={locale} message={t(dict, "empty.noModels")} />
      </>
    );
  }

  const rows: Row[] = [
    { label: t(dict, "filters.category"), get: (m) => categoryLabel(m.primaryCategory) },
    {
      label: t(dict, "card.params"),
      get: (m) => formatParams(m.paramsTotal),
      numeric: (m) => m.paramsTotal,
      direction: "min"
    },
    {
      label: t(dict, "card.vram"),
      get: (m) => (m.vramEstGb ? `~${m.vramEstGb} GB` : "—"),
      numeric: (m) => m.vramEstGb,
      direction: "min"
    },
    { label: t(dict, "detail.quantizations"), get: (m) => m.quantizations.join(", ") || "—" },
    { label: t(dict, "card.runners"), get: (m) => m.runners.join(", ") || "—" },
    { label: t(dict, "card.license"), get: (m) => m.license ?? "—" },
    {
      label: t(dict, "card.downloads"),
      get: (m) => formatNumber(m.downloads),
      numeric: (m) => m.downloads,
      direction: "max"
    },
    {
      label: t(dict, "card.likes"),
      get: (m) => formatNumber(m.likes),
      numeric: (m) => m.likes,
      direction: "max"
    }
  ];

  const bestIndex = (row: Row): number | null => {
    if (!row.numeric || !row.direction) return null;
    const values = models.map(row.numeric).filter((value): value is number => value !== null && value > 0);
    if (values.length < 2) return null;
    const target = row.direction === "max" ? Math.max(...values) : Math.min(...values);
    return models.findIndex((model) => row.numeric!(model) === target);
  };

  return (
    <>
      <TabBar locale={locale} />
      <h1 className="mb-3 text-2xl font-semibold tracking-tight">{t(dict, "compare.title")}</h1>

      <div className="card overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0">
            <tr className="border-b border-border text-left">
              <th className="py-3 pr-3 text-xs uppercase tracking-wide text-muted">{t(dict, "common.viewModel")}</th>
              {models.map((model) => (
                <th key={model.slug} className="py-3 pr-3 font-medium">
                  <Link href={`/m/${model.slug}`} className="hover:text-accent">
                    {model.externalId}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const best = bestIndex(row);
              return (
                <tr key={row.label} className="border-b border-border">
                  <td className="py-2.5 pr-3 text-xs uppercase tracking-wide text-muted">{row.label}</td>
                  {models.map((model, index) => (
                    <td
                      key={model.slug}
                      className={
                        "py-2.5 pr-3 font-mono" + (index === best ? " text-accent font-semibold" : "")
                      }
                    >
                      {row.get(model)}
                      {index === best ? <span className="text-xs text-muted"> · {t(dict, "compare.best")}</span> : null}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
