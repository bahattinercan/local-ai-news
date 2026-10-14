import { dictionary, t, type Locale } from "@/i18n";
import { relativeTime } from "@/lib/format";
import { getGeneratedAt } from "@/lib/store";

export function EmptyState({ locale, message }: { locale: Locale; message: string }) {
  const dict = dictionary(locale);
  return (
    <div className="card p-6 text-center text-muted break-words border-dashed">
      {message || t(dict, "empty.noModels")}
    </div>
  );
}

export async function DataNotice({ locale }: { locale: Locale }) {
  const generatedAt = await getGeneratedAt();
  if (!generatedAt) return null;
  const dict = dictionary(locale);
  return (
    <p className="mb-3 text-xs text-muted break-words font-mono">
      {t(dict, "data.updated", { when: relativeTime(generatedAt) })}
    </p>
  );
}
