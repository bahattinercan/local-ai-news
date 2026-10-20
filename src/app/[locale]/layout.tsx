import type { Metadata } from "next";
import type { ReactNode } from "react";
import { dictionary, pickLocale, t } from "@/i18n";
import { Masthead } from "@/components/shell/Masthead";
import { Ribbon } from "@/components/shell/Ribbon";
import { Footer } from "@/components/Footer";
import { grotesk, mono, display } from "../fonts";
import { DEFAULT_THEME, THEME_BOOTSTRAP } from "@/lib/theme";
import { ThemeSync } from "@/components/ThemeSync";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import "../globals.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = pickLocale(raw);
  const dict = dictionary(locale);
  const tagline = t(dict, "tagline");
  const description =
    locale === "tr"
      ? "Yerelde çalıştırabileceğin yeni açık ağırlıklı AI modellerini izle: parametre, VRAM, kuantizasyon, runner ve lisans, 10 dakikada bir güncellenir."
      : "Track new open-weight AI models you can run locally: params, VRAM, quantization, runners and license, updated every 10 minutes.";

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${t(dict, "brand")} — ${tagline}`,
      template: `%s · ${SITE_NAME}`
    },
    description,
    applicationName: SITE_NAME,
    icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: locale === "tr" ? "tr_TR" : "en_US",
      alternateLocale: [locale === "tr" ? "en_US" : "tr_TR"]
    },
    twitter: { card: "summary" },
    robots: {
      // No index/follow here: a 404 must be able to add its own noindex without
      // competing with a layout-level "index, follow". The other directives are
      // safe defaults for every page that is indexable.
      "max-image-preview": "large",
      "max-snippet": -1
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : {}
    }
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

  return (
    <html
      lang={locale}
      data-theme={DEFAULT_THEME}
      suppressHydrationWarning
      className={`${grotesk.variable} ${mono.variable} ${display.variable}`}
    >
      <head>
        {/* Read the saved theme before the first paint so a hard load never
            flashes paper at a reader who chose the night edition. The default is
            **paper** (docs/en/DESIGN-V3.md D2): a newspaper is ink on paper, and
            the dark ramp is a second edition rather than the ground state.
            `prefers-color-scheme` is deliberately NOT consulted, because on a
            print design "the operating system prefers dark" is not a reader
            asking for the night edition.

            This script is not enough on its own: on a client-side remount it is
            assigned as markup and never executes, so `ThemeSync` also owns the
            attribute (see `lib/theme.ts`). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        {/* The one component that is not layout: it must remount with the root
            layout to re-assert the reader's theme after a language switch. */}
        <ThemeSync />
        {/* The masthead and the ribbon own their containers because their rules
            are the page's widest horizontal lines. The desk nav is NOT here: a
            layout never receives the route params or the search params, so it
            could not mark the active desk or count the filtered view. */}
        <Masthead locale={locale} />
        <Ribbon locale={locale} />

        <div className="shell">
          <main className="py-5">{children}</main>
        </div>

        <Footer locale={locale} />
      </body>
    </html>
  );
}
