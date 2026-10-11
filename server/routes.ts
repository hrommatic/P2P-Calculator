import { Router, Request, Response, NextFunction } from 'express';
import {
  getDb,
  saveDatabase,
  User,
  Session,
  Trade,
  UserBank,
  GlobalBank,
  Exchange,
  AuditLog,
  createBackup,
  listBackups,
} from './db.js';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  generateTemporaryPassword,
} from './crypto.js';
import { calculateTrade } from './calculation.js';

export const router = Router();

// Extend Request type for authenticated requests
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Authentication Middleware
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Потрібна авторизація (Authorization required)' });
  }

  const token = authHeader.substring(7).trim();
  const db = getDb();
  const session = db.sessions.find(s => s.token === token);

  if (!session) {
    return res.status(401).json({ error: 'Недійсний токен сесії (Invalid session)' });
  }

  const expires = new Date(session.expiresAt).getTime();
  if (expires < Date.now()) {
    // Remove expired session
    db.sessions = db.sessions.filter(s => s.token !== token);
    saveDatabase(db);
    return res.status(401).json({ error: 'Сесія закінчилася (Session expired)' });
  }

  const user = db.users.find(u => u.id === session.userId);
  if (!user) {
    return res.status(401).json({ error: 'Користувача не знайдено (User not found)' });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({ error: 'Ваш акаунт заблоковано. Зверніться до куратора (Account is blocked)' });
  }

  req.user = user;
  next();
}

// Admin only middleware
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ заборонено: потрібні права адміністратора (Admin rights required)' });
  }
  next();
}

// Helper to log admin actions
function logAdminAction(admin: User, actionType: string, details: string, targetUserId?: string) {
  const db = getDb();
  const log: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    actionType,
    adminId: admin.id,
    adminNickname: admin.nickname,
    targetUserId,
    details,
  };
  db.auditLogs.unshift(log);
  if (db.auditLogs.length > 500) {
    db.auditLogs = db.auditLogs.slice(0, 500);
  }
  saveDatabase(db);
}

// -----------------------------------------------------------------------------
// AUTH ROUTES
// -----------------------------------------------------------------------------

router.post('/auth/register', (req: Request, res: Response) => {
  const { nickname, telegram, password, confirmPassword } = req.body;
  const db = getDb();

  if (!db.siteSettings.allowRegistration) {
    return res.status(403).json({ error: 'Реєстрація тимчасово призупинена адміністратором' });
  }

  if (!nickname || typeof nickname !== 'string' || nickname.trim().length < 3) {
    return res.status(400).json({ error: 'Нікнейм має містити щонайменше 3 символи' });
  }

  const cleanNickname = nickname.trim().toLowerCase();
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(cleanNickname)) {
    return res.status(400).json({ error: 'Нікнейм може містити лише латинські літери, цифри та _ (3-24 символи)' });
  }

  if (!telegram || typeof telegram !== 'string') {
    return res.status(400).json({ error: 'Вкажіть Telegram у форматі @username' });
  }

  let cleanTelegram = telegram.trim();
  if (!cleanTelegram.startsWith('@')) {
    cleanTelegram = `@${cleanTelegram}`;
  }
  if (!/^@[a-zA-Z0-9_]{3,32}$/.test(cleanTelegram)) {
    return res.status(400).json({ error: 'Некоректний Telegram нікнейм' });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Пароль має містити щонайменше 6 символів' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Паролі не співпадають' });
  }

  // Check unique nickname
  const existing = db.users.find(u => u.nickname.toLowerCase() === cleanNickname);
  if (existing) {
    return res.status(400).json({ error: 'Користувач із таким нікнеймом уже зареєстрований' });
  }

  const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newUser: User = {
    id: userId,
    nickname: cleanNickname,
    telegram: cleanTelegram,
    passwordHash: hashPassword(password),
    role: 'student',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    themePreference: db.siteSettings.defaultTheme || 'navy',
    languagePreference: db.siteSettings.defaultLanguage || 'uk',
  };

  db.users.push(newUser);

  // Initialize standard user banks for the new student from active global banks
  const initialBanks = db.globalBanks.filter(gb => gb.isActive).slice(0, 4);
  initialBanks.forEach(gb => {
    db.userBanks.push({
      id: `ub_${userId}_${gb.code}`,
      userId: userId,
      globalBankId: gb.id,
      name: gb.name,
      turnoverLimitUah: gb.defaultLimitUah,
      initialTurnoverUah: 0,
      buyTurnoverUah: 0,
      sellTurnoverUah: 0,
      netProfitUah: 0,
      tradesCount: 0,
      color: gb.color,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Issue session token
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.sessions.push({
    token,
    userId,
    createdAt: now,
    expiresAt,
  });

  saveDatabase(db);

  return res.json({
    token,
    user: {
      id: newUser.id,
      nickname: newUser.nickname,
      telegram: newUser.telegram,
      role: newUser.role,
      status: newUser.status,
      themePreference: newUser.themePreference,
      languagePreference: newUser.languagePreference,
      createdAt: newUser.createdAt,
    },
  });
});

router.post('/auth/login', (req: Request, res: Response) => {
  const { nickname, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const rateLimitKey = `${ip}_${String(nickname || '').toLowerCase()}`;

  const db = getDb();

  // Rate limiting check: 5 attempts max in 5 minutes
  const attemptInfo = db.failedAttempts[rateLimitKey];
  if (attemptInfo && attemptInfo.lockedUntil && attemptInfo.lockedUntil > Date.now()) {
    const remainingSeconds = Math.ceil((attemptInfo.lockedUntil - Date.now()) / 1000);
    return res.status(429).json({
      error: `Забагато невдалих спроб входу. Спробуйте знову через ${remainingSeconds} сек.`,
    });
  }

  if (!nickname || !password) {
    return res.status(400).json({ error: 'Введіть нікнейм та пароль' });
  }

  const cleanNickname = String(nickname).trim().toLowerCase();
  const user = db.users.find(u => u.nickname.toLowerCase() === cleanNickname);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    // Record failed attempt
    const count = (attemptInfo?.count || 0) + 1;
    let lockedUntil: number | undefined;
    if (count >= 5) {
      lockedUntil = Date.now() + 5 * 60 * 1000; // Lock for 5 minutes
    }
    db.failedAttempts[rateLimitKey] = { count, lockedUntil };
    saveDatabase(db);

    return res.status(401).json({ error: 'Невірний нікнейм або пароль' });
  }

  if (user.status === 'blocked') {
    return res.status(403).json({
      error: `Ваш акаунт заблоковано. Напишіть у Telegram куратору ${db.siteSettings.curatorTelegram} для відновлення доступу.`,
    });
  }

  // Clear failed attempts on success
  delete db.failedAttempts[rateLimitKey];

  const now = new Date().toISOString();
  user.lastLoginAt = now;

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.sessions.push({
    token,
    userId: user.id,
    createdAt: now,
    expiresAt,
  });

  saveDatabase(db);

  return res.json({
    token,
    user: {
      id: user.id,
      nickname: user.nickname,
      telegram: user.telegram,
      role: user.role,
      status: user.status,
      themePreference: user.themePreference,
      languagePreference: user.languagePreference,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
    siteSettings: {
      siteName: db.siteSettings.siteName,
      curatorTelegram: db.siteSettings.curatorTelegram,
      announcement: db.siteSettings.announcement,
    },
  });
});

router.post('/auth/logout', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const token = req.headers.authorization?.substring(7).trim();
  if (token) {
    const db = getDb();
    db.sessions = db.sessions.filter(s => s.token !== token);
    saveDatabase(db);
  }
  return res.json({ success: true });
});

router.get('/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  return res.json({
    user: {
      id: user.id,
      nickname: user.nickname,
      telegram: user.telegram,
      role: user.role,
      status: user.status,
      themePreference: user.themePreference,
      languagePreference: user.languagePreference,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
    siteSettings: db.siteSettings,
  });
});

router.post('/auth/change-password', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;
  const user = req.user!;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Заповніть усі поля' });
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return res.status(400).json({ error: 'Поточний пароль невірний' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Новий пароль має бути не менше 6 символів' });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({ error: 'Нові паролі не співпадають' });
  }

  const db = getDb();
  const dbUser = db.users.find(u => u.id === user.id);
  if (dbUser) {
    dbUser.passwordHash = hashPassword(newPassword);
    dbUser.updatedAt = new Date().toISOString();
    saveDatabase(db);
  }

  return res.json({ success: true, message: 'Пароль успішно змінено' });
});

router.post('/auth/update-profile', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const { telegram, themePreference, languagePreference } = req.body;
  const user = req.user!;
  const db = getDb();
  const dbUser = db.users.find(u => u.id === user.id);

  if (!dbUser) return res.status(404).json({ error: 'User not found' });

  if (telegram) {
    let cleanTelegram = telegram.trim();
    if (!cleanTelegram.startsWith('@')) cleanTelegram = `@${cleanTelegram}`;
    if (!/^@[a-zA-Z0-9_]{3,32}$/.test(cleanTelegram)) {
      return res.status(400).json({ error: 'Некоректний формат Telegram' });
    }
    dbUser.telegram = cleanTelegram;
  }

  if (themePreference && ['light', 'navy'].includes(themePreference)) {
    dbUser.themePreference = themePreference;
  }

  if (languagePreference && ['uk', 'ru', 'en'].includes(languagePreference)) {
    dbUser.languagePreference = languagePreference;
  }

  dbUser.updatedAt = new Date().toISOString();
  saveDatabase(db);

  return res.json({
    success: true,
    user: {
      id: dbUser.id,
      nickname: dbUser.nickname,
      telegram: dbUser.telegram,
      role: dbUser.role,
      status: dbUser.status,
      themePreference: dbUser.themePreference,
      languagePreference: dbUser.languagePreference,
      createdAt: dbUser.createdAt,
    },
  });
});

// -----------------------------------------------------------------------------
// RECALCULATE USER BANK STATS HELPER
// -----------------------------------------------------------------------------
function syncUserBankStats(userId: string) {
  const db = getDb();
  const userTrades = db.trades.filter(t => t.userId === userId);
  const userBanks = db.userBanks.filter(b => b.userId === userId);

  userBanks.forEach(bank => {
    let buyTurnover = 0;
    let sellTurnover = 0;
    let netProfit = 0;
    let count = 0;

    userTrades.forEach(trade => {
      let involved = false;
      if (trade.buyBankId === bank.id) {
        buyTurnover += trade.buyAmountUah;
        involved = true;
      }
      if (trade.sellBankId === bank.id) {
        sellTurnover += trade.sellAmountUah;
        involved = true;
      }
      if (involved) {
        count += 1;
        // Attribute profit to the selling bank or split if different
        if (trade.sellBankId === bank.id && trade.buyBankId === bank.id) {
          netProfit += trade.netProfitUah;
        } else if (trade.sellBankId === bank.id) {
          netProfit += trade.netProfitUah;
        }
      }
    });

    bank.buyTurnoverUah = Math.round((buyTurnover + Number.EPSILON) * 100) / 100;
    bank.sellTurnoverUah = Math.round((sellTurnover + Number.EPSILON) * 100) / 100;
    bank.netProfitUah = Math.round((netProfit + Number.EPSILON) * 100) / 100;
    bank.tradesCount = count;
    bank.updatedAt = new Date().toISOString();
  });

  saveDatabase(db);
}

// -----------------------------------------------------------------------------
// TRADES ROUTES
// -----------------------------------------------------------------------------

router.get('/trades', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();

  // If admin passes targetUserId query param, let admin inspect that student's trades
  let targetUserId = user.id;
  if (user.role === 'admin' && req.query.targetUserId) {
    targetUserId = String(req.query.targetUserId);
  }

  let trades = db.trades.filter(t => t.userId === targetUserId);

  // Filters
  const { dateRange, bankId, exchange, search, sort } = req.query;

  if (dateRange) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 7 * 86400000;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    if (dateRange === 'today') {
      trades = trades.filter(t => new Date(t.createdAt).getTime() >= todayStart);
    } else if (dateRange === 'yesterday') {
      trades = trades.filter(t => {
        const time = new Date(t.createdAt).getTime();
        return time >= yesterdayStart && time < todayStart;
      });
    } else if (dateRange === 'week') {
      trades = trades.filter(t => new Date(t.createdAt).getTime() >= weekStart);
    } else if (dateRange === 'month') {
      trades = trades.filter(t => new Date(t.createdAt).getTime() >= monthStart);
    }
  }

  if (bankId && bankId !== 'all') {
    trades = trades.filter(t => t.buyBankId === bankId || t.sellBankId === bankId);
  }

  if (exchange && exchange !== 'all') {
    trades = trades.filter(t => t.buyExchange === exchange || t.sellExchange === exchange);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    trades = trades.filter(t =>
      (t.notes && t.notes.toLowerCase().includes(q)) ||
      t.buyBankName.toLowerCase().includes(q) ||
      t.sellBankName.toLowerCase().includes(q) ||
      t.buyExchange.toLowerCase().includes(q) ||
      t.sellExchange.toLowerCase().includes(q)
    );
  }

  // Sorting
  if (sort === 'profit_desc') {
    trades.sort((a, b) => b.netProfitUah - a.netProfitUah);
  } else if (sort === 'profit_asc') {
    trades.sort((a, b) => a.netProfitUah - b.netProfitUah);
  } else if (sort === 'spread_desc') {
    trades.sort((a, b) => b.spreadPercent - a.spreadPercent);
  } else {
    // Default newest first
    trades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return res.json({ trades });
});

router.post('/trades', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const {
    buyExchange,
    buyBankId,
    buyRate,
    buyAmountUah,
    buyUsdtAmount,
    buyCommission,
    buyCommissionType,
    sellExchange,
    sellBankId,
    sellRate,
    sellUsdtAmount,
    sellAmountUah,
    sellCommission,
    sellCommissionType,
    extraExpensesUah,
    notes,
    createdAt: customDate,
  } = req.body;

  if (!buyExchange || !buyBankId || !buyRate) {
    return res.status(400).json({ error: 'Вкажіть біржу покупки, банк та курс покупки' });
  }

  if (!sellExchange || !sellBankId || !sellRate) {
    return res.status(400).json({ error: 'Вкажіть біржу продажу, банк та курс продажу' });
  }

  const buyBank = db.userBanks.find(b => b.id === buyBankId && b.userId === user.id);
  const sellBank = db.userBanks.find(b => b.id === sellBankId && b.userId === user.id);

  if (!buyBank || !sellBank) {
    return res.status(400).json({ error: 'Один із обраних банків не знайдено у вашому списку' });
  }

  const calc = calculateTrade({
    buyRate: Number(buyRate),
    buyAmountUah: Number(buyAmountUah) || undefined,
    buyUsdtAmount: Number(buyUsdtAmount) || undefined,
    buyCommission: Number(buyCommission) || 0,
    buyCommissionType: buyCommissionType || 'percent',
    sellRate: Number(sellRate),
    sellUsdtAmount: Number(sellUsdtAmount) || undefined,
    sellAmountUah: Number(sellAmountUah) || undefined,
    sellCommission: Number(sellCommission) || 0,
    sellCommissionType: sellCommissionType || 'percent',
    extraExpensesUah: Number(extraExpensesUah) || 0,
  });

  const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = customDate ? new Date(customDate).toISOString() : new Date().toISOString();

  const newTrade: Trade = {
    id: tradeId,
    userId: user.id,
    createdAt: now,
    buyExchange: String(buyExchange),
    buyBankId: buyBank.id,
    buyBankName: buyBank.name,
    buyRate: calc.buyRate,
    buyAmountUah: calc.buyAmountUah,
    buyCommission: Number(buyCommission) || 0,
    buyCommissionType: buyCommissionType || 'percent',
    buyUsdtAmount: calc.buyUsdtAmount,
    sellExchange: String(sellExchange),
    sellBankId: sellBank.id,
    sellBankName: sellBank.name,
    sellRate: calc.sellRate,
    sellUsdtAmount: calc.sellUsdtAmount,
    sellAmountUah: calc.sellAmountUah,
    sellCommission: Number(sellCommission) || 0,
    sellCommissionType: sellCommissionType || 'percent',
    extraExpensesUah: calc.extraExpensesUah,
    totalCostUah: calc.totalCostUah,
    grossRevenueUah: calc.grossRevenueUah,
    totalCommissionsUah: calc.totalCommissionsUah,
    grossProfitUah: calc.grossProfitUah,
    netProfitUah: calc.netProfitUah,
    roiPercent: calc.roiPercent,
    spreadPerUnit: calc.spreadPerUnit,
    spreadPercent: calc.spreadPercent,
    notes: notes ? String(notes).trim() : undefined,
  };

  db.trades.push(newTrade);
  saveDatabase(db);

  // Sync bank turnover and profit
  syncUserBankStats(user.id);

  return res.json({ success: true, trade: newTrade });
});

router.put('/trades/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const tradeIndex = db.trades.findIndex(t => t.id === req.params.id && (t.userId === user.id || user.role === 'admin'));

  if (tradeIndex === -1) {
    return res.status(404).json({ error: 'Сделка не знайдена' });
  }

  const existingTrade = db.trades[tradeIndex];
  const {
    buyExchange,
    buyBankId,
    buyRate,
    buyAmountUah,
    buyUsdtAmount,
    buyCommission,
    buyCommissionType,
    sellExchange,
    sellBankId,
    sellRate,
    sellUsdtAmount,
    sellAmountUah,
    sellCommission,
    sellCommissionType,
    extraExpensesUah,
    notes,
  } = req.body;

  const buyBank = db.userBanks.find(b => b.id === buyBankId && b.userId === existingTrade.userId);
  const sellBank = db.userBanks.find(b => b.id === sellBankId && b.userId === existingTrade.userId);

  if (!buyBank || !sellBank) {
    return res.status(400).json({ error: 'Банк не знайдено' });
  }

  const calc = calculateTrade({
    buyRate: Number(buyRate),
    buyAmountUah: Number(buyAmountUah) || undefined,
    buyUsdtAmount: Number(buyUsdtAmount) || undefined,
    buyCommission: Number(buyCommission) || 0,
    buyCommissionType: buyCommissionType || 'percent',
    sellRate: Number(sellRate),
    sellUsdtAmount: Number(sellUsdtAmount) || undefined,
    sellAmountUah: Number(sellAmountUah) || undefined,
    sellCommission: Number(sellCommission) || 0,
    sellCommissionType: sellCommissionType || 'percent',
    extraExpensesUah: Number(extraExpensesUah) || 0,
  });

  const updatedTrade: Trade = {
    ...existingTrade,
    updatedAt: new Date().toISOString(),
    buyExchange: String(buyExchange),
    buyBankId: buyBank.id,
    buyBankName: buyBank.name,
    buyRate: calc.buyRate,
    buyAmountUah: calc.buyAmountUah,
    buyCommission: Number(buyCommission) || 0,
    buyCommissionType: buyCommissionType || 'percent',
    buyUsdtAmount: calc.buyUsdtAmount,
    sellExchange: String(sellExchange),
    sellBankId: sellBank.id,
    sellBankName: sellBank.name,
    sellRate: calc.sellRate,
    sellUsdtAmount: calc.sellUsdtAmount,
    sellAmountUah: calc.sellAmountUah,
    sellCommission: Number(sellCommission) || 0,
    sellCommissionType: sellCommissionType || 'percent',
    extraExpensesUah: calc.extraExpensesUah,
    totalCostUah: calc.totalCostUah,
    grossRevenueUah: calc.grossRevenueUah,
    totalCommissionsUah: calc.totalCommissionsUah,
    grossProfitUah: calc.grossProfitUah,
    netProfitUah: calc.netProfitUah,
    roiPercent: calc.roiPercent,
    spreadPerUnit: calc.spreadPerUnit,
    spreadPercent: calc.spreadPercent,
    notes: notes ? String(notes).trim() : undefined,
  };

  db.trades[tradeIndex] = updatedTrade;
  saveDatabase(db);

  syncUserBankStats(existingTrade.userId);

  return res.json({ success: true, trade: updatedTrade });
});

router.delete('/trades/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const tradeIndex = db.trades.findIndex(t => t.id === req.params.id && (t.userId === user.id || user.role === 'admin'));

  if (tradeIndex === -1) {
    return res.status(404).json({ error: 'Сделку не знайдено' });
  }

  const tradeUserId = db.trades[tradeIndex].userId;
  db.trades.splice(tradeIndex, 1);
  saveDatabase(db);

  syncUserBankStats(tradeUserId);

  return res.json({ success: true, message: 'Сделка видалена' });
});

// CSV Export
router.get('/trades/export-csv', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const trades = db.trades.filter(t => t.userId === user.id);

  trades.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const headers = [
    'ID',
    'Дата і час',
    'Біржа покупки',
    'Банк покупки',
    'Курс покупки (UAH/USDT)',
    'Сума покупки (UAH)',
    'Куплено USDT',
    'Біржа продажу',
    'Банк продажу',
    'Курс продажу (UAH/USDT)',
    'Сума продажу (UAH)',
    'Продано USDT',
    'Комісії (UAH)',
    'Чистий прибуток (UAH)',
    'Рентабельність ROI (%)',
    'Спред (%)',
    'Коментар',
  ];

  const rows = trades.map(t => [
    t.id,
    new Date(t.createdAt).toLocaleString('uk-UA'),
    t.buyExchange,
    t.buyBankName,
    t.buyRate.toFixed(2),
    t.buyAmountUah.toFixed(2),
    t.buyUsdtAmount.toFixed(4),
    t.sellExchange,
    t.sellBankName,
    t.sellRate.toFixed(2),
    t.sellAmountUah.toFixed(2),
    t.sellUsdtAmount.toFixed(4),
    t.totalCommissionsUah.toFixed(2),
    t.netProfitUah.toFixed(2),
    t.roiPercent.toFixed(2) + '%',
    t.spreadPercent.toFixed(2) + '%',
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);

  // Include UTF-8 BOM so Excel opens Cyrillic without garbled text
  const bom = '\uFEFF';
  const csvContent = bom + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="p2p_trades_${user.nickname}_${Date.now()}.csv"`);
  return res.send(csvContent);
});

// -----------------------------------------------------------------------------
// BANKS ROUTES
// -----------------------------------------------------------------------------

router.get('/banks', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  let targetUserId = user.id;
  if (user.role === 'admin' && req.query.targetUserId) {
    targetUserId = String(req.query.targetUserId);
  }

  const banks = db.userBanks.filter(b => b.userId === targetUserId && !b.isArchived);
  const globalBanks = db.globalBanks.filter(b => b.isActive);

  return res.json({ banks, globalBanks });
});

router.post('/banks', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const { name, turnoverLimitUah, initialTurnoverUah, globalBankId, color, notes } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Вкажіть назву банку' });
  }

  const limit = Math.max(1000, Number(turnoverLimitUah) || 100000);
  const initial = Math.max(0, Number(initialTurnoverUah) || 0);

  const matchedGlobal = globalBankId ? db.globalBanks.find(g => g.id === globalBankId) : null;
  const now = new Date().toISOString();

  const newBank: UserBank = {
    id: `ub_${user.id}_${Date.now().toString(36)}`,
    userId: user.id,
    globalBankId: matchedGlobal?.id,
    name: name.trim(),
    turnoverLimitUah: limit,
    initialTurnoverUah: initial,
    buyTurnoverUah: 0,
    sellTurnoverUah: 0,
    netProfitUah: 0,
    tradesCount: 0,
    notes: notes ? String(notes).trim() : undefined,
    color: color || matchedGlobal?.color || '#3B82F6',
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };

  db.userBanks.push(newBank);
  saveDatabase(db);

  return res.json({ success: true, bank: newBank });
});

router.put('/banks/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const bank = db.userBanks.find(b => b.id === req.params.id && (b.userId === user.id || user.role === 'admin'));

  if (!bank) {
    return res.status(404).json({ error: 'Банк не знайдено' });
  }

  const { name, turnoverLimitUah, initialTurnoverUah, notes, color } = req.body;
  if (name && typeof name === 'string' && name.trim()) {
    bank.name = name.trim();
  }
  if (turnoverLimitUah !== undefined) {
    bank.turnoverLimitUah = Math.max(1000, Number(turnoverLimitUah) || 0);
  }
  if (initialTurnoverUah !== undefined) {
    bank.initialTurnoverUah = Math.max(0, Number(initialTurnoverUah) || 0);
  }
  if (notes !== undefined) {
    bank.notes = String(notes).trim();
  }
  if (color) {
    bank.color = color;
  }
  bank.updatedAt = new Date().toISOString();

  saveDatabase(db);
  return res.json({ success: true, bank });
});

router.delete('/banks/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();
  const bank = db.userBanks.find(b => b.id === req.params.id && (b.userId === user.id || user.role === 'admin'));

  if (!bank) {
    return res.status(404).json({ error: 'Банк не знайдено' });
  }

  // Safe soft archive so historical trades preserve data integrity!
  bank.isArchived = true;
  bank.updatedAt = new Date().toISOString();
  saveDatabase(db);

  return res.json({ success: true, message: 'Банк архівовано' });
});

// -----------------------------------------------------------------------------
// DASHBOARD STATS
// -----------------------------------------------------------------------------

router.get('/dashboard/stats', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const db = getDb();

  let targetUserId = user.id;
  if (user.role === 'admin' && req.query.targetUserId) {
    targetUserId = String(req.query.targetUserId);
  }

  const userTrades = db.trades.filter(t => t.userId === targetUserId);
  const userBanks = db.userBanks.filter(b => b.userId === targetUserId && !b.isArchived);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let profitToday = 0;
  let profitYesterday = 0;
  let profitMonth = 0;
  let profitAllTime = 0;

  let buyTurnover = 0;
  let sellTurnover = 0;

  userTrades.forEach(t => {
    const time = new Date(t.createdAt).getTime();
    profitAllTime += t.netProfitUah;
    buyTurnover += t.buyAmountUah;
    sellTurnover += t.sellAmountUah;

    if (time >= todayStart) {
      profitToday += t.netProfitUah;
    }
    if (time >= yesterdayStart && time < todayStart) {
      profitYesterday += t.netProfitUah;
    }
    if (time >= monthStart) {
      profitMonth += t.netProfitUah;
    }
  });

  const recentTrades = [...userTrades]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return res.json({
    profitToday: Math.round((profitToday + Number.EPSILON) * 100) / 100,
    profitYesterday: Math.round((profitYesterday + Number.EPSILON) * 100) / 100,
    profitMonth: Math.round((profitMonth + Number.EPSILON) * 100) / 100,
    profitAllTime: Math.round((profitAllTime + Number.EPSILON) * 100) / 100,
    buyTurnover: Math.round((buyTurnover + Number.EPSILON) * 100) / 100,
    sellTurnover: Math.round((sellTurnover + Number.EPSILON) * 100) / 100,
    totalTurnover: Math.round(((buyTurnover + sellTurnover) + Number.EPSILON) * 100) / 100,
    tradesCount: userTrades.length,
    banksCount: userBanks.length,
    recentTrades,
  });
});

// Exchanges public catalog
router.get('/exchanges', (req: Request, res: Response) => {
  const db = getDb();
  return res.json({ exchanges: db.exchanges.filter(e => e.isActive) });
});

// Public / client settings
router.get('/settings/public', (req: Request, res: Response) => {
  const db = getDb();
  return res.json({
    siteName: db.siteSettings.siteName,
    curatorTelegram: db.siteSettings.curatorTelegram,
    defaultLanguage: db.siteSettings.defaultLanguage,
    defaultTheme: db.siteSettings.defaultTheme,
    announcement: db.siteSettings.announcement,
    allowRegistration: db.siteSettings.allowRegistration,
  });
});

// -----------------------------------------------------------------------------
// ADMIN ROUTES (Protected by requireAdmin)
// -----------------------------------------------------------------------------

router.get('/admin/overview', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const students = db.users.filter(u => u.role === 'student');
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const tradesToday = db.trades.filter(t => new Date(t.createdAt).getTime() >= todayStart);

  let totalPlatformTurnover = 0;
  let totalStudentProfit = 0;

  db.trades.forEach(t => {
    totalPlatformTurnover += (t.buyAmountUah + t.sellAmountUah);
    totalStudentProfit += t.netProfitUah;
  });

  const activeStudents = students.filter(s => {
    if (!s.lastLoginAt) return false;
    return (Date.now() - new Date(s.lastLoginAt).getTime()) < 7 * 86400000;
  });

  return res.json({
    totalStudents: students.length,
    activeStudents: activeStudents.length,
    tradesToday: tradesToday.length,
    totalPlatformTurnover: Math.round((totalPlatformTurnover + Number.EPSILON) * 100) / 100,
    totalStudentProfit: Math.round((totalStudentProfit + Number.EPSILON) * 100) / 100,
    totalTradesCount: db.trades.length,
  });
});

router.get('/admin/users', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const { search, status } = req.query;

  let users = db.users.map(u => {
    const userTrades = db.trades.filter(t => t.userId === u.id);
    let allTimeProfit = 0;
    let buyTurnover = 0;
    let sellTurnover = 0;

    userTrades.forEach(t => {
      allTimeProfit += t.netProfitUah;
      buyTurnover += t.buyAmountUah;
      sellTurnover += t.sellAmountUah;
    });

    return {
      id: u.id,
      nickname: u.nickname,
      telegram: u.telegram,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      tradesCount: userTrades.length,
      allTimeProfit: Math.round((allTimeProfit + Number.EPSILON) * 100) / 100,
      buyTurnover: Math.round((buyTurnover + Number.EPSILON) * 100) / 100,
      sellTurnover: Math.round((sellTurnover + Number.EPSILON) * 100) / 100,
    };
  });

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    users = users.filter(u => u.nickname.toLowerCase().includes(q) || u.telegram.toLowerCase().includes(q));
  }

  if (status && status !== 'all') {
    users = users.filter(u => u.status === status);
  }

  return res.json({ users });
});

router.put('/admin/users/:id/status', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const db = getDb();
  const targetUser = db.users.find(u => u.id === req.params.id);

  if (!targetUser) {
    return res.status(404).json({ error: 'Користувача не знайдено' });
  }

  if (targetUser.id === admin.id) {
    return res.status(400).json({ error: 'Неможливо змінити власний статус' });
  }

  const { status } = req.body;
  if (!['active', 'blocked'].includes(status)) {
    return res.status(400).json({ error: 'Недійсний статус' });
  }

  targetUser.status = status;
  targetUser.updatedAt = new Date().toISOString();

  // If blocked, drop active sessions
  if (status === 'blocked') {
    db.sessions = db.sessions.filter(s => s.userId !== targetUser.id);
  }

  saveDatabase(db);
  logAdminAction(admin, 'USER_STATUS_CHANGE', `User ${targetUser.nickname} status changed to ${status}`, targetUser.id);

  return res.json({ success: true, user: targetUser });
});

router.put('/admin/users/:id/profile', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const db = getDb();
  const targetUser = db.users.find(u => u.id === req.params.id);

  if (!targetUser) {
    return res.status(404).json({ error: 'Користувача не знайдено' });
  }

  const { nickname, telegram, role } = req.body;

  if (nickname && nickname.trim()) {
    const cleanNick = nickname.trim().toLowerCase();
    const existing = db.users.find(u => u.nickname.toLowerCase() === cleanNick && u.id !== targetUser.id);
    if (existing) {
      return res.status(400).json({ error: 'Цей нікнейм уже зайнятий' });
    }
    targetUser.nickname = cleanNick;
  }

  if (telegram && telegram.trim()) {
    let cleanTg = telegram.trim();
    if (!cleanTg.startsWith('@')) cleanTg = `@${cleanTg}`;
    targetUser.telegram = cleanTg;
  }

  if (role && ['student', 'admin'].includes(role)) {
    targetUser.role = role;
  }

  targetUser.updatedAt = new Date().toISOString();
  saveDatabase(db);

  logAdminAction(admin, 'USER_PROFILE_UPDATE', `Updated profile of ${targetUser.nickname}`, targetUser.id);

  return res.json({ success: true, user: targetUser });
});

// Admin safe password reset - generates temporary random password, never reveals old password
router.post('/admin/users/:id/reset-password', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const db = getDb();
  const targetUser = db.users.find(u => u.id === req.params.id);

  if (!targetUser) {
    return res.status(404).json({ error: 'Користувача не знайдено' });
  }

  const tempPassword = generateTemporaryPassword();
  targetUser.passwordHash = hashPassword(tempPassword);
  targetUser.updatedAt = new Date().toISOString();

  // Invalidate old sessions
  db.sessions = db.sessions.filter(s => s.userId !== targetUser.id);
  saveDatabase(db);

  logAdminAction(admin, 'PASSWORD_RESET', `Admin generated temporary password for ${targetUser.nickname}`, targetUser.id);

  return res.json({
    success: true,
    temporaryPassword: tempPassword,
    message: `Тимчасовий пароль згенеровано. Передайте його учневі особисто в Telegram ${targetUser.telegram}.`,
  });
});

router.delete('/admin/users/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const db = getDb();
  const targetIndex = db.users.findIndex(u => u.id === req.params.id);

  if (targetIndex === -1) {
    return res.status(404).json({ error: 'Користувача не знайдено' });
  }

  if (db.users[targetIndex].id === admin.id) {
    return res.status(400).json({ error: 'Неможливо видалити власний адміністраторський акаунт' });
  }

  const deletedNick = db.users[targetIndex].nickname;
  const deletedId = db.users[targetIndex].id;

  db.users.splice(targetIndex, 1);
  db.sessions = db.sessions.filter(s => s.userId !== deletedId);
  db.trades = db.trades.filter(t => t.userId !== deletedId);
  db.userBanks = db.userBanks.filter(b => b.userId !== deletedId);

  saveDatabase(db);
  logAdminAction(admin, 'USER_DELETE', `Deleted user ${deletedNick} and associated data`, deletedId);

  return res.json({ success: true, message: 'Користувача видалено' });
});

router.get('/admin/students-stats', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  const students = db.users.filter(u => u.role === 'student');

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const results = students.map(student => {
    const trades = db.trades.filter(t => t.userId === student.id);
    let profitToday = 0;
    let profitYesterday = 0;
    let profitMonth = 0;
    let profitAllTime = 0;
    let buyTurnover = 0;
    let sellTurnover = 0;

    trades.forEach(t => {
      const time = new Date(t.createdAt).getTime();
      profitAllTime += t.netProfitUah;
      buyTurnover += t.buyAmountUah;
      sellTurnover += t.sellAmountUah;

      if (time >= todayStart) profitToday += t.netProfitUah;
      if (time >= yesterdayStart && time < todayStart) profitYesterday += t.netProfitUah;
      if (time >= monthStart) profitMonth += t.netProfitUah;
    });

    return {
      userId: student.id,
      nickname: student.nickname,
      telegram: student.telegram,
      status: student.status,
      profitToday: Math.round((profitToday + Number.EPSILON) * 100) / 100,
      profitYesterday: Math.round((profitYesterday + Number.EPSILON) * 100) / 100,
      profitMonth: Math.round((profitMonth + Number.EPSILON) * 100) / 100,
      profitAllTime: Math.round((profitAllTime + Number.EPSILON) * 100) / 100,
      buyTurnover: Math.round((buyTurnover + Number.EPSILON) * 100) / 100,
      sellTurnover: Math.round((sellTurnover + Number.EPSILON) * 100) / 100,
      tradesCount: trades.length,
      lastLoginAt: student.lastLoginAt,
    };
  });

  return res.json({ results });
});

// Global Banks Directory Management
router.get('/admin/global-banks', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  return res.json({ banks: db.globalBanks });
});

router.post('/admin/global-banks', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const db = getDb();
  const { name, code, defaultLimitUah, color, logoSvg } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: 'Вкажіть назву та код банку' });
  }

  const newBank: GlobalBank = {
    id: `gb_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`,
    name: name.trim(),
    code: code.trim().toLowerCase(),
    defaultLimitUah: Number(defaultLimitUah) || 100000,
    color: color || '#2563EB',
    logoSvg: logoSvg || undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  db.globalBanks.push(newBank);
  saveDatabase(db);
  logAdminAction(admin, 'BANK_CREATE', `Created global bank ${newBank.name}`);

  return res.json({ success: true, bank: newBank });
});

router.put('/admin/global-banks/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const db = getDb();
  const bank = db.globalBanks.find(b => b.id === req.params.id);

  if (!bank) return res.status(404).json({ error: 'Банк не знайдено' });

  const { name, defaultLimitUah, color, logoSvg, isActive } = req.body;
  if (name) bank.name = name.trim();
  if (defaultLimitUah !== undefined) bank.defaultLimitUah = Number(defaultLimitUah);
  if (color) bank.color = color;
  if (logoSvg !== undefined) bank.logoSvg = logoSvg;
  if (isActive !== undefined) bank.isActive = Boolean(isActive);

  saveDatabase(db);
  logAdminAction(admin, 'BANK_UPDATE', `Updated global bank ${bank.name}`);

  return res.json({ success: true, bank });
});

router.delete('/admin/global-banks/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const db = getDb();
  const bank = db.globalBanks.find(b => b.id === req.params.id);
  if (!bank) return res.status(404).json({ error: 'Банк не знайдено' });

  bank.isActive = false;
  saveDatabase(db);
  logAdminAction(admin, 'BANK_ARCHIVE', `Archived global bank ${bank.name}`);

  return res.json({ success: true, message: 'Банк деактивовано' });
});

// Exchanges Directory Management
router.get('/admin/exchanges', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  return res.json({ exchanges: db.exchanges });
});

router.post('/admin/exchanges', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const db = getDb();
  const { name, code } = req.body;

  if (!name || !code) return res.status(400).json({ error: 'Вкажіть назву та код біржі' });

  const newExchange: Exchange = {
    id: `ex_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`,
    name: name.trim(),
    code: code.trim().toLowerCase(),
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  db.exchanges.push(newExchange);
  saveDatabase(db);
  logAdminAction(admin, 'EXCHANGE_CREATE', `Created exchange ${newExchange.name}`);

  return res.json({ success: true, exchange: newExchange });
});

router.put('/admin/exchanges/:id', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const db = getDb();
  const ex = db.exchanges.find(e => e.id === req.params.id);
  if (!ex) return res.status(404).json({ error: 'Біржу не знайдено' });

  const { name, isActive } = req.body;
  if (name) ex.name = name.trim();
  if (isActive !== undefined) ex.isActive = Boolean(isActive);

  saveDatabase(db);
  logAdminAction(admin, 'EXCHANGE_UPDATE', `Updated exchange ${ex.name}`);

  return res.json({ success: true, exchange: ex });
});

// Site Settings
router.get('/admin/settings', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  return res.json({ settings: db.siteSettings });
});

router.put('/admin/settings', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const db = getDb();
  const { siteName, curatorTelegram, defaultLanguage, defaultTheme, bankLimitMode, announcement, allowRegistration } = req.body;

  if (siteName) db.siteSettings.siteName = siteName.trim();
  if (curatorTelegram) {
    let clean = curatorTelegram.trim();
    if (!clean.startsWith('@')) clean = `@${clean}`;
    db.siteSettings.curatorTelegram = clean;
  }
  if (defaultLanguage && ['uk', 'ru', 'en'].includes(defaultLanguage)) {
    db.siteSettings.defaultLanguage = defaultLanguage;
  }
  if (defaultTheme && ['light', 'navy'].includes(defaultTheme)) {
    db.siteSettings.defaultTheme = defaultTheme;
  }
  if (bankLimitMode && ['separate', 'total', 'buy_only'].includes(bankLimitMode)) {
    db.siteSettings.bankLimitMode = bankLimitMode;
  }
  if (announcement !== undefined) {
    db.siteSettings.announcement = String(announcement).trim();
  }
  if (allowRegistration !== undefined) {
    db.siteSettings.allowRegistration = Boolean(allowRegistration);
  }

  saveDatabase(db);
  logAdminAction(admin, 'SETTINGS_UPDATE', 'Updated site configuration');

  return res.json({ success: true, settings: db.siteSettings });
});

// Audit Logs
router.get('/admin/audit-logs', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const db = getDb();
  return res.json({ logs: db.auditLogs.slice(0, 100) });
});

// Backups
router.post('/admin/backup', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const admin = req.user!;
  const filename = createBackup();
  logAdminAction(admin, 'SYSTEM_BACKUP', `Created system snapshot ${filename}`);
  return res.json({ success: true, filename, backups: listBackups() });
});

router.get('/admin/backups', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ backups: listBackups() });
});
