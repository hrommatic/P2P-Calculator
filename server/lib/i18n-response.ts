import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  APP_LANGUAGE_HEADER,
  parseLanguage,
  translate,
} from "../../shared/i18n/translate.js";

export function getRequestLanguage(req: VercelRequest) {
  const h = req.headers[APP_LANGUAGE_HEADER];
  const raw = Array.isArray(h) ? h[0] : h;
  return parseLanguage(raw);
}

export function jsonError(
  res: VercelResponse,
  req: VercelRequest,
  status: number,
  key: string,
  params?: Record<string, string | number>,
) {
  const lang = getRequestLanguage(req);
  return res.status(status).json({
    error: translate(lang, key, params),
    errorKey: key,
  });
}

export function jsonOkMessage(
  res: VercelResponse,
  req: VercelRequest,
  payload: Record<string, unknown>,
  messageKey: string,
  params?: Record<string, string | number>,
) {
  const lang = getRequestLanguage(req);
  return res.json({
    ...payload,
    message: translate(lang, messageKey, params),
  });
}
