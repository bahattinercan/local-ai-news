import type { ReactNode } from "react";
import { dictionary, pickLocale, t } from "@/i18n";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { grotesk, mono } from "../fonts";
import "../globals.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = dictionary(pickLocale(locale));
  return {
    title: `${t(dict, "brand")} — ${t(dict, "tagline")}`,
    description: t(dict, "tagline"),
    icons: { icon: "/icon.svg", apple: "/apple-icon.png" }
  };
}

/** Read the saved theme before the first paint so there is no flash. */
const THEME_BOOTSTRAP = `try{const s=localStorage.getItem("owr.theme");const t=s||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.dataset.theme=t;}catch(e){}`;

export default async function Layout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const raw = (await params).locale;
  const locale = pickLocale(raw);

  return (
    <html lang={locale} data-theme="dark" className={`${grotesk.className} ${mono.className}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <Header locale={locale} />

        <div className="mx-auto max-w-6xl px-4">
          {/* The category strip lives in each page, not here: a layout never
              receives the route params or the search params, so it could not
              mark the active tab or count the filtered view. */}
          <main className="py-6">{children}</main>
        </div>

        <Footer locale={locale} />
      </body>
    </html>
  );
}
