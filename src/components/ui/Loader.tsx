import { Loader2 } from 'lucide-react';

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
} as const;

type LoaderSize = keyof typeof sizeMap;

interface LoaderProps {
  size?: LoaderSize;
  className?: string;
}

export function Loader({ size = 'md', className = '' }: LoaderProps) {
  return (
    <Loader2
      className={`animate-spin text-blue-600 dark:text-sky-400 ${sizeMap[size]} ${className}`}
      aria-hidden="true"
    />
  );
}

interface PageLoaderProps {
  label?: string;
  className?: string;
}

export function PageLoader({ label = 'Завантаження...', className = '' }: PageLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-12 text-slate-500 dark:text-slate-400 ${className}`}>
      <Loader size="lg" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

interface ButtonLoaderProps {
  label: string;
}

export function ButtonLoader({ label }: ButtonLoaderProps) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <Loader size="sm" />
      <span>{label}</span>
    </span>
  );
}
