import { translations } from "../../src/i18n/translations";
import { localeExtra } from "./locale-extra";
import type { Language } from "../../src/types";

export { CSV_HEADER_KEYS, OTHER_EXCHANGE_VALUE } from "./locale-extra";

export const APP_LANGUAGE_HEADER = "x-app-language";

export function parseLanguage(value: string | undefined | null): Language {
  if (value === "ru" || value === "en") return value;
  return "uk";
}

export function translate(
  language: Language,
  key: string,
  params?: Record<string, string | number>,
): string {
  const dict = {
    ...translations[language],
    ...localeExtra[language],
  };
  let str =
    dict[key] ||
    translations.uk[key] ||
    localeExtra.uk[key] ||
    key;
  if (params) {
    Object.entries(params).forEach(([pKey, pVal]) => {
      str = str.replace(new RegExp(`\\{${pKey}\\}`, "g"), String(pVal));
    });
  }
  return str;
}

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
