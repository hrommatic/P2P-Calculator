import React, { useMemo, useState } from 'react';
import {
  LifeBuoy,
  MessageCircle,
  Lightbulb,
  Bug,
  ChevronLeft,
  Send,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resolveCuratorTelegram } from '../lib/site-defaults';

type SupportKind = 'curator' | 'feature' | 'bug';

const kindMeta: Record<
  SupportKind,
  { icon: typeof MessageCircle; accent: string }
> = {
  curator: {
    icon: MessageCircle,
    accent:
      'border-sky-500/30 bg-sky-500/10 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300',
  },
  feature: {
    icon: Lightbulb,
    accent:
      'border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300',
  },
  bug: {
    icon: Bug,
    accent:
      'border-rose-500/30 bg-rose-500/10 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
  },
};

function telegramUsername(handle: string): string {
  return handle.replace(/^@/, '');
}

function telegramDeepLink(handle: string, text: string): string {
  const username = telegramUsername(handle);
  const trimmed = text.trim();
  if (!trimmed) return `https://t.me/${username}`;
  return `https://t.me/${username}?text=${encodeURIComponent(trimmed)}`;
}

export const SupportPage: React.FC = () => {
  const { siteSettings, t } = useAuth();
  const [kind, setKind] = useState<SupportKind | null>(null);
  const [message, setMessage] = useState('');

  const curatorHandle = resolveCuratorTelegram(siteSettings?.curatorTelegram);
  const curatorTelegramUrl = telegramDeepLink(
    curatorHandle,
    t('supportTemplateCurator'),
  );

  const options: { id: SupportKind; titleKey: string; descKey: string }[] = [
    {
      id: 'curator',
      titleKey: 'supportOptionCurator',
      descKey: 'supportOptionCuratorDesc',
    },
    {
      id: 'feature',
      titleKey: 'supportOptionFeature',
      descKey: 'supportOptionFeatureDesc',
    },
    {
      id: 'bug',
      titleKey: 'supportOptionBug',
      descKey: 'supportOptionBugDesc',
    },
  ];

  const templateKey = (supportKind: Exclude<SupportKind, 'curator'>) =>
    supportKind === 'feature' ? 'supportTemplateFeature' : 'supportTemplateBug';

  const defaultBody = useMemo(() => {
    if (!kind || kind === 'curator') return '';
    return t(templateKey(kind));
  }, [kind, t]);

  const openKind = (next: SupportKind) => {
    if (next === 'curator') return;
    setKind(next);
    setMessage(t(templateKey(next)));
  };

  const telegramHref = telegramDeepLink(
    curatorHandle,
    message.trim() || defaultBody,
  );

  const optionCardClass = (id: SupportKind) =>
    `flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-colors hover:brightness-[1.02] dark:hover:brightness-110 ${kindMeta[id].accent}`;

  const optionInner = (opt: (typeof options)[number]) => {
    const Icon = kindMeta[opt.id].icon;
    return (
      <>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 dark:bg-slate-900/50">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 pt-0.5">
          <span className="block text-base font-bold text-slate-900 dark:text-white">
            {t(opt.titleKey)}
          </span>
          <span className="mt-1 block text-sm leading-snug opacity-90">
            {t(opt.descKey)}
          </span>
        </span>
      </>
    );
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 min-w-0">
      <div className="border-b border-slate-200 pb-2 dark:border-slate-800">
        <h1 className="flex items-center gap-2.5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          <LifeBuoy className="h-7 w-7 shrink-0 text-blue-600 dark:text-sky-400" />
          <span>{t('supportPageTitle')}</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('supportPageSubtitle')}
        </p>
      </div>

      {!kind ? (
        <ul className="space-y-3">
          {options.map(opt =>
            opt.id === 'curator' ? (
              <li key={opt.id}>
                <a
                  href={curatorTelegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={optionCardClass('curator')}
                >
                  {optionInner(opt)}
                </a>
              </li>
            ) : (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => openKind(opt.id)}
                  className={optionCardClass(opt.id)}
                >
                  {optionInner(opt)}
                </button>
              </li>
            ),
          )}
        </ul>
      ) : (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => {
              setKind(null);
              setMessage('');
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('supportBackToChoice')}
          </button>

          <div className={`rounded-2xl border p-4 ${kindMeta[kind].accent}`}>
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {t(
                kind === 'feature'
                  ? 'supportOptionFeature'
                  : 'supportOptionBug',
              )}
            </p>
            <p className="mt-1 text-sm opacity-90">
              {t('supportCuratorHint', { curator: curatorHandle })}
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('supportMessageLabel')}
            </span>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={8}
              className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100"
              placeholder={t('supportMessagePlaceholder')}
            />
          </label>

          <a
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            <Send className="h-4 w-4" />
            {t('supportSendTelegram')}
            <ExternalLink className="h-3.5 w-3.5 opacity-80" />
          </a>
        </div>
      )}
    </div>
  );
};
