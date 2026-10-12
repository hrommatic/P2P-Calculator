import {
  User,
  Trade,
  UserBank,
  GlobalBank,
  Exchange,
  DashboardStats,
  SiteSettings,
  AdminOverview,
  StudentStatsItem,
  AuditLog,
} from '../types';
const TOKEN_KEY = 'p2p_calc_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data: any = null;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const isHtml =
      typeof data === 'string' &&
      (data.trimStart().startsWith('<!') || contentType?.includes('text/html'));
    if (isHtml || (response.status === 404 && endpoint.startsWith('/auth'))) {
      throw new Error(
        'API недоступне локально. Запустіть npm run dev:full і відкрийте http://localhost:5173.',
      );
    }
    const errorMsg = data?.error || (typeof data === 'string' ? data : 'Сталася невідома помилка');
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {

  register: (body: { nickname: string; telegram: string; password: string; confirmPassword: string }) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { nickname: string; password: string }) =>
    request<{ token: string; user: User; siteSettings?: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    }),

  getMe: () =>
    request<{ user: User; siteSettings: SiteSettings }>('/auth/me'),

  changePassword: (body: { currentPassword: string; newPassword: string; confirmNewPassword: string }) =>
    request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateProfile: (body: { telegram?: string; themePreference?: string; languagePreference?: string }) =>
    request<{ success: boolean; user: User }>('/auth/update-profile', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getTrades: (params?: {
    dateRange?: string;
    dateFrom?: string;
    dateTo?: string;
    monthKey?: string;
    monthDayFrom?: string;
    monthDayTo?: string;
    bankId?: string;
    exchange?: string;
    search?: string;
    sort?: string;
    targetUserId?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.dateRange) q.set('dateRange', params.dateRange);
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    if (params?.monthKey) q.set('monthKey', params.monthKey);
    if (params?.monthDayFrom) q.set('monthDayFrom', params.monthDayFrom);
    if (params?.monthDayTo) q.set('monthDayTo', params.monthDayTo);
    if (params?.bankId) q.set('bankId', params.bankId);
    if (params?.exchange) q.set('exchange', params.exchange);
    if (params?.search) q.set('search', params.search);
    if (params?.sort) q.set('sort', params.sort);
    if (params?.targetUserId) q.set('targetUserId', params.targetUserId);
    const queryString = q.toString() ? `?${q.toString()}` : '';
    return request<{ trades: Trade[] }>(`/trades${queryString}`);
  },

  createTrade: (body: any) =>
    request<{ success: boolean; trade: Trade }>('/trades', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateTrade: (id: string, body: any) =>
    request<{ success: boolean; trade: Trade }>(`/trades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteTrade: (id: string) =>
    request<{ success: boolean; message: string }>(`/trades/${id}`, {
      method: 'DELETE',
    }),

  exportCsvUrl: () => '/api/trades/export-csv',

  /** Banks + exchanges in one request (fast read, no turnover recalc). */
  getCatalog: (sync?: boolean, signal?: AbortSignal) => {
    const path = `/catalog${sync ? '?sync=1' : ''}`;
    return request<{ banks: UserBank[]; globalBanks: GlobalBank[]; exchanges: Exchange[] }>(
      path,
      { signal },
    );
  },

  getBanks: (targetUserId?: string, sync?: boolean) => {
    const q = new URLSearchParams();
    if (targetUserId) q.set('targetUserId', targetUserId);
    if (sync) q.set('sync', '1');
    const queryString = q.toString() ? `?${q.toString()}` : '';
    return request<{ banks: UserBank[]; globalBanks: GlobalBank[] }>(`/banks${queryString}`);
  },

  createBank: (body: {
    name: string;
    turnoverLimitUah: number;
    initialTurnoverUah?: number;
    globalBankId?: string;
    color?: string;
    notes?: string;
  }) =>
    request<{ success: boolean; bank: UserBank }>('/banks', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateBank: (id: string, body: {
    name?: string;
    turnoverLimitUah?: number;
    initialTurnoverUah?: number;
    notes?: string;
    color?: string;
  }) =>
    request<{ success: boolean; bank: UserBank }>(`/banks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteBank: (id: string) =>
    request<{ success: boolean; message: string }>(`/banks/${id}`, {
      method: 'DELETE',
    }),

  getDashboardStats: (
    params?: Record<string, string | undefined>,
    signal?: AbortSignal,
  ) => {
    const q = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value) q.set(key, value);
      }
    }
    const queryString = q.toString() ? `?${q.toString()}` : '';
    return request<DashboardStats & { trades: Trade[] }>(`/dashboard/stats${queryString}`, {
      signal,
    });
  },

  getExchanges: () => request<{ exchanges: Exchange[] }>('/exchanges'),
  getPublicSettings: () => request<SiteSettings>('/settings/public'),

  getAdminOverview: () => request<AdminOverview>('/admin/overview'),
  getAdminUsers: (params?: { search?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    const queryString = q.toString() ? `?${q.toString()}` : '';
    return request<{ users: any[] }>(`/admin/users${queryString}`);
  },
  setUserStatus: (id: string, status: 'active' | 'blocked') =>
    request<{ success: boolean; user: any }>(`/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  updateUserProfile: (id: string, body: { nickname?: string; telegram?: string; role?: string }) =>
    request<{ success: boolean; user: any }>(`/admin/users/${id}/profile`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  resetUserPassword: (id: string) =>
    request<{ success: boolean; temporaryPassword: string; message: string }>(`/admin/users/${id}/reset-password`, {
      method: 'POST',
    }),
  deleteUser: (id: string) =>
    request<{ success: boolean; message: string }>(`/admin/users/${id}`, {
      method: 'DELETE',
    }),
  getStudentsStats: () => request<{ results: StudentStatsItem[] }>('/admin/students-stats'),
  getGlobalBanks: () => request<{ banks: GlobalBank[] }>('/admin/global-banks'),
  createGlobalBank: (body: any) =>
    request<{ success: boolean; bank: GlobalBank }>('/admin/global-banks', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateGlobalBank: (id: string, body: any) =>
    request<{ success: boolean; bank: GlobalBank }>(`/admin/global-banks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteGlobalBank: (id: string) =>
    request<{ success: boolean; message: string }>(`/admin/global-banks/${id}`, {
      method: 'DELETE',
    }),
  getAdminExchanges: () => request<{ exchanges: Exchange[] }>('/admin/exchanges'),
  createAdminExchange: (body: any) =>
    request<{ success: boolean; exchange: Exchange }>('/admin/exchanges', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateAdminExchange: (id: string, body: any) =>
    request<{ success: boolean; exchange: Exchange }>(`/admin/exchanges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  getAdminSettings: () => request<{ settings: SiteSettings }>('/admin/settings'),
  updateAdminSettings: (body: any) =>
    request<{ success: boolean; settings: SiteSettings }>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  getAuditLogs: () => request<{ logs: AuditLog[] }>('/admin/audit-logs'),
  createBackup: () => request<{ success: boolean; filename: string; backups: string[] }>('/admin/backup', { method: 'POST' }),
  getBackups: () => request<{ backups: string[] }>('/admin/backups'),
};
