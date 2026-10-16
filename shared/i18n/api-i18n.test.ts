import assert from "node:assert/strict";
import { translate } from "./translate";

/** Every key passed to jsonError on the server must resolve in all languages. */
const SERVER_ERROR_KEYS = [
  "errRegistrationSuspended",
  "errNicknameMinLength",
  "errNicknameFormat",
  "errTelegramFormatRequired",
  "errTelegramInvalid",
  "errPasswordMin6",
  "errPasswordsNoMatch",
  "errNicknameTaken",
  "errLoginRateLimit",
  "errLoginCredentialsRequired",
  "errLoginInvalid",
  "errAccountBlockedCurator",
  "errResetRateLimit",
  "errFillAllFields",
  "errResetPasswordGeneric",
  "errResetTelegramInvalid",
  "errNewPasswordMinLength",
  "errCurrentPasswordWrong",
  "errNewPasswordsMismatch",
  "errTelegramProfileInvalid",
  "errAuthRequired",
  "errInvalidSession",
  "errSessionExpired",
  "errAccountBlockedShort",
  "errAdminRequired",
  "errMethodNotAllowed",
  "errInvalidJson",
  "errTradeBuyFieldsRequired",
  "errTradeSellFieldsRequired",
  "errTradeBankNotInList",
  "errTradeNotFound",
  "errBankNotFound",
  "errBankNameRequired",
  "errBankNameDuplicate",
  "errUserNotFound",
  "errCannotChangeOwnStatus",
  "errInvalidStatus",
  "errCannotDeleteSelfAdmin",
  "errBankNameCodeRequired",
  "errExchangeNameCodeRequired",
  "errExchangeNotFound",
] as const;

for (const key of SERVER_ERROR_KEYS) {
  for (const lang of ["uk", "ru", "en"] as const) {
    const msg = translate(lang, key, { seconds: 30, curator: "@c" });
    assert.notEqual(msg, key, `${key} unresolved for ${lang}`);
    assert.ok(msg.length > 2, `${key} empty for ${lang}`);
  }
}

const ruLogin = translate("ru", "errLoginInvalid");
const ukLogin = translate("uk", "errLoginInvalid");
assert.notEqual(ruLogin, ukLogin);
assert.match(ruLogin, /никнейм|пароль/i);

console.log(`api-i18n OK: ${SERVER_ERROR_KEYS.length} server error keys`);
