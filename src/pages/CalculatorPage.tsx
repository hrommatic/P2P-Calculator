import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { UserBank, Exchange } from '../types';
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
  'select-field w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500';
const fieldNumberSuffixClass =
  'number-input number-input-suffix w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500';
const fieldNumberSmClass =
  'number-input w-full px-3 py-2 text-xs font-mono tabular-nums rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500';

interface CalculatorPageProps {
  onTradeSaved?: () => void;
}

export const CalculatorPage: React.FC<CalculatorPageProps> = ({ onTradeSaved }) => {
  const { t } = useAuth();

  const [banks, setBanks] = useState<UserBank[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [buyExchange, setBuyExchange] = useState('Binance');
  const [buyBankId, setBuyBankId] = useState('');
  const [buyRate, setBuyRate] = useState<string>('44.00');
  const [buyAmountUah, setBuyAmountUah] = useState<string>('10000');
  const [buyCommission, setBuyCommission] = useState<string>('0');
  const [buyCommissionType, setBuyCommissionType] = useState<'percent' | 'fixed_uah' | 'fixed_usdt'>('percent');

  const [sellExchange, setSellExchange] = useState('Binance');
  const [sellBankId, setSellBankId] = useState('');
  const [sellRate, setSellRate] = useState<string>('46.00');
  const [sellUsdtAmount, setSellUsdtAmount] = useState<string>(''); // if blank, auto-uses bought USDT
  const [sellCommission, setSellCommission] = useState<string>('0');
  const [sellCommissionType, setSellCommissionType] = useState<'percent' | 'fixed_uah' | 'fixed_usdt'>('percent');
  const [extraExpensesUah, setExtraExpensesUah] = useState<string>('0');

  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch student banks and exchanges catalog
  useEffect(() => {
    async function loadCatalogs() {
      try {
        const [banksRes, exchangesRes] = await Promise.all([
          api.getBanks(),
          api.getExchanges(),
        ]);
        setBanks(banksRes.banks);
        setExchanges(exchangesRes.exchanges);

        if (banksRes.banks.length > 0) {
          setBuyBankId(banksRes.banks[0].id);
          setSellBankId(banksRes.banks[1]?.id || banksRes.banks[0].id);
        }
      } catch (err) {
        console.error('Failed to load banks or exchanges:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadCatalogs();
  }, []);

  // Compute live calculations
  const numBuyRate = Math.max(0.0001, parseFloat(buyRate) || 0);
  const numBuyAmountUah = parseFloat(buyAmountUah) || 0;
  const numBuyComm = parseFloat(buyCommission) || 0;

  // Bought USDT
  const calcBuyUsdt = numBuyRate > 0 ? numBuyAmountUah / numBuyRate : 0;

  // Buy Commission in UAH
  let calcBuyCommUah = 0;
  if (buyCommissionType === 'percent') {
    calcBuyCommUah = (numBuyAmountUah * numBuyComm) / 100;
  } else if (buyCommissionType === 'fixed_uah') {
    calcBuyCommUah = numBuyComm;
  } else if (buyCommissionType === 'fixed_usdt') {
    calcBuyCommUah = numBuyComm * numBuyRate;
  }

  // Sell Side
  const numSellRate = Math.max(0.0001, parseFloat(sellRate) || 0);
  const numCustomSellUsdt = parseFloat(sellUsdtAmount) || 0;
  const effectiveSellUsdt = numCustomSellUsdt > 0 ? numCustomSellUsdt : calcBuyUsdt;
  const calcGrossRevenueUah = effectiveSellUsdt * numSellRate;

  // Sell Commission in UAH
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

  // Core results
  const totalCostUah = numBuyAmountUah + calcBuyCommUah;
  const totalRevenueUah = calcGrossRevenueUah;
  const totalFeesUah = calcBuyCommUah + calcSellCommUah + numExtraExpenses;
  const grossProfitUah = totalRevenueUah - numBuyAmountUah;
  const netProfitUah = totalRevenueUah - totalCostUah - calcSellCommUah - numExtraExpenses;
  const roiPercent = totalCostUah > 0 ? (netProfitUah / totalCostUah) * 100 : 0;
  const spreadPerUnit = numSellRate - numBuyRate;
  const spreadPercent = numBuyRate > 0 ? (spreadPerUnit / numBuyRate) * 100 : 0;

  // Selected banks details for limit warnings
  const selectedBuyBank = banks.find(b => b.id === buyBankId);
  const selectedSellBank = banks.find(b => b.id === sellBankId);

  // Check if buy amount exceeds available limit
  const buyBankAvailable = selectedBuyBank
    ? Math.max(0, selectedBuyBank.turnoverLimitUah - (selectedBuyBank.buyTurnoverUah + selectedBuyBank.initialTurnoverUah))
    : 0;
  const isBuyOverLimit = selectedBuyBank && numBuyAmountUah > buyBankAvailable;

  const handleClear = () => {
    setBuyRate('44.00');
    setBuyAmountUah('10000');
    setBuyCommission('0');
    setSellRate('46.00');
    setSellUsdtAmount('');
    setSellCommission('0');
    setExtraExpensesUah('0');
    setNotes('');
    setErrorMessage(null);
  };

  const handleApplyPreset = (type: 'standard' | 'maker' | 'interbank') => {
    if (type === 'standard') {
      // 10 000 UAH @ 44 -> 46
      setBuyRate('44.00');
      setBuyAmountUah('10000');
      setBuyCommission('0');
      setSellRate('46.00');
      setSellUsdtAmount('');
      setSellCommission('0');
      setExtraExpensesUah('0');
      setNotes('Связка Binance: 10 000 ₴ @ 44.00 -> 46.00');
    } else if (type === 'maker') {
      // Bybit maker order with 0.1% taker fee on sell
      setBuyRate('44.15');
      setBuyAmountUah('25000');
      setBuyCommission('0');
      setSellRate('45.30');
      setSellUsdtAmount('');
      setSellCommission('0.1');
      setSellCommissionType('percent');
      setExtraExpensesUah('10');
      setNotes('Мейкер ордер Bybit із комісією продажу 0.1%');
    } else if (type === 'interbank') {
      // Interbank spread
      setBuyRate('44.20');
      setBuyAmountUah('50000');
      setBuyCommission('0');
      setSellRate('45.10');
      setSellUsdtAmount('');
      setSellCommission('15');
      setSellCommissionType('fixed_uah');
      setExtraExpensesUah('0');
      setNotes('Міжбанківський круг: Mono -> Privat');
    }
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

      // Refresh student banks to display updated turnover
      const banksRes = await api.getBanks();
      setBanks(banksRes.banks);

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

  if (loadingInitial) {
    return <PageLoader label="Завантаження калькулятора..." />;
  }

  return (
    <div className="space-y-6">
      
      {/* Header & Quick Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalcIcon className="w-6 h-6 text-blue-600 dark:text-sky-400" />
            <span>{t('calcTitle')}</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('calcSubtitle')}
          </p>
        </div>

        {/* Quick Presets for Convenient Testing */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs shrink-0">
          <span className="text-[11px] font-semibold px-2 text-slate-500 dark:text-slate-400">Приклади:</span>
          <button
            onClick={() => handleApplyPreset('standard')}
            className="px-2.5 py-1 font-semibold rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:text-blue-600 shadow-2xs transition-colors"
          >
            10k @ 44→46
          </button>
          <button
            onClick={() => handleApplyPreset('maker')}
            className="px-2.5 py-1 font-semibold rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:text-blue-600 shadow-2xs transition-colors"
          >
            25k Мейкер
          </button>
          <button
            onClick={() => handleApplyPreset('interbank')}
            className="px-2.5 py-1 font-semibold rounded bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:text-blue-600 shadow-2xs transition-colors"
          >
            50k Міжбанк
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-3">
          <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{t('tradeSavedSuccess')}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="text-xs font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Left Column (Inputs) & Right Column (Calculation Results) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Input Columns (Buy Block & Sell Block) - 7 cols */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* BUY BLOCK */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="block-direction-icon bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-sky-400">
                  <ArrowDown />
                </div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('buyBlock')}
                </h2>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                Куплено: <strong className="text-blue-600 dark:text-sky-400">{formatUsdt(calcBuyUsdt)} USDT</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Buy Exchange */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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

              {/* Buy Bank */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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

              {/* Buy Rate */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('buyRate')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={buyRate}
                    onChange={e => setBuyRate(e.target.value)}
                    className={fieldNumberSuffixClass}
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 pointer-events-none">₴/$</span>
                </div>
              </div>

              {/* Buy Amount in UAH */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('buyAmountUah')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={buyAmountUah}
                    onChange={e => setBuyAmountUah(e.target.value)}
                    className={`${fieldNumberSuffixClass} font-bold`}
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 pointer-events-none">UAH</span>
                </div>
              </div>
            </div>

            {/* Buy Commission Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('commission')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={buyCommission}
                  onChange={e => setBuyCommission(e.target.value)}
                  className={fieldNumberSmClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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

            {/* Limit Warning if applicable */}
            {isBuyOverLimit && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Увага: сума покупки ({formatUah(numBuyAmountUah)} ₴) перевищує доступний залишок ліміту обраного банку ({formatUah(buyBankAvailable)} ₴).
                </span>
              </div>
            )}
          </div>

          {/* SELL BLOCK */}
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="block-direction-icon bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <ArrowUp />
                </div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('sellBlock')}
                </h2>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                Виторг: <strong className="text-emerald-600 dark:text-emerald-400">{formatUah(totalRevenueUah)} UAH</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sell Exchange */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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

              {/* Sell Bank */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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

              {/* Sell Rate */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('sellRate')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={sellRate}
                    onChange={e => setSellRate(e.target.value)}
                    className={fieldNumberSuffixClass}
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 pointer-events-none">₴/$</span>
                </div>
              </div>

              {/* Sell USDT Quantity (Optional: if blank, auto uses bought USDT) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('usdtAmount')} <span className="text-[11px] font-normal text-slate-400">(за замовч. {formatUsdt(calcBuyUsdt)})</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder={formatUsdt(calcBuyUsdt)}
                    value={sellUsdtAmount}
                    onChange={e => setSellUsdtAmount(e.target.value)}
                    className={fieldNumberSuffixClass}
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 pointer-events-none">USDT</span>
                </div>
              </div>
            </div>

            {/* Sell Commission & Extra Expenses */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('commission')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellCommission}
                  onChange={e => setSellCommission(e.target.value)}
                  className={fieldNumberSmClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('extraExpenses')}
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={extraExpensesUah}
                  onChange={e => setExtraExpensesUah(e.target.value)}
                  className={fieldNumberSmClass}
                />
              </div>
            </div>

            {/* Note / Comment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('tradeNotes')}
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={t('tradeNotesPlaceholder')}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

        </div>

        {/* Right: Results Breakdown Card - 5 cols */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200/90 dark:border-slate-800/90 p-5 shadow-sm space-y-5 sticky top-20">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>{t('calculationResult')}</span>
              </h2>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                1 USDT = {numBuyRate} → {numSellRate} ₴
              </span>
            </div>

            {/* Highlighted Net Profit Badge Card */}
            <div className={`p-4 rounded-xl border ${
              netProfitUah >= 0
                ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/60'
                : 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/60'
            }`}>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('netProfit')}
              </div>
              <div className="flex items-baseline justify-between">
                <div className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums ${
                  netProfitUah >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {netProfitUah >= 0 ? '+' : ''}{formatUah(netProfitUah)} <span className="text-base font-semibold">UAH</span>
                </div>
                <div className={`text-sm font-bold font-mono tabular-nums ${
                  roiPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {roiPercent >= 0 ? '+' : ''}{roiPercent.toFixed(2)}% ROI
                </div>
              </div>
            </div>

            {/* Detailed Financial Breakdown Table */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{t('boughtUsdt')}</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {formatUsdt(calcBuyUsdt)} USDT
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{t('soldUsdt')}</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {formatUsdt(effectiveSellUsdt)} USDT
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{t('totalCosts')}</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {formatUah(totalCostUah)} ₴
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{t('totalRevenue')}</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {formatUah(totalRevenueUah)} ₴
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{t('grossProfit')}</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {formatUah(grossProfitUah)} ₴
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{t('totalCommissions')}</span>
                <span className="font-mono tabular-nums text-slate-500">
                  {formatUah(totalFeesUah)} ₴
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">{t('spreadPerUnit')}</span>
                <span className="font-mono tabular-nums font-semibold text-blue-600 dark:text-sky-400">
                  {spreadPerUnit >= 0 ? '+' : ''}{spreadPerUnit.toFixed(2)} ₴ / USDT
                </span>
              </div>

              <div className="flex justify-between py-1.5">
                <span className="text-slate-500 dark:text-slate-400">{t('spread')}</span>
                <span className="font-mono tabular-nums font-bold text-blue-600 dark:text-sky-400">
                  {spreadPercent >= 0 ? '+' : ''}{spreadPercent.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleSaveTrade}
                disabled={isSaving}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <ButtonLoader label={t('savingTrade')} />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{t('saveTradeBtn')}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t('clearFormBtn')}</span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
