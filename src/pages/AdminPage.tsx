import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useCatalog } from "../context/CatalogContext";
import { api } from "../services/api";
import {
  AdminOverview,
  StudentStatsItem,
  GlobalBank,
  Exchange,
  Trade,
} from "../types";
import {
  Users,
  BarChart3,
  Building2,
  TrendingUp,
  Search,
  Lock,
  Unlock,
  KeyRound,
  Trash2,
  Edit,
  Plus,
  Check,
  AlertTriangle,
  X,
  Eye,
  RefreshCw,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  FileText,
  ImagePlus,
  ImageOff,
} from "lucide-react";
import { ButtonLoader, PageLoader } from "../components/ui/Loader";
import { PeriodFilterBar } from "../components/filters/PeriodFilterBar";
import {
  defaultPeriodFilter,
  periodToQuery,
  type PeriodPreset,
} from "../lib/period-filter";
import { aggregateTradePeriodStats } from "../lib/trade-period-stats";
import { aggregateTradeRateExtras } from "../lib/trade-rate-extras";
import {
  statCardShell,
  statHeaderClass,
  statHeaderIconSlotClass,
  statLabelClass,
  statThemeClass,
  statUnitClass,
  statValueClass,
  statLabelCompactClass,
  type StatTheme,
} from "../lib/stat-card-theme";
import { BankLogo } from "../components/banks/BankLogo";
import { readBankLogoFile } from "../lib/bank-logo-file";

export const AdminPage: React.FC = () => {
  const { user, t } = useAuth();
  const { refreshCatalog } = useCatalog();

  const [activeSection, setActiveSection] = useState<
    "overview" | "accounts" | "students" | "banks" | "exchanges"
  >("overview");
  const [isLoading, setIsLoading] = useState(false);

  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [period, setPeriod] = useState(defaultPeriodFilter);
  const [turnoverInUsdt, setTurnoverInUsdt] = useState(false);
  const [buySideOpen, setBuySideOpen] = useState(true);
  const [sellSideOpen, setSellSideOpen] = useState(true);

  const [usersList, setUsersList] = useState<any[]>([]);
  const [accountSearch, setAccountSearch] = useState("");
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<any | null>(
    null,
  );
  const [editNick, setEditNick] = useState("");
  const [editTg, setEditTg] = useState("");
  const [editRole, setEditRole] = useState("student");
  const [tempPasswordModal, setTempPasswordModal] = useState<{
    username: string;
    tempPass: string;
  } | null>(null);
  const [deleteUserTarget, setDeleteUserTarget] = useState<any | null>(null);

  const [studentsStats, setStudentsStats] = useState<StudentStatsItem[]>([]);
  const [inspectedStudent, setInspectedStudent] =
    useState<StudentStatsItem | null>(null);
  const [inspectedStudentTrades, setInspectedStudentTrades] = useState<Trade[]>(
    [],
  );
  const [loadingInspection, setLoadingInspection] = useState(false);

  const [globalBanks, setGlobalBanks] = useState<GlobalBank[]>([]);
  const [editingGlobalBank, setEditingGlobalBank] = useState<GlobalBank | null>(
    null,
  );
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isSavingGlobalBank, setIsSavingGlobalBank] = useState(false);
  const [deleteGlobalBankTarget, setDeleteGlobalBankTarget] =
    useState<GlobalBank | null>(null);
  const [isDeletingGlobalBank, setIsDeletingGlobalBank] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [bankLimit, setBankLimit] = useState("100000");
  const [bankLogoSvg, setBankLogoSvg] = useState<string | undefined>(undefined);
  const [bankLogoDirty, setBankLogoDirty] = useState(false);

  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [newExName, setNewExName] = useState("");
  const [newExCode, setNewExCode] = useState("");

  const [adminMessage, setAdminMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const showMsg = (text: string, type: "success" | "error" = "success") => {
    setAdminMessage({ text, type });
    setTimeout(() => setAdminMessage(null), 4000);
  };

  useEffect(() => {
    if (activeSection === "overview") return;
    loadSectionData(activeSection);
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "overview") return;

    const ac = new AbortController();
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const data = await api.getAdminOverview(
          periodToQuery(period),
          ac.signal,
        );
        if (!cancelled) setOverview(data);
      } catch (err: unknown) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        showMsg(
          err instanceof Error ? err.message : "Помилка завантаження огляду",
          "error",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [activeSection, period]);

  const loadSectionData = async (section: string) => {
    setIsLoading(true);
    try {
      if (section === "accounts") {
        const data = await api.getAdminUsers({ search: accountSearch });
        setUsersList(data.users);
      } else if (section === "students") {
        const data = await api.getStudentsStats();
        setStudentsStats(data.results);
      } else if (section === "banks") {
        const data = await api.getGlobalBanks();
        setGlobalBanks(data.banks);
      } else if (section === "exchanges") {
        const data = await api.getAdminExchanges();
        setExchanges(data.exchanges);
      }
    } catch (err: any) {
      showMsg(
        err.message || "Помилка завантаження даних адмін-панелі",
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === "accounts") {
      const h = setTimeout(() => {
        api
          .getAdminUsers({ search: accountSearch })
          .then((d) => setUsersList(d.users));
      }, 300);
      return () => clearTimeout(h);
    }
  }, [accountSearch]);

  const handleToggleUserStatus = async (userItem: any) => {
    const newStatus = userItem.status === "active" ? "blocked" : "active";
    try {
      await api.setUserStatus(userItem.id, newStatus);
      showMsg(`Статус ${userItem.nickname} змінено на ${newStatus}`);
      loadSectionData("accounts");
    } catch (err: any) {
      showMsg(err.message, "error");
    }
  };

  const handleOpenEditUser = (userItem: any) => {
    setSelectedUserToEdit(userItem);
    setEditNick(userItem.nickname);
    setEditTg(userItem.telegram);
    setEditRole(userItem.role);
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToEdit) return;
    try {
      await api.updateUserProfile(selectedUserToEdit.id, {
        nickname: editNick,
        telegram: editTg,
        role: editRole,
      });
      showMsg("Дані акаунта оновлено");
      setSelectedUserToEdit(null);
      loadSectionData("accounts");
    } catch (err: any) {
      showMsg(err.message, "error");
    }
  };

  const handleResetPassword = async (userItem: any) => {
    try {
      const res = await api.resetUserPassword(userItem.id);
      setTempPasswordModal({
        username: userItem.nickname,
        tempPass: res.temporaryPassword,
      });
      showMsg("Пароль безпечно скинуто");
    } catch (err: any) {
      showMsg(err.message, "error");
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserTarget) return;
    try {
      await api.deleteUser(deleteUserTarget.id);
      showMsg(`Користувача ${deleteUserTarget.nickname} видалено`);
      setDeleteUserTarget(null);
      loadSectionData("accounts");
    } catch (err: any) {
      showMsg(err.message, "error");
    }
  };

  const handleInspectStudent = async (student: StudentStatsItem) => {
    setInspectedStudent(student);
    setLoadingInspection(true);
    try {
      const res = await api.getTrades({ targetUserId: student.userId });
      setInspectedStudentTrades(res.trades);
    } catch (err: any) {
      showMsg(err.message, "error");
    } finally {
      setLoadingInspection(false);
    }
  };

  const handleOpenAddGlobalBank = () => {
    setEditingGlobalBank(null);
    setBankName("");
    setBankCode("");
    setBankLimit("100000");
    setBankLogoSvg(undefined);
    setBankLogoDirty(false);
    setIsBankModalOpen(true);
  };

  const handleOpenEditGlobalBank = (gb: GlobalBank) => {
    setEditingGlobalBank(gb);
    setBankName(gb.name);
    setBankCode(gb.code);
    setBankLimit(gb.defaultLimitUah.toString());
    setBankLogoSvg(gb.logoSvg);
    setBankLogoDirty(false);
    setIsBankModalOpen(true);
  };

  const handleBankLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await readBankLogoFile(file);
      setBankLogoSvg(dataUrl);
      setBankLogoDirty(true);
    } catch (err: any) {
      showMsg(err.message || "Не вдалося завантажити фото", "error");
    }
  };

  const handleSaveGlobalBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingGlobalBank) return;

    setIsSavingGlobalBank(true);
    try {
      const logoPayload =
        bankLogoDirty || !editingGlobalBank
          ? { logoSvg: bankLogoSvg ?? "" }
          : {};

      if (editingGlobalBank) {
        await api.updateGlobalBank(editingGlobalBank.id, {
          name: bankName,
          defaultLimitUah: parseFloat(bankLimit),
          ...logoPayload,
        });
      } else {
        await api.createGlobalBank({
          name: bankName,
          code: bankCode,
          defaultLimitUah: parseFloat(bankLimit),
          logoSvg: bankLogoSvg,
        });
      }
      setIsBankModalOpen(false);
      showMsg("Довідник банків оновлено");
      await Promise.all([loadSectionData("banks"), refreshCatalog()]);
    } catch (err: any) {
      showMsg(err.message, "error");
    } finally {
      setIsSavingGlobalBank(false);
    }
  };

  const handleDeleteGlobalBank = async () => {
    if (!deleteGlobalBankTarget || isDeletingGlobalBank) return;

    const target = deleteGlobalBankTarget;
    setIsDeletingGlobalBank(true);
    try {
      await api.deleteGlobalBank(target.id);
      showMsg(`Банк «${target.name}» видалено`);
      setDeleteGlobalBankTarget(null);
      if (editingGlobalBank?.id === target.id) {
        setIsBankModalOpen(false);
      }
      await Promise.all([loadSectionData("banks"), refreshCatalog()]);
    } catch (err: any) {
      showMsg(err.message, "error");
    } finally {
      setIsDeletingGlobalBank(false);
    }
  };

  const handleAddExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName || !newExCode) return;
    try {
      await api.createAdminExchange({ name: newExName, code: newExCode });
      setNewExName("");
      setNewExCode("");
      showMsg("Біржу додано");
      loadSectionData("exchanges");
    } catch (err: any) {
      showMsg(err.message, "error");
    }
  };

  const handleToggleExchangeActive = async (ex: Exchange) => {
    try {
      await api.updateAdminExchange(ex.id, { isActive: !ex.isActive });
      loadSectionData("exchanges");
    } catch (err: any) {
      showMsg(err.message, "error");
    }
  };

  const formatUah = useCallback((val: number) => {
    return new Intl.NumberFormat("uk-UA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  }, []);

  const formatUsdt = (val: number) => {
    return new Intl.NumberFormat("uk-UA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatRate = (val: number) => {
    return new Intl.NumberFormat("uk-UA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const periodStats = useMemo(
    () => aggregateTradePeriodStats(overview?.trades ?? []),
    [overview?.trades],
  );

  const rateExtras = useMemo(
    () => aggregateTradeRateExtras(overview?.trades ?? []),
    [overview?.trades],
  );

  const nbuRate = overview?.usdUahRate ?? null;

  const formatTurnoverValue = (uah: number) => {
    if (turnoverInUsdt && nbuRate && nbuRate > 0) {
      return formatUsdt(uah / nbuRate);
    }
    return formatUah(uah);
  };

  const turnoverUnitLabel = turnoverInUsdt && nbuRate ? "USDT" : "UAH";

  const overviewStatCardClass = (theme: StatTheme) =>
    `${statCardShell(theme)} h-full min-h-[4.75rem] sm:min-h-[5rem]`;

  const turnoverCardClass =
    overviewStatCardClass("turnover") +
    " col-span-2 md:col-span-1 order-2 md:order-3 text-left w-full transition-colors" +
    (nbuRate
      ? " cursor-pointer hover:brightness-105 dark:hover:brightness-110"
      : "");

  const presetLabels: Record<PeriodPreset, string> = {
    all: t("filterAll"),
    today: t("filterToday"),
    yesterday: t("filterYesterday"),
    week: t("filterWeek"),
    month: t("filterMonth"),
  };

  const navTabs = [
    { id: "overview", label: t("adminOverview"), icon: BarChart3 },
    { id: "accounts", label: t("adminAccounts"), icon: Users },
    { id: "students", label: t("adminStudentsStats"), icon: TrendingUp },
    { id: "banks", label: t("adminBanksCatalog"), icon: Building2 },
    { id: "exchanges", label: t("adminExchanges"), icon: RefreshCw },
  ];

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {adminMessage && (
        <div
          className={`p-3.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 ${
            adminMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60"
              : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60"
          }`}
        >
          {adminMessage.type === "success" ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{adminMessage.text}</span>
        </div>
      )}

      <div className="hide-scrollbar flex items-center gap-1.5 overflow-x-auto pb-3 border-b border-slate-200 dark:border-slate-800 text-sm">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-2 font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {isLoading && activeSection !== "overview" && (
        <PageLoader label="Завантаження..." className="py-16" />
      )}

      {activeSection === "overview" && (
        <>
          <PeriodFilterBar
            value={period}
            onChange={setPeriod}
            t={t}
            presetLabels={presetLabels}
          />

          {isLoading && (
            <PageLoader label="Завантаження..." className="py-16" />
          )}

          {!isLoading && overview && (
            <div className="flex min-w-0 flex-col gap-2 sm:gap-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 items-stretch auto-rows-fr min-w-0">
                <div
                  className={`${overviewStatCardClass("profit")} col-span-2 md:col-span-1 order-1 md:order-1`}
                >
                  <div className={statHeaderClass}>
                    <p className={statLabelClass("profit")}>
                      {t("periodProfit")}
                    </p>
                    <TrendingUp
                      className={`${statHeaderIconSlotClass} ${statThemeClass.profit.label}`}
                      aria-hidden
                    />
                  </div>
                  <p className={statValueClass("profit")}>
                    {periodStats.profit < 0 ? "-" : ""}
                    {formatUah(Math.abs(periodStats.profit))}{" "}
                    <span className={statUnitClass("profit")}>UAH</span>
                  </p>
                </div>

                <div
                  className={`${overviewStatCardClass("roi")} order-3 md:order-2`}
                >
                  <div className={statHeaderClass}>
                    <p className={statLabelClass("roi")}>
                      {t("periodRoiSpread")}
                    </p>
                    <BarChart3
                      className={`${statHeaderIconSlotClass} ${statThemeClass.roi.label}`}
                      aria-hidden
                    />
                  </div>
                  <p className={statValueClass("roi")}>
                    {periodStats.roiPercent < 0 ? "-" : ""}
                    {Math.abs(periodStats.roiPercent).toFixed(2)}%
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => nbuRate && setTurnoverInUsdt((v) => !v)}
                  disabled={!nbuRate}
                  className={turnoverCardClass}
                  aria-label={t("switchTurnoverUnit")}
                >
                  <div className={statHeaderClass}>
                    <p className={statLabelClass("turnover")}>
                      {t("totalTurnoverPeriod")}
                    </p>
                    <ArrowLeftRight
                      className={`${statHeaderIconSlotClass} ${nbuRate ? "opacity-80" : "opacity-35"} ${statThemeClass.turnover.label}`}
                      aria-hidden
                    />
                  </div>
                  <p className={statValueClass("turnover")}>
                    {formatTurnoverValue(periodStats.totalTurnover)}{" "}
                    <span className={statUnitClass("turnover")}>
                      {turnoverUnitLabel}
                    </span>
                  </p>
                </button>

                <div
                  className={`${overviewStatCardClass("trades")} order-4 md:order-4`}
                >
                  <div className={statHeaderClass}>
                    <p className={statLabelClass("trades")}>
                      {t("periodTradesCount")}
                    </p>
                    <FileText
                      className={`${statHeaderIconSlotClass} ${statThemeClass.trades.label}`}
                      aria-hidden
                    />
                  </div>
                  <p className={statValueClass("trades")}>
                    {periodStats.tradesCount}
                  </p>
                </div>
              </div>

              <div
                className="h-px w-full shrink-0 bg-slate-300/90 dark:bg-white/30 my-2 sm:my-3"
                role="separator"
                aria-hidden
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 min-w-0">
                <div className={overviewStatCardClass("profit")}>
                  <button
                    type="button"
                    onClick={() => setBuySideOpen((open) => !open)}
                    aria-expanded={buySideOpen}
                    className="flex w-full items-center justify-between gap-2 text-left rounded-lg -m-1 p-1 hover:bg-emerald-500/10 dark:hover:bg-emerald-400/10 transition-colors"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <ArrowDownLeft
                        className={`w-4 h-4 shrink-0 ${statThemeClass.profit.label}`}
                        aria-hidden
                      />
                      <span className={`${statLabelClass("profit")} mb-0`}>
                        {t("adminBuySide")}
                      </span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 ${statThemeClass.profit.label} transition-transform duration-200 ${buySideOpen ? "" : "-rotate-90"}`}
                      aria-hidden
                    />
                  </button>
                  {buySideOpen ? (
                    <dl className="mt-3 space-y-0 divide-y divide-emerald-500/15 dark:divide-emerald-400/20">
                      {[
                        {
                          label: t("adminAvgPrice"),
                          value: formatRate(rateExtras.avgBuyRate),
                        },
                        {
                          label: t("adminMinPrice"),
                          value: formatRate(rateExtras.minBuyRate),
                        },
                        {
                          label: t("adminMaxPrice"),
                          value: formatRate(rateExtras.maxBuyRate),
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                        >
                          <dt className={statLabelCompactClass("profit")}>
                            {row.label}
                          </dt>
                          <dd
                            className={`${statValueClass("profit")} text-base sm:text-lg`}
                          >
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className={statLabelCompactClass("profit")}>
                        {t("adminAvgPrice")}
                      </span>
                      <span
                        className={`${statValueClass("profit")} text-base sm:text-lg`}
                      >
                        {formatRate(rateExtras.avgBuyRate)}
                      </span>
                    </div>
                  )}
                </div>

                <div className={overviewStatCardClass("turnover")}>
                  <button
                    type="button"
                    onClick={() => setSellSideOpen((open) => !open)}
                    aria-expanded={sellSideOpen}
                    className="flex w-full items-center justify-between gap-2 text-left rounded-lg -m-1 p-1 hover:bg-violet-500/10 dark:hover:bg-violet-400/10 transition-colors"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <ArrowUpRight
                        className={`w-4 h-4 shrink-0 ${statThemeClass.turnover.label}`}
                        aria-hidden
                      />
                      <span className={`${statLabelClass("turnover")} mb-0`}>
                        {t("adminSellSide")}
                      </span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 ${statThemeClass.turnover.label} transition-transform duration-200 ${sellSideOpen ? "" : "-rotate-90"}`}
                      aria-hidden
                    />
                  </button>
                  {sellSideOpen ? (
                    <dl className="mt-3 space-y-0 divide-y divide-violet-500/15 dark:divide-violet-400/20">
                      {[
                        {
                          label: t("adminAvgPrice"),
                          value: formatRate(rateExtras.avgSellRate),
                        },
                        {
                          label: t("adminMinPrice"),
                          value: formatRate(rateExtras.minSellRate),
                        },
                        {
                          label: t("adminMaxPrice"),
                          value: formatRate(rateExtras.maxSellRate),
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                        >
                          <dt className={statLabelCompactClass("turnover")}>
                            {row.label}
                          </dt>
                          <dd
                            className={`${statValueClass("turnover")} text-base sm:text-lg`}
                          >
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className={statLabelCompactClass("turnover")}>
                        {t("adminAvgPrice")}
                      </span>
                      <span
                        className={`${statValueClass("turnover")} text-base sm:text-lg`}
                      >
                        {formatRate(rateExtras.avgSellRate)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className={overviewStatCardClass("roi")}>
                <div className="flex items-center gap-2 mb-4">
                  <Users
                    className={`w-4 h-4 shrink-0 ${statThemeClass.roi.label}`}
                    aria-hidden
                  />
                  <p className={`${statLabelClass("roi")} mb-0`}>
                    {t("adminStudentStatsTitle")}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 divide-x divide-slate-200/80 dark:divide-slate-700/80">
                  <div className="pr-3 sm:pr-4">
                    <p className={statLabelCompactClass("profit")}>
                      {t("activeStudents")}
                    </p>
                    <p className="mt-1 flex items-center gap-2">
                      <span className={statValueClass("profit")}>
                        {overview.activeStudents}
                      </span>
                      <span
                        className="w-2.5 h-2.5 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.65)]"
                        aria-hidden
                      />
                    </p>
                  </div>
                  <div className="pl-3 sm:pl-4">
                    <p className={statLabelCompactClass("roi")}>
                      {t("totalStudents")}
                    </p>
                    <p className="mt-1 flex items-center gap-2">
                      <span className={statValueClass("roi")}>
                        {overview.totalStudents}
                      </span>
                      <span
                        className="w-2.5 h-2.5 shrink-0 rounded-full bg-sky-500 dark:bg-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.55)]"
                        aria-hidden
                      />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!isLoading && activeSection === "accounts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                placeholder="Пошук за нікнеймом або Telegram..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4">Нікнейм</th>
                  <th className="py-3 px-4">Telegram</th>
                  <th className="py-3 px-4">Роль</th>
                  <th className="py-3 px-4">Статус</th>
                  <th className="py-3 px-4">Дата реєстрації</th>
                  <th className="py-3 px-4 text-right">Угод</th>
                  <th className="py-3 px-4 text-right">Прибуток</th>
                  <th className="py-3 px-4 text-center">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {usersList.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {u.nickname}
                    </td>
                    <td className="py-3 px-4 font-mono text-blue-600 dark:text-sky-400">
                      {u.telegram}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                          u.status === "active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                        }`}
                      >
                        {u.status === "active" ? t("active") : t("blocked")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {u.tradesCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatUah(u.allTimeProfit)} ₴
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className="p-1 text-slate-400 hover:text-amber-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title={
                            u.status === "active"
                              ? t("blockAccount")
                              : t("unblockAccount")
                          }
                        >
                          {u.status === "active" ? (
                            <Lock className="w-3.5 h-3.5" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleResetPassword(u)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title={t("resetPasswordSafe")}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title={t("editAccount")}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteUserTarget(u)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title={t("deleteAccount")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && activeSection === "students" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4">Учень</th>
                  <th className="py-3 px-4">Telegram</th>
                  <th className="py-3 px-4 text-right">Сьогодні</th>
                  <th className="py-3 px-4 text-right">Вчора</th>
                  <th className="py-3 px-4 text-right">Місяць</th>
                  <th className="py-3 px-4 text-right">Весь час</th>
                  <th className="py-3 px-4 text-right">Оборот покупок</th>
                  <th className="py-3 px-4 text-right">Оборот продажів</th>
                  <th className="py-3 px-4 text-right">Угод</th>
                  <th className="py-3 px-4 text-center">Огляд угод</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {studentsStats.map((st) => (
                  <tr
                    key={st.userId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                      {st.nickname}
                    </td>
                    <td className="py-3 px-4 font-mono text-blue-600 dark:text-sky-400">
                      {st.telegram}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-600">
                      +{formatUah(st.profitToday)} ₴
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                      +{formatUah(st.profitYesterday)} ₴
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-600 font-semibold">
                      +{formatUah(st.profitMonth)} ₴
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      +{formatUah(st.profitAllTime)} ₴
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {formatUah(st.buyTurnover)} ₴
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {formatUah(st.sellTurnover)} ₴
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {st.tradesCount}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleInspectStudent(st)}
                        className="px-2.5 py-1 text-sm font-semibold rounded bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-sky-400 hover:bg-blue-100 transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Деталі</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isLoading && activeSection === "banks" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Загальний довідник банків (шаблони для учнів)
            </h2>
            <button
              onClick={handleOpenAddGlobalBank}
              className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Додати банк</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {globalBanks
              .filter((gb) => gb.isActive)
              .map((gb) => (
                  <div
                    key={gb.id}
                    className="group relative rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111827] p-3.5 sm:p-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm transition-all"
                  >
                    <div className="absolute top-2 right-2 flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditGlobalBank(gb)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Редагувати"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteGlobalBankTarget(gb)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Видалити"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex gap-3 pr-14">
                      <div className="shrink-0 self-start rounded-xl bg-slate-50 dark:bg-slate-900/70 p-2 ring-1 ring-inset ring-slate-200/70 dark:ring-slate-700/70">
                        <BankLogo
                          name={gb.name}
                          logoSvg={gb.logoSvg}
                          size="xl"
                        />
                      </div>

                      <div className="min-w-0 flex-1 flex flex-col justify-center gap-1 text-left">
                        <h4 className="font-bold text-sm sm:text-[15px] text-slate-900 dark:text-white leading-snug line-clamp-2">
                          {gb.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          <span className="text-slate-400 dark:text-slate-500">
                            Код:{" "}
                          </span>
                          <span className="font-mono text-slate-600 dark:text-slate-300">
                            {gb.code}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
              ))}
          </div>
        </div>
      )}

      {!isLoading && activeSection === "exchanges" && (
        <div className="space-y-6 max-w-2xl">
          <form
            onSubmit={handleAddExchange}
            className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3"
          >
            <input
              type="text"
              required
              placeholder="Назва біржі (наприклад: Bybit)"
              value={newExName}
              onChange={(e) => setNewExName(e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <input
              type="text"
              required
              placeholder="Код (bybit)"
              value={newExCode}
              onChange={(e) => setNewExCode(e.target.value)}
              className="w-28 px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shrink-0"
            >
              Додати біржу
            </button>
          </form>

          <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {exchanges.map((ex) => (
              <div
                key={ex.id}
                className="p-3.5 flex items-center justify-between text-sm"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white mr-2">
                    {ex.name}
                  </span>
                  <span className="font-mono text-slate-400 text-xs">
                    {ex.code}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleExchangeActive(ex)}
                  className={`px-2 py-1 rounded font-semibold text-xs transition-colors ${
                    ex.isActive
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {ex.isActive ? "Активна" : "Деактивована"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tempPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <KeyRound className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Новий тимчасовий пароль
                </h3>
                <p className="text-sm text-slate-500">
                  Для учня: <strong>{tempPasswordModal.username}</strong>
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Попередній пароль учня ніколи не зберігається у відкритому
              вигляді. Згенеровано новий надійний тимчасовий пароль. Передайте
              його учневі особисто:
            </p>

            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-base font-bold text-center select-all text-blue-600 dark:text-sky-400">
              {tempPasswordModal.tempPass}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setTempPasswordModal(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white"
              >
                Зрозуміло, скопійовано
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUserToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Редагувати акаунт ({selectedUserToEdit.nickname})
              </h3>
              <button onClick={() => setSelectedUserToEdit(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3 text-sm">
              <div>
                <label className="block font-semibold mb-1">Нікнейм</label>
                <input
                  type="text"
                  required
                  value={editNick}
                  onChange={(e) => setEditNick(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Telegram</label>
                <input
                  type="text"
                  required
                  value={editTg}
                  onChange={(e) => setEditTg(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Роль</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="student">Учень (student)</option>
                  <option value="admin">Адміністратор (admin)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserToEdit(null)}
                  className="px-4 py-2 font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold rounded-lg bg-blue-600 text-white"
                >
                  Зберегти
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteGlobalBankTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4 text-center">
            <Trash2 className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Видалити банк «{deleteGlobalBankTarget.name}»?
            </h3>
            <p className="text-sm text-slate-500">
              Шаблон зникне з довідника. Рахунки учнів залишаться, але без
              прив&apos;язки до цього шаблону.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingGlobalBank}
                onClick={() => setDeleteGlobalBankTarget(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50"
              >
                Скасувати
              </button>
              <button
                type="button"
                disabled={isDeletingGlobalBank}
                onClick={handleDeleteGlobalBank}
                className="inline-flex items-center justify-center min-w-[8rem] px-4 py-2 text-sm font-semibold rounded-lg bg-rose-600 text-white disabled:opacity-70"
              >
                {isDeletingGlobalBank ? (
                  <ButtonLoader label="Видалення..." />
                ) : (
                  "Видалити"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteUserTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4 text-center">
            <Trash2 className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Видалити учня {deleteUserTarget.nickname}?
            </h3>
            <p className="text-sm text-slate-500">
              {t("deleteAccountConfirm")}
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteUserTarget(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Скасувати
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-rose-600 text-white"
              >
                Видалити назавжди
              </button>
            </div>
          </div>
        </div>
      )}

      {inspectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Особистий журнал учня: {inspectedStudent.nickname} (
                  {inspectedStudent.telegram})
                </h3>
                <p className="text-sm text-slate-500">
                  Суммарний прибуток: +
                  {formatUah(inspectedStudent.profitAllTime)} ₴ | Угод:{" "}
                  {inspectedStudentTrades.length}
                </p>
              </div>
              <button onClick={() => setInspectedStudent(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {loadingInspection ? (
                <PageLoader label="Завантаження операцій учня..." />
              ) : inspectedStudentTrades.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  Учень ще не має збережених угод.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Дата</th>
                        <th className="py-2.5 px-3">Покупка</th>
                        <th className="py-2.5 px-3 text-right">Сума (UAH)</th>
                        <th className="py-2.5 px-3">Продаж</th>
                        <th className="py-2.5 px-3 text-right">Виторг (UAH)</th>
                        <th className="py-2.5 px-3 text-right">
                          Чистий прибуток
                        </th>
                        <th className="py-2.5 px-3 text-right">ROI %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                      {inspectedStudentTrades.map((tr) => (
                        <tr key={tr.id}>
                          <td className="py-2 px-3 text-slate-500">
                            {new Date(tr.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2 px-3 font-sans">
                            {tr.buyExchange} ({tr.buyBankName})
                          </td>
                          <td className="py-2 px-3 text-right font-semibold">
                            {formatUah(tr.buyAmountUah)} ₴
                          </td>
                          <td className="py-2 px-3 font-sans">
                            {tr.sellExchange} ({tr.sellBankName})
                          </td>
                          <td className="py-2 px-3 text-right font-semibold">
                            {formatUah(tr.sellAmountUah)} ₴
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-600">
                            +{formatUah(tr.netProfitUah)} ₴
                          </td>
                          <td className="py-2 px-3 text-right text-blue-600">
                            +{tr.roiPercent.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectedStudent(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}

      {isBankModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => {
            if (!isSavingGlobalBank) setIsBankModalOpen(false);
          }}
          role="presentation"
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-bank-modal-title"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3
                id="global-bank-modal-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                {editingGlobalBank
                  ? "Редагувати глобальний банк"
                  : "Додати глобальний банк"}
              </h3>
              <button
                type="button"
                disabled={isSavingGlobalBank}
                onClick={() => setIsBankModalOpen(false)}
                className="disabled:opacity-50 disabled:pointer-events-none"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSaveGlobalBank} className="space-y-3 text-sm">
              <div>
                <label className="block font-semibold mb-1">Назва банку</label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              {!editingGlobalBank && (
                <div>
                  <label className="block font-semibold mb-1">
                    Код банку (латиниця, напр. ukrsib)
                  </label>
                  <input
                    type="text"
                    required
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">
                  Стандартний ліміт обороту (UAH)
                </label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={bankLimit}
                  onChange={(e) => setBankLimit(e.target.value)}
                  className="w-full px-3 py-2 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Логотип банку (для всіх користувачів)
                </label>
                <div className="inline-flex flex-col items-center gap-2">
                  <BankLogo
                    name={bankName || "Банк"}
                    logoSvg={bankLogoSvg}
                    size="2xl"
                  />
                  <div className="flex items-center gap-1">
                    <label
                      className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-sky-400 transition-colors"
                      title="Завантажити фото"
                    >
                      <ImagePlus className="w-4 h-4" aria-hidden />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        onChange={handleBankLogoPick}
                      />
                    </label>
                    {bankLogoSvg && (
                      <button
                        type="button"
                        title="Прибрати фото"
                        onClick={() => {
                          setBankLogoSvg(undefined);
                          setBankLogoDirty(true);
                        }}
                        className="inline-flex items-center justify-center p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      >
                        <ImageOff className="w-4 h-4" aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSavingGlobalBank}
                  onClick={() => setIsBankModalOpen(false)}
                  className="px-4 py-2 font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 disabled:pointer-events-none"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={isSavingGlobalBank}
                  className="inline-flex items-center justify-center gap-2 min-w-[7.5rem] px-4 py-2 font-semibold rounded-lg bg-blue-600 text-white disabled:opacity-70 disabled:pointer-events-none"
                >
                  {isSavingGlobalBank ? (
                    <ButtonLoader label="Збереження..." />
                  ) : (
                    "Зберегти"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
