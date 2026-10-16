import Image from "next/image";
import Link from "next/link";
import { Activity, Box, Clock, Cpu, Database, Globe, HardDrive, Heart, Layers, Link as LinkIcon, ShieldCheck, Zap } from "lucide-react";
import { getModel, getFeed } from "@/lib/store";
import { runCommand } from "@/lib/runner/command";
import { categoryLabel } from "@/lib/classify/rules";
import { formatBytes, formatNumber, daysSince, relativeTime } from "@/lib/format";
import { formatParams } from "@/lib/runner/vram";
import { dictionary, hrefFor, pickLocale, t } from "@/i18n";
import { EmptyState, DataNotice } from "@/components/EmptyState";
import { JsonLd } from "@/components/JsonLd";
import { TabBar } from "@/components/TabBar";
import { FeedCard } from "@/components/FeedCard";
import { Chip } from "@/components/ui/Chip";
import { CopyCommand } from "@/components/CopyCommand";
import { VramCalculator } from "@/components/VramCalculator";

export default async function ModelPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = pickLocale(rawLocale);
  const dict = dictionary(locale);
  const model = await getModel(slug);

  if (!model) {
    return (
      <>
        <TabBar locale={locale} />
        <DataNotice locale={locale} />
        <EmptyState locale={locale} message={t(dict, "empty.noModels")} />
      </>
    );
  }

  const related = await getFeed({
    category: model.primaryCategory,
    windowDays: 30,
    sort: "trending",
    gate: "passed",
    excludeGated: true,
    limit: 6,
    page: 1
  });

  const specs: Array<{ icon: typeof Cpu; label: string; value: string; glossary?: string }> = [];
  if (model.paramsTotal) specs.push({ icon: Cpu, label: t(dict, "card.params"), value: formatParams(model.paramsTotal), glossary: "params" });
  if (model.storageBytes) specs.push({ icon: HardDrive, label: t(dict, "card.storage"), value: formatBytes(model.storageBytes) });
  if (model.quantizations.length) specs.push({ icon: Layers, label: t(dict, "detail.quantizations"), value: model.quantizations.join(" · "), glossary: "quantization" });
  if (model.runners.length) specs.push({ icon: Zap, label: t(dict, "card.runners"), value: model.runners.join(" · ") });
  if (model.vramEstGb) specs.push({ icon: Box, label: t(dict, "card.vram"), value: `~${model.vramEstGb} GB`, glossary: "vram" });
  if (model.licenseName || model.license) specs.push({ icon: ShieldCheck, label: t(dict, "card.license"), value: model.licenseName ?? model.license ?? "—" });
  specs.push({ icon: Heart, label: t(dict, "detail.popularity"), value: `♥ ${formatNumber(model.likes)} · ⬇ ${formatNumber(model.downloads)}` });
  specs.push({ icon: Clock, label: t(dict, "card.new"), value: `${daysSince(model.firstSeenAt)}d (${relativeTime(model.firstSeenAt)})` });
  if (model.gateReason) specs.push({ icon: ShieldCheck, label: t(dict, "detail.gateReason"), value: model.gateReason });
  if (model.spaces.length) specs.push({ icon: LinkIcon, label: t(dict, "detail.spaces"), value: model.spaces.slice(0, 5).join(", ") });
  if (model.cardMeta?.baseModel) specs.push({ icon: LinkIcon, label: t(dict, "detail.baseModel"), value: model.cardMeta.baseModel });
  if (model.cardMeta?.datasets?.length) specs.push({ icon: Database, label: t(dict, "detail.datasets"), value: model.cardMeta.datasets.join(" · ") });
  if (model.cardMeta?.languages?.length) specs.push({ icon: Globe, label: t(dict, "detail.languages"), value: model.cardMeta.languages.join(" · ") });

  const command = runCommand(model);

  return (
    <>
      <TabBar locale={locale} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: model.name,
          creator: model.author,
          url: model.url,
          datePublished: model.createdAt,
          image: model.sampleImages[0],
          description: `${categoryLabel(model.primaryCategory)} · ${model.libraryName ?? "unknown library"}`
        }}
      />

      <DataNotice locale={locale} />

      <section className="card p-5">
        <div className="flex flex-wrap gap-4">
          {model.sampleImages[0] ? (
            <Image
              src={model.sampleImages[0]}
              alt={model.name}
              width={220}
              height={220}
              className="h-[180px] w-[180px] rounded-md border border-border object-cover"
            />
          ) : (
            <div
              className="h-[180px] w-[180px] rounded-md border border-dashed border-border bg-raised grid place-items-center font-mono text-lg text-muted"
              aria-hidden="true"
            >
              {(model.author || model.name).slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{model.externalId}</h1>
            <p className="mt-1 text-sm text-muted">
              {categoryLabel(model.primaryCategory)} · {model.libraryName ?? "—"} ·{" "}
              {model.paramsTotal ? `${formatParams(model.paramsTotal)} ${t(dict, "card.params")}` : t(dict, "card.paramsUnknown")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip
                label={model.qualityPassed ? t(dict, "card.gatePassed") : t(dict, "card.gateFailed")}
                tone={model.qualityPassed ? "ok" : "warn"}
              />
              <Chip label={`${t(dict, "card.new")} ${daysSince(model.firstSeenAt)}d`} tone="accent" />
              <a href={model.url} className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-sm text-accent">
                <Activity size={13} aria-hidden="true" />
                {model.externalId}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {specs.map((spec) => {
          const Icon = spec.icon;
          return (
            <div key={spec.label} className="card p-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted whitespace-nowrap">
                <Icon size={13} aria-hidden="true" />
                {spec.glossary ? (
                  <Link href={hrefFor(locale, `/glossary/${spec.glossary}`)} className="hover:text-accent">
                    {spec.label}
                  </Link>
                ) : (
                  spec.label
                )}
              </div>
              <div className="mt-1 font-mono text-sm break-words">{spec.value}</div>
            </div>
          );
        })}
      </section>

      <section className="mt-4">
        <h2 className="text-lg font-semibold mb-2">{t(dict, "detail.vramCalc")}</h2>
        <VramCalculator
          paramsTotal={model.paramsTotal}
          quantizations={model.quantizations}
          labels={{
            params: t(dict, "detail.calcParams"),
            quantization: t(dict, "detail.calcQuant"),
            context: t(dict, "detail.calcContext"),
            result: t(dict, "detail.calcResult"),
            manual: t(dict, "detail.calcManual"),
            derived: t(dict, "detail.calcDerived")
          }}
        />
      </section>

      {model.files && model.files.length > 0 ? (
        <section className="mt-4">
          <h2 className="flex flex-wrap items-baseline gap-2 text-lg font-semibold mb-2">
            {t(dict, "detail.files")}
            <span className="text-xs font-normal text-muted">{t(dict, "detail.filesNote")}</span>
          </h2>
          <div className="card overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {model.files.map((file) => (
                  <tr key={file.name} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3 font-mono text-xs break-all">{file.name}</td>
                    <td className="py-2 pl-3 text-right font-mono text-xs text-muted whitespace-nowrap">
                      {formatBytes(file.bytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mt-4">
        <h2 className="text-lg font-semibold mb-2">{t(dict, "detail.runCommand")}</h2>
        <div className="card p-3 flex flex-wrap items-center gap-3">
          <pre className="flex-1 min-w-[220px] font-mono text-sm whitespace-pre-wrap break-words">{command}</pre>
          <CopyCommand text={command} label={t(dict, "common.copy")} />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-3">{t(dict, "detail.related")}</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {related
            .filter((row) => row.externalId !== model.externalId)
            .slice(0, 4)
            .map((row) => (
              <FeedCard key={row.externalId} model={row} locale={locale} />
            ))}
        </div>
      </section>

      <p className="mt-6 text-sm">
        <Link href={hrefFor(locale, `/c/${model.primaryCategory}`)} className="text-muted hover:text-text">
          {t(dict, "common.home")}
        </Link>
      </p>
    </>
  );
}
