import assert from "node:assert/strict";
import { translations } from "./messages";
import { localeExtra, CSV_HEADER_KEYS } from "./locale-extra";
import { translate, intlLocaleForLanguage, parseLanguage } from "./translate";
import type { Language } from "../../src/types";

const LANGS: Language[] = ["uk", "ru", "en"];

function mergedKeys(lang: Language): Set<string> {
  return new Set([
    ...Object.keys(translations[lang]),
    ...Object.keys(localeExtra[lang]),
  ]);
}

function allUsedKeys(): string[] {
  const uk = mergedKeys("uk");
  const ru = mergedKeys("ru");
  const en = mergedKeys("en");
  const missingRu = [...uk].filter((k) => !ru.has(k));
  const missingEn = [...uk].filter((k) => !en.has(k));
  const extraRu = [...ru].filter((k) => !uk.has(k));
  const extraEn = [...en].filter((k) => !uk.has(k));

  assert.equal(
    missingRu.length,
    0,
    `RU missing keys (${missingRu.length}): ${missingRu.slice(0, 15).join(", ")}`,
  );
  assert.equal(
    missingEn.length,
    0,
    `EN missing keys (${missingEn.length}): ${missingEn.slice(0, 15).join(", ")}`,
  );
  assert.deepEqual(extraRu.sort(), extraEn.sort(), "Extra keys should match across RU/EN");
  return [...uk];
}

// Key parity across languages
allUsedKeys();

for (const lang of LANGS) {
  for (const key of CSV_HEADER_KEYS) {
    const label = translate(lang, key);
    assert.notEqual(label, key, `CSV header ${key} missing for ${lang}`);
    assert.ok(label.length > 0);
  }
}

// Parameter substitution
for (const lang of LANGS) {
  const s = translate(lang, "tradesInPeriod", { count: 5 });
  assert.match(s, /5/, `tradesInPeriod should include count for ${lang}: ${s}`);
  assert.ok(!s.includes("{count}"), `unreplaced placeholder in ${lang}`);
}

const blocked = translate("ru", "errAccountBlockedCurator", {
  curator: "@test",
});
assert.match(blocked, /@test/);
assert.ok(!blocked.includes("{curator}"));

// Locale helpers
assert.equal(parseLanguage("ru"), "ru");
assert.equal(parseLanguage(undefined), "uk");
assert.equal(intlLocaleForLanguage("en"), "en-GB");
assert.equal(intlLocaleForLanguage("ru"), "ru-UA");

// Spot-check: RU vs UK must differ for main table columns
assert.notEqual(
  translate("uk", "tradeColCommissions"),
  translate("ru", "tradeColCommissions"),
);
assert.equal(translate("ru", "tradeColCommissions"), "Комиссии");

console.log(
  `i18n OK: ${mergedKeys("uk").size} keys × ${LANGS.length} languages, CSV ${CSV_HEADER_KEYS.length} cols`,
);
