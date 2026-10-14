import en from "./dictionaries/en.json";
import tr from "./dictionaries/tr.json";

export const LOCALES = ["en", "tr"] as const;
export type Locale = (typeof LOCALES)[number];
export type Dictionary = Record<string, string>;

const DICTIONARIES: Record<Locale, Dictionary> = { en, tr };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function dictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export function t(dict: Dictionary, key: string, vars: Record<string, string | number> = {}): string {
  let value = dict[key] ?? key;
  for (const [name, replacement] of Object.entries(vars)) {
    value = value.replace(`{${name}}`, String(replacement));
  }
  return value;
}

export function pickLocale(candidate?: string | null): Locale {
  if (candidate && isLocale(candidate)) return candidate;
  return "en";
}

export function hrefFor(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${clean === "/" ? "" : clean}`;
}
