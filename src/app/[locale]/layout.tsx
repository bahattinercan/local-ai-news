import type { ReactNode } from "react";
import { dictionary, hrefFor, pickLocale, t } from "@/i18n";
import { TabBar } from "@/components/TabBar";
import "../globals.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = dictionary(pickLocale(locale));
  return {
    title: `${t(dict, "brand")} — ${t(dict, "tagline")}`,
    description: t(dict, "tagline")
  };
}

export default async function Layout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const raw = (await params).locale;
  const locale = pickLocale(raw);
  const dict = dictionary(locale);

  return (
    <html lang={locale} data-theme="dark">
      <body>
        <header className="border-b border-border px-4 py-3">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
            <a href={hrefFor(locale, "/")} className="font-semibold">
              {t(dict, "brand")}
            </a>
            <span className="text-sm text-muted">{t(dict, "tagline")}</span>
            <nav className="ml-auto flex gap-2 text-sm">
              {(["en", "tr"] as const).map((option) => (
                <a
                  key={option}
                  href={hrefFor(option, "/")}
                  className={option === locale ? "text-accent" : "text-muted"}
                >
                  {option.toUpperCase()}
                </a>
              ))}
            </nav>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4">
          <TabBar locale={locale} />
          <main className="py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
