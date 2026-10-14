import { getStats } from "@/lib/store";
import { categoryLabel } from "@/lib/classify/rules";
import { DataNotice } from "@/components/EmptyState";
import { dictionary, pickLocale, t } from "@/i18n";

export default async function StatsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = pickLocale((await params).locale);
  const dict = dictionary(locale);
  const rawDays = Number((await searchParams).days ?? 30);
  const days = Number.isFinite(rawDays) && rawDays > 0 && rawDays <= 180 ? rawDays : 30;
  const stats = await getStats(days);
  const max = Math.max(1, ...stats.map((row) => row.count));

  return (
    <>
      <DataNotice locale={locale} />
      <h1 className="mb-3 text-xl font-semibold">
        {t(dict, "stats.title")} ({days}d)
      </h1>

      <div className="grid gap-2">
        {stats.map((row) => (
          <div key={row.category} className="flex items-center gap-3">
            <span className="w-40 text-sm text-muted">{categoryLabel(row.category, locale)}</span>
            <div className="h-3 rounded bg-border" style={{ width: `${(row.count / max) * 100}%`, minWidth: 4 }} />
            <span className="text-sm">{row.count}</span>
          </div>
        ))}
      </div>
    </>
  );
}
