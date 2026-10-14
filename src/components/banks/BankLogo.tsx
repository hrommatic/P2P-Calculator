import React from "react";

const SIZE_CLASS = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-sm",
  xl: "w-16 h-16 text-base",
  "2xl": "w-24 h-24 text-lg",
} as const;

type BankLogoProps = {
  name: string;
  logoSvg?: string;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
};

export const BankLogo: React.FC<BankLogoProps> = ({
  name,
  logoSvg,
  size = "md",
  className = "",
}) => {
  const box = `${SIZE_CLASS[size]} rounded-lg shrink-0 overflow-hidden ${className}`;

  if (logoSvg) {
    const trimmed = logoSvg.trim();
    if (trimmed.startsWith("data:") || trimmed.startsWith("http")) {
      return (
        <img
          src={trimmed}
          alt=""
          className={`${box} object-cover bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80`}
        />
      );
    }
    if (trimmed.startsWith("<")) {
      return (
        <div
          className={`${box} flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 [&>svg]:max-w-full [&>svg]:max-h-full`}
          dangerouslySetInnerHTML={{ __html: trimmed }}
        />
      );
    }
  }

  const initials = name.substring(0, 2).toUpperCase();

  return (
    <div
      className={`${box} flex items-center justify-center font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80`}
    >
      {initials}
    </div>
  );
};
