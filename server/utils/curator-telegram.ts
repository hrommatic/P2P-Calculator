export const DEFAULT_CURATOR_TELEGRAM = '@hrommatic';

const LEGACY_CURATOR_TELEGRAM = '@chromatik';

export function normalizeCuratorTelegram(value: string | undefined | null): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed || trimmed.toLowerCase() === LEGACY_CURATOR_TELEGRAM) {
    return DEFAULT_CURATOR_TELEGRAM;
  }
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
}
