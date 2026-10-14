import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { api } from '../services/api';
import type { UserBank } from '../types';
import {
  Calculator as CalcIcon,
  Check,
  RefreshCw,
  Save,
  TrendingUp,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';
import { ButtonLoader, PageLoader } from '../components/ui/Loader';

const fieldSelectClass =
  'select-field w-full px-2.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-0';
const fieldNumberSuffixClass =
  'number-input number-input-suffix w-full px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-0';
const fieldNumberSmClass =
  'number-input w-full px-2.5 py-2 text-xs sm:text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-0';
const fieldLabelClass =
  'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-0.5';
const fieldSuffixClass =
  'absolute right-2.5 top-2 text-xs text-slate-400 pointer-events-none';

interface CalculatorPageProps {
  onTradeSaved?: () => void;
}

export const CalculatorPage: React.FC<CalculatorPageProps> = ({ onTradeSaved }) => {
  const { t } = useAuth();
  const { banks, exchanges, catalogReady, refreshCatalog } = useCatalog();
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  const [buyExchange, setBuyExchange] = useState('Binance');
  const [buyBankId, setBuyBankId] = useState('');
  const [buyRate, setBuyRate] = useState<string>('');
  const [buyAmountUah, setBuyAmountUah] = useState<string>('');
  const [buyCommission, setBuyCommission] = useState<string>('');
  const [buyCommissionType, setBuyCommissionType] = useState<'percent' | 'fixed_uah' | 'fixed_usdt'>('percent');

  const [sellExchange, setSellExchange] = useState('Binance');
  const [sellBankId, setSellBankId] = useState('');
  const [sellRate, setSellRate] = useState<string>('');
  const [sellUsdtAmount, setSellUsdtAmount] = useState<string>('');
  const [sellCommission, setSellCommission] = useState<string>('');
  const [sellCommissionType, setSellCommissionType] = useState<'percent' | 'fixed_uah' | 'fixed_usdt'>('percent');
  const [extraExpensesUah, setExtraExpensesUah] = useState<string>('');

  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!catalogReady || defaultsApplied) return;
    if (banks.length > 0) {
      setBuyBankId(banks[0].id);
      setSellBankId(banks[1]?.id ?? banks[0].id);
    }
    if (exchanges.length > 0) {
      const name = exchanges[0].name;
      setBuyExchange(name);
      setSellExchange(name);
    }
    setDefaultsApplied(true);
  }, [catalogReady, defaultsApplied, banks, exchanges]);

  const preview = useMemo(() => {
    const numBuyRate = parseFloat(buyRate) || 0;
    const numBuyAmountUah = parseFloat(buyAmountUah) || 0;
    const numBuyComm = parseFloat(buyCommission) || 0;

    const calcBuyUsdt = numBuyRate > 0 ? numBuyAmountUah / numBuyRate : 0;

    let calcBuyCommUah = 0;
    if (buyCommissionType === 'percent') {
      calcBuyCommUah = (numBuyAmountUah * numBuyComm) / 100;
    } else if (buyCommissionType === 'fixed_uah') {
      calcBuyCommUah = numBuyComm;
    } else if (buyCommissionType === 'fixed_usdt') {
      calcBuyCommUah = numBuyComm * numBuyRate;
    }

    const numSellRate = parseFloat(sellRate) || 0;
    const numCustomSellUsdt = parseFloat(sellUsdtAmount) || 0;
    const effectiveSellUsdt =
      numCustomSellUsdt > 0 ? numCustomSellUsdt : calcBuyUsdt;
    const calcGrossRevenueUah = effectiveSellUsdt * numSellRate;

    const numSellComm = parseFloat(sellCommission) || 0;
    let calcSellCommUah = 0;
    if (sellCommissionType === 'percent') {
      calcSellCommUah = (calcGrossRevenueUah * numSellComm) / 100;
    } else if (sellCommissionType === 'fixed_uah') {
      calcSellCommUah = numSellComm;
    } else if (sellCommissionType === 'fixed_usdt') {
      calcSellCommUah = numSellComm * numSellRate;
    }

    const numExtraExpenses = parseFloat(extraExpensesUah) || 0;

    const totalCostUah = numBuyAmountUah + calcBuyCommUah;
    const totalRevenueUah = calcGrossRevenueUah;
    const totalFeesUah = calcBuyCommUah + calcSellCommUah + numExtraExpenses;
    const grossProfitUah = totalRevenueUah - numBuyAmountUah;
    const netProfitUah =
      totalRevenueUah - totalCostUah - calcSellCommUah - numExtraExpenses;
    const roiPercent =
      totalCostUah > 0 ? (netProfitUah / totalCostUah) * 100 : 0;
    const spreadPerUnit = numSellRate - numBuyRate;
    const spreadPercent =
      numBuyRate > 0 ? (spreadPerUnit / numBuyRate) * 100 : 0;

    return {
      numBuyRate,
      numBuyAmountUah,
      numBuyComm,
      numSellRate,
      numSellComm,
      numExtraExpenses,
      effectiveSellUsdt,
      calcBuyUsdt,
      calcGrossRevenueUah,
      totalCostUah,
      totalRevenueUah,
      totalFeesUah,
      grossProfitUah,
      netProfitUah,
      roiPercent,
      spreadPerUnit,
      spreadPercent,
    };
  }, [
    buyRate,
    buyAmountUah,
    buyCommission,
    buyCommissionType,
    sellRate,
    sellUsdtAmount,
    sellCommission,
    sellCommissionType,
    extraExpensesUah,
  ]);

  const {
    numBuyRate,
    numBuyAmountUah,
    numBuyComm,
    numSellRate,
    numSellComm,
    numExtraExpenses,
    effectiveSellUsdt,
    calcBuyUsdt,
    totalCostUah,
    totalRevenueUah,
    totalFeesUah,
    grossProfitUah,
    netProfitUah,
    roiPercent,
    spreadPerUnit,
    spreadPercent,
  } = preview;

  const selectedBuyBank = banks.find((b) => b.id === buyBankId);
  const selectedSellBank = banks.find((b) => b.id === sellBankId);

  const buyBankAvailable = selectedBuyBank
    ? Math.max(0, selectedBuyBank.turnoverLimitUah - (selectedBuyBank.buyTurnoverUah + selectedBuyBank.initialTurnoverUah))
    : 0;
  const isBuyOverLimit = selectedBuyBank && numBuyAmountUah > buyBankAvailable;

  const resetFormFields = (bankList: UserBank[] = banks) => {
    const defaultExchange = exchanges[0]?.name ?? 'Binance';
    setBuyExchange(defaultExchange);
    setSellExchange(defaultExchange);
    setBuyBankId(bankList[0]?.id ?? '');
    setSellBankId(bankList[1]?.id ?? bankList[0]?.id ?? '');
    setBuyRate('');
    setBuyAmountUah('');
    setBuyCommission('');
    setBuyCommissionType('percent');
    setSellRate('');
    setSellUsdtAmount('');
    setSellCommission('');
    setSellCommissionType('percent');
    setExtraExpensesUah('');
    setNotes('');
  };

  const handleClear = () => {
    resetFormFields();
    setSaveSuccess(false);
    setErrorMessage(null);
  };

  const handleSaveTrade = async () => {
    if (!buyBankId || !sellBankId) {
      setErrorMessage('Оберіть банки покупки та продажу');
      return;
    }

    if (numBuyRate <= 0 || numSellRate <= 0) {
      setErrorMessage('Вкажіть коректні курси покупки та продажу');
      return;
    }

    if (numBuyAmountUah <= 0) {
      setErrorMessage('Вкажіть суму покупки в гривнях');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await api.createTrade({
        buyExchange,
        buyBankId,
        buyRate: numBuyRate,
        buyAmountUah: numBuyAmountUah,
        buyUsdtAmount: calcBuyUsdt,
        buyCommission: numBuyComm,
        buyCommissionType,
        sellExchange,
        sellBankId,
        sellRate: numSellRate,
        sellUsdtAmount: effectiveSellUsdt,
        sellAmountUah: totalRevenueUah,
        sellCommission: numSellComm,
        sellCommissionType,
        extraExpensesUah: numExtraExpenses,
        notes: notes.trim() || undefined,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);

      await refreshCatalog(true);
      resetFormFields();

      if (onTradeSaved) {
        onTradeSaved();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Не вдалося зберегти сделку');
    } finally {
      setIsSaving(false);
    }
  };

  const formatUah = (val: number) => {
    return new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatUsdt = (val: number) => {
    return new Intl.NumberFormat('uk-UA', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(val || 0);
  };

  if (!catalogReady) {
    return <PageLoader label="Завантаження калькулятора..." />;
  }

  return (
    <div className="space-y-3 lg:space-y-3.5">


      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <CalcIcon className="w-6 h-6 text-blue-600 dark:text-sky-400 shrink-0" />
          <span>{t('calcTitle')}</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('calcSubtitle')}
        </p>
      </div>


      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-sm font-semibold">{t('tradeSavedSuccess')}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="text-sm font-semibold">{errorMessage}</span>
        </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">


        <div className="lg:col-span-7 space-y-3 lg:space-y-3.5">


          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-3.5 sm:p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="block-direction-icon bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400">
                  <ArrowDown />
                </div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('buyBlock')}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div>
                <label className={fieldLabelClass}>
                  {t('exchange')}
                </label>
                <select
                  value={buyExchange}
                  onChange={e => setBuyExchange(e.target.value)}
                  className={fieldSelectClass}
                >
                  {exchanges.map(ex => (
                    <option key={ex.id} value={ex.name}>{ex.name}</option>
                  ))}
                  <option value="Інша біржа">Інша біржа</option>
                </select>
              </div>


              <div>
                <label className={fieldLabelClass}>
                  {t('bank')}
                </label>
                <select
                  value={buyBankId}
                  onChange={e => setBuyBankId(e.target.value)}
                  className={fieldSelectClass}
                  disabled={banks.length === 0}
                >
                  {banks.length === 0 && (
                    <option value="">{t('noBanks') || 'Немає банків — додайте в розділі «Мої банки»'}</option>
                  )}
                  {banks.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Залишок: {formatUah(Math.max(0, b.turnoverLimitUah - b.buyTurnoverUah))} ₴)
                    </option>
                  ))}
                </select>
              </div>


              <div>
                <label className={fieldLabelClass}>
                  {t('buyRate')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={buyRate}
                    onChange={e => setBuyRate(e.target.value)}
                    placeholder="44.00"
                    className={`${fieldNumberSuffixClass} placeholder:text-slate-400 dark:placeholder:text-slate-500`}
                  />
                  <span className={fieldSuffixClass}>₴/$</span>
                </div>
              </div>


              <div>
                <label className={fieldLabelClass}>
                  {t('buyAmountUah')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={buyAmountUah}
                    onChange={e => setBuyAmountUah(e.target.value)}
                    placeholder="10000"
                    className={`${fieldNumberSuffixClass} font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500`}
                  />
                  <span className={fieldSuffixClass}>UAH</span>
                </div>
              </div>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
              <div>
                <label className={fieldLabelClass}>
                  {t('commission')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={buyCommission}
                  onChange={e => setBuyCommission(e.target.value)}
                  placeholder="0"
                  className={`${fieldNumberSmClass} placeholder:text-slate-400 dark:placeholder:text-slate-500`}
                />
              </div>

              <div>
                <label className={fieldLabelClass}>
                  {t('commissionType')}
                </label>
                <select
                  value={buyCommissionType}
                  onChange={e => setBuyCommissionType(e.target.value as any)}
                  className={fieldSelectClass}
                >
                  <option value="percent">{t('percent')}</option>
                  <option value="fixed_uah">{t('fixedUah')}</option>
                  <option value="fixed_usdt">{t('fixedUsdt')}</option>
                </select>
              </div>
            </div>


            {isBuyOverLimit && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Увага: сума покупки ({formatUah(numBuyAmountUah)} ₴) перевищує доступний залишок ліміту обраного банку ({formatUah(buyBankAvailable)} ₴).
                </span>
              </div>
            )}
          </div>


          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-3.5 sm:p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="block-direction-icon bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <ArrowUp />
                </div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('sellBlock')}
                </h2>
              </div>
              <span className="text-[10px] sm:text-xs font-mono tabular-nums text-slate-500 shrink-0">
                Виторг: <strong className="text-emerald-600 dark:text-emerald-400">{formatUah(totalRevenueUah)} UAH</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <div>
                <label className={fieldLabelClass}>
                  {t('exchange')}
                </label>
                <select
                  value={sellExchange}
                  onChange={e => setSellExchange(e.target.value)}
                  className={fieldSelectClass}
                >
                  {exchanges.map(ex => (
                    <option key={ex.id} value={ex.name}>{ex.name}</option>
                  ))}
                  <option value="Інша біржа">Інша біржа</option>
                </select>
              </div>


              <div>
                <label className={fieldLabelClass}>
                  {t('bank')}
                </label>
                <select
                  value={sellBankId}
                  onChange={e => setSellBankId(e.target.value)}
                  className={fieldSelectClass}
                  disabled={banks.length === 0}
                >
                  {banks.length === 0 && (
                    <option value="">{t('noBanks') || 'Немає банків — додайте в розділі «Мої банки»'}</option>
                  )}
                  {banks.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} (Залишок: {formatUah(Math.max(0, b.turnoverLimitUah - b.sellTurnoverUah))} ₴)
                    </option>
                  ))}
                </select>
              </div>


              <div>
                <label className={fieldLabelClass}>
                  {t('sellRate')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellRate}
                    onChange={e => setSellRate(e.target.value)}
                    placeholder="46.00"
                    className={`${fieldNumberSuffixClass} placeholder:text-slate-400 dark:placeholder:text-slate-500`}
                  />
                  <span className={fieldSuffixClass}>₴/$</span>
                </div>
              </div>


              <div>
                <label className={fieldLabelClass}>
                  {t('usdtAmount')}{' '}
                  <span className="text-xs font-normal text-slate-400">({t('usdtAmountOptional')})</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="0.0000"
                    value={sellUsdtAmount}
                    onChange={e => setSellUsdtAmount(e.target.value)}
                    className={`${fieldNumberSuffixClass} placeholder:text-slate-400 dark:placeholder:text-slate-500`}
                  />
                  <span className={fieldSuffixClass}>USDT</span>
                </div>
              </div>
            </div>


            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5">
              <div>
                <label className={fieldLabelClass}>
                  {t('commission')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellCommission}
                  onChange={e => setSellCommission(e.target.value)}
                  placeholder="0"
                  className={`${fieldNumberSmClass} placeholder:text-slate-400 dark:placeholder:text-slate-500`}
                />
              </div>

              <div>
                <label className={fieldLabelClass}>
                  {t('commissionType')}
                </label>
                <select
                  value={sellCommissionType}
                  onChange={e => setSellCommissionType(e.target.value as any)}
                  className={fieldSelectClass}
                >
                  <option value="percent">{t('percent')}</option>
                  <option value="fixed_uah">{t('fixedUah')}</option>
                  <option value="fixed_usdt">{t('fixedUsdt')}</option>
                </select>
              </div>

              <div>
                <label className={fieldLabelClass}>
                  {t('extraExpenses')}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={extraExpensesUah}
                  onChange={e => setExtraExpensesUah(e.target.value)}
                  placeholder="0"
                  className={`${fieldNumberSmClass} placeholder:text-slate-400 dark:placeholder:text-slate-500`}
                />
              </div>
            </div>


            <div>
              <label className={fieldLabelClass}>
                {t('tradeNotes')}
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t('tradeNotesPlaceholder')}
                className="w-full px-2.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-0"
              />
            </div>
          </div>

        </div>


        <div className="lg:col-span-5 space-y-3">

          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-4 sm:p-5 shadow-sm space-y-4 lg:sticky lg:top-16">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-start justify-between gap-3">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 min-w-0">
                <TrendingUp className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                <span>{t('calculationResult')}</span>
              </h2>
              <span className="text-[10px] leading-tight font-mono tabular-nums text-slate-500 text-right shrink-0">
                1 USDT = {numBuyRate} → {numSellRate} ₴
              </span>
            </div>


            <div className={`p-4 rounded-xl border ${
              netProfitUah >= 0
                ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/60'
                : 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/60'
            }`}>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                {t('netProfit')}
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <div className={`text-xl sm:text-2xl font-extrabold font-mono tabular-nums leading-tight ${
                  netProfitUah >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {netProfitUah >= 0 ? '+' : ''}{formatUah(netProfitUah)} <span className="text-sm font-semibold">UAH</span>
                </div>
                <div className={`text-sm font-bold font-mono tabular-nums shrink-0 ${
                  roiPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {roiPercent >= 0 ? '+' : ''}{roiPercent.toFixed(2)}% ROI
                </div>
              </div>
            </div>


            <div className="space-y-0.5 text-xs sm:text-[13px]">
              <div className="flex justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{t('boughtUsdt')}</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {formatUsdt(calcBuyUsdt)} USDT
                </span>
              </div>

              <div className="flex justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{t('soldUsdt')}</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {formatUsdt(effectiveSellUsdt)} USDT
                </span>
              </div>

              <div className="flex justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{t('totalCosts')}</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {formatUah(totalCostUah)} ₴
                </span>
              </div>

              <div className="flex justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{t('totalRevenue')}</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {formatUah(totalRevenueUah)} ₴
                </span>
              </div>

              <div className="flex justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{t('grossProfit')}</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {formatUah(grossProfitUah)} ₴
                </span>
              </div>

              <div className="flex justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{t('totalCommissions')}</span>
                <span className="font-mono tabular-nums text-slate-500">
                  {formatUah(totalFeesUah)} ₴
                </span>
              </div>

              <div className="flex justify-between gap-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{t('spreadPerUnit')}</span>
                <span className="font-mono tabular-nums font-semibold text-blue-600 dark:text-sky-400">
                  {spreadPerUnit >= 0 ? '+' : ''}{spreadPerUnit.toFixed(2)} ₴ / USDT
                </span>
              </div>

              <div className="flex justify-between gap-3 py-2">
                <span className="text-slate-500 dark:text-slate-400">{t('spread')}</span>
                <span className="font-mono tabular-nums font-bold text-blue-600 dark:text-sky-400">
                  {spreadPercent >= 0 ? '+' : ''}{spreadPercent.toFixed(2)}%
                </span>
              </div>
            </div>


            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2.5">
              <button
                onClick={handleSaveTrade}
                disabled={isSaving}
                className="w-full min-h-[2.5rem] py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <ButtonLoader label={t('savingTrade')} />
                ) : (
                  <>
                    <Save className="w-4 h-4 shrink-0" />
                    <span>{t('saveTradeBtn')}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="w-full min-h-[2.5rem] py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4 shrink-0" />
                <span>{t('clearFormBtn')}</span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
