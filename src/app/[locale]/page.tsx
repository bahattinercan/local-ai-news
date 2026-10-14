import { FeedView } from "@/components/FeedView";
import { parseFeedQuery } from "@/lib/query";
import { dictionary, pickLocale, t } from "@/i18n";

function normalizeRaw(raw: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}

export default async function FeedPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = pickLocale((await params).locale);
  const raw = await searchParams;
  const query = parseFeedQuery(raw);
  const dict = dictionary(locale);

  return (
    <>
      <h1 className="mb-3 text-2xl font-semibold tracking-tight">{t(dict, "nav.all")}</h1>
      <FeedView locale={locale} query={query} raw={normalizeRaw(raw)} />
    </>
  );
}
