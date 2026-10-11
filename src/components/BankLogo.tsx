import React from 'react';
import type { GlobalBank } from '../types';

export type BankCode =
  | 'mono'
  | 'privat'
  | 'abank'
  | 'pumb'
  | 'sense'
  | 'raiff'
  | 'oschad'
  | 'sport';

const BANK_CODES = new Set<string>([
  'mono',
  'privat',
  'abank',
  'pumb',
  'sense',
  'raiff',
  'oschad',
  'sport',
]);

const NAME_ALIASES: [string, BankCode][] = [
  ['monobank', 'mono'],
  ['mono', 'mono'],
  ['монобанк', 'mono'],
  ['privatbank', 'privat'],
  ['privat', 'privat'],
  ['приват', 'privat'],
  ['abank', 'abank'],
  ['a-bank', 'abank'],
  ['pumb', 'pumb'],
  ['пумб', 'pumb'],
  ['sense', 'sense'],
  ['sensebank', 'sense'],
  ['raiffeisen', 'raiff'],
  ['raiff', 'raiff'],
  ['райф', 'raiff'],
  ['oschadbank', 'oschad'],
  ['oschad', 'oschad'],
  ['ощад', 'oschad'],
  ['sportbank', 'sport'],
  ['sport', 'sport'],
  ['спорт', 'sport'],
];

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

export function resolveBankCode(
  params: { name: string; globalBankId?: string; code?: string },
  globalBanks?: Pick<GlobalBank, 'id' | 'code' | 'name'>[],
): BankCode | null {
  if (params.code && BANK_CODES.has(params.code)) {
    return params.code as BankCode;
  }

  if (params.globalBankId && globalBanks) {
    const match = globalBanks.find((g) => g.id === params.globalBankId);
    if (match && BANK_CODES.has(match.code)) {
      return match.code as BankCode;
    }
  }

  const normalized = normalizeName(params.name);
  for (const [alias, code] of NAME_ALIASES) {
    if (normalized.includes(alias)) {
      return code;
    }
  }

  return null;
}

const MonoIcon = () => (
  <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
    <rect width="40" height="40" rx="10" fill="#000000" />
    <path fill="#FFFFFF" d="M11 18l2.5-7 3 4.5L20 12l3.5 3.5L26.5 11 29 18v8c0 4.4-3.6 8-8 8h-2c-4.4 0-8-3.6-8-8v-8z" />
    <circle cx="16.5" cy="22" r="1.4" fill="#000000" />
    <circle cx="23.5" cy="22" r="1.4" fill="#000000" />
    <path fill="#000000" d="M19.2 24.2h1.6l.8 1.6h-3.2l.8-1.6z" />
  </svg>
);

const PrivatIcon = () => (
  <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
    <rect width="40" height="40" rx="10" fill="#65A30D" />
    <path
      fill="#FFFFFF"
      d="M12 28V12h6.5c3.8 0 6.5 2.4 6.5 5.8 0 2.3-1.2 4.1-3.2 5l4.2 5.2H18l-3.8-4.8H16v4.8H12zm4-8.5h2.4c1.5 0 2.4-.8 2.4-2s-.9-2-2.4-2H16v4z"
    />
  </svg>
);

const AbankIcon = () => (
  <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
    <rect width="40" height="40" rx="10" fill="#0284C7" />
    <path
      fill="#FFFFFF"
      d="M20 8L8 30h6l2.2-4.5h7.6L26 30h6L20 8zm-1.2 14.5L20 17l1.2 5.5h-2.4z"
    />
  </svg>
);

const PumbIcon = () => (
  <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
    <rect width="40" height="40" rx="10" fill="#DC2626" />
    <path
      fill="#FFFFFF"
      d="M10 12h8.5c4.8 0 8 2.8 8 7 0 2.6-1.2 4.7-3.3 5.8L28 28h-6.5l-3.8-4.5H18V28h-8V12zm8 10.5c2 0 3.2-1 3.2-2.8 0-1.7-1.2-2.7-3.2-2.7H18v5.5z"
    />
  </svg>
);

const SenseIcon = () => (
  <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
    <rect width="40" height="40" rx="10" fill="#EA580C" />
    <path
      fill="#FFFFFF"
      d="M12 28V12h5.8c4.5 0 7.5 2.6 7.5 6.5 0 2.2-1 4-2.8 5.1L28 28h-5.8l-3.2-4.2H18v4.2H12zm5.5-9.8h1.8c1.8 0 2.8-.9 2.8-2.2 0-1.3-1-2.1-2.8-2.1h-1.8v4.3z"
    />
  </svg>
);

const RaiffIcon = () => (
  <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
    <rect width="40" height="40" rx="10" fill="#FFED00" />
    <path
      fill="#1F2937"
      d="M20 10l3.5 6h7l-5.7 4.1 2.2 6.9L20 23.8l-6.9 3.2 2.2-6.9L9.5 16h7L20 10z"
    />
  </svg>
);

const OschadIcon = () => (
  <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
    <rect width="40" height="40" rx="10" fill="#059669" />
    <path fill="#FFFFFF" d="M12 28V12h4v16h-4zm6-16h4v16h-4V12zm6 0h4v16h-4V12z" />
    <path fill="#FFFFFF" d="M10 28h20v2H10z" opacity="0.9" />
  </svg>
);

const SportIcon = () => (
  <svg viewBox="0 0 40 40" className="w-full h-full" aria-hidden="true">
    <rect width="40" height="40" rx="10" fill="#7C3AED" />
    <path
      fill="#FFFFFF"
      d="M20 10c5.5 0 10 4.5 10 10s-4.5 10-10 10S10 25.5 10 20 14.5 10 20 10zm0 4.5c-1.2 0-2.2.4-3 1.1l4.2 4.2c.7-.8 1.1-1.8 1.1-3 0-1.2-.4-2.2-1.3-2.3zm-5.5 5.5c0 1.2.4 2.2 1.1 3l4.2-4.2c-.7-.8-1.7-1.3-3-1.3-1.2 0-2.2.4-3.3 1.5l1 1zm11 0l-1-1c-1.1-1.1-2.1-1.5-3.3-1.5-1.2 0-2.2.5-3 1.3l4.2 4.2c.7-.8 1.1-1.8 1.1-3z"
    />
  </svg>
);

const BANK_ICONS: Record<BankCode, React.FC> = {
  mono: MonoIcon,
  privat: PrivatIcon,
  abank: AbankIcon,
  pumb: PumbIcon,
  sense: SenseIcon,
  raiff: RaiffIcon,
  oschad: OschadIcon,
  sport: SportIcon,
};

interface BankLogoProps {
  name: string;
  color?: string;
  globalBankId?: string;
  logoSvg?: string;
  globalBanks?: GlobalBank[];
  size?: 'sm' | 'md';
  className?: string;
}

export const BankLogo: React.FC<BankLogoProps> = ({
  name,
  color = '#2563EB',
  globalBankId,
  logoSvg,
  globalBanks,
  size = 'md',
  className = '',
}) => {
  const sizeClass = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const code = resolveBankCode({ name, globalBankId }, globalBanks);

  if (logoSvg) {
    return (
      <div
        className={`${sizeClass} rounded-xl overflow-hidden shrink-0 shadow-xs ${className}`}
        dangerouslySetInnerHTML={{ __html: logoSvg }}
        aria-hidden="true"
      />
    );
  }

  if (code) {
    const Icon = BANK_ICONS[code];
    return (
      <div
        className={`${sizeClass} rounded-xl overflow-hidden shrink-0 shadow-xs ${className}`}
        title={name}
        aria-hidden="true"
      >
        <Icon />
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-xl flex items-center justify-center text-white font-black text-sm shadow-xs shrink-0 ${className}`}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    >
      {name.substring(0, 2).toUpperCase()}
    </div>
  );
};
