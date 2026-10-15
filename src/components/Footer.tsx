import { getGeneratedAt } from "@/lib/store";
import { relativeTime } from "@/lib/format";
import { dictionary, t, type Locale } from "@/i18n";

export async function Footer({ locale }: { locale: Locale }) {
  const dict = dictionary(locale);
  const generatedAt = await getGeneratedAt();
  // Only render the repo link when it is actually configured: a guessed URL
  // shipped as a dead 404 link before.
  const repoUrl = process.env.NEXT_PUBLIC_REPO_URL;

  return (
    <footer className="mt-8 border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
        <span>
          {t(dict, "footer.source")} ·{" "}
          <a href="https://huggingface.co/models" className="text-accent">
            huggingface.co
          </a>
        </span>
        {generatedAt ? (
          <span className="font-mono">{t(dict, "footer.snapshot", { when: relativeTime(generatedAt) })}</span>
        ) : null}
        <a href={`/feed.rss?lang=${locale}`} className="hover:text-text">
          RSS
        </a>
        <a href={`/${locale}/glossary`} className="hover:text-text">
          {t(dict, "nav.glossary")}
        </a>
        {repoUrl ? (
          <a href={repoUrl} className="hover:text-text">
            {t(dict, "footer.docs")}
          </a>
        ) : null}
      </div>
    </footer>
  );
}
