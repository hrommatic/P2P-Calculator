import { localeExtra } from "./locale-extra.js";
import type { Language } from "./language.js";

export function translateServer(
  language: Language,
  key: string,
  params?: Record<string, string | number>,
): string {
  const dict = localeExtra[language];
  let str = dict[key] || localeExtra.uk[key] || key;
  if (params) {
    for (const [pKey, pVal] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${pKey}\\}`, "g"), String(pVal));
    }
  }
  return str;
}

export function parseLanguage(value: string | undefined | null): Language {
  if (value === "ru" || value === "en") return value;
  return "uk";
}

export const APP_LANGUAGE_HEADER = "x-app-language";

export function intlLocaleForLanguage(language: Language): string {
  switch (language) {
    case "ru":
      return "ru-UA";
    case "en":
      return "en-GB";
    default:
      return "uk-UA";
  }
}
