import { dictionary, t, type Locale } from "@/i18n";

export function EmptyState({ locale, message }: { locale: Locale; message: string }) {
  const dict = dictionary(locale);
  return (
    <div className="border border-dashed border-border rounded-lg p-6 text-center text-muted break-words">
      {message || t(dict, "empty.noModels")}
    </div>
  );
}

export function SnapshotNotice({ locale }: { locale: Locale }) {
  const dict = dictionary(locale);
  return <p className="mb-4 text-sm text-muted break-words">{t(dict, "db.snapshot")}</p>;
}
