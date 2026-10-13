/** Fallback when site settings have no curator Telegram yet */
export const DEFAULT_CURATOR_TELEGRAM = '@hrommatic';

const LEGACY_CURATOR_TELEGRAM = '@chromatik';

/** Curator handle from API/DB, with legacy @Chromatik mapped to @hrommatic */
export function resolveCuratorTelegram(value: string | undefined | null): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed || trimmed.toLowerCase() === LEGACY_CURATOR_TELEGRAM) {
    return DEFAULT_CURATOR_TELEGRAM;
  }
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}
