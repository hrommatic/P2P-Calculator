import type { VercelRequest, VercelResponse } from '@vercel/node';
import { registerHandler, loginHandler, logoutHandler, meHandler, changePasswordHandler, updateProfileHandler, exchangesHandler, settingsPublicHandler } from '../server/routes/auth.routes.js';
import { tradesIndexHandler, tradesCreateHandler, tradesExportCsvHandler, tradeUpdateHandler, tradeDeleteHandler } from '../server/routes/trades.routes.js';
import { banksIndexGetHandler, banksIndexPostHandler, bankUpdateHandler, bankDeleteHandler } from '../server/routes/banks.routes.js';
import { dashboardStatsHandler } from '../server/routes/dashboard.routes.js';
import { adminOverviewHandler, adminUsersHandler, adminUserStatusHandler, adminUserProfileHandler, adminUserResetPasswordHandler, adminUserDeleteHandler, adminStudentsStatsHandler, adminGlobalBanksGetHandler, adminGlobalBanksPostHandler, adminGlobalBankUpdateHandler, adminGlobalBankDeleteHandler, adminExchangesGetHandler, adminExchangesPostHandler, adminExchangeUpdateHandler, adminSettingsGetHandler, adminSettingsPutHandler, adminAuditLogsHandler, adminBackupHandler, adminBackupsHandler } from '../server/routes/admin.routes.js';
import { loadDatabase } from '../server/utils/db/index.js';

type RouteEntry = {
  segments: string[];
  method: string;
  handler: (req: VercelRequest, res: VercelResponse) => unknown;
};

const routes: RouteEntry[] = [
  { segments: ["auth","register"], method: 'POST', handler: registerHandler },
  { segments: ["auth","login"], method: 'POST', handler: loginHandler },
  { segments: ["auth","logout"], method: 'POST', handler: logoutHandler },
  { segments: ["auth","me"], method: 'GET', handler: meHandler },
  { segments: ["auth","change-password"], method: 'POST', handler: changePasswordHandler },
  { segments: ["auth","update-profile"], method: 'POST', handler: updateProfileHandler },
  { segments: ["exchanges"], method: 'GET', handler: exchangesHandler },
  { segments: ["settings","public"], method: 'GET', handler: settingsPublicHandler },
  { segments: ["trades"], method: 'GET', handler: tradesIndexHandler },
  { segments: ["trades"], method: 'POST', handler: tradesCreateHandler },
  { segments: ["trades","export-csv"], method: 'GET', handler: tradesExportCsvHandler },
  { segments: ["trades",":id"], method: 'PUT', handler: tradeUpdateHandler },
  { segments: ["trades",":id"], method: 'DELETE', handler: tradeDeleteHandler },
  { segments: ["banks"], method: 'GET', handler: banksIndexGetHandler },
  { segments: ["banks"], method: 'POST', handler: banksIndexPostHandler },
  { segments: ["banks",":id"], method: 'PUT', handler: bankUpdateHandler },
  { segments: ["banks",":id"], method: 'DELETE', handler: bankDeleteHandler },
  { segments: ["dashboard","stats"], method: 'GET', handler: dashboardStatsHandler },
  { segments: ["admin","overview"], method: 'GET', handler: adminOverviewHandler },
  { segments: ["admin","users"], method: 'GET', handler: adminUsersHandler },
  { segments: ["admin","users",":id","status"], method: 'PUT', handler: adminUserStatusHandler },
  { segments: ["admin","users",":id","profile"], method: 'PUT', handler: adminUserProfileHandler },
  { segments: ["admin","users",":id","reset-password"], method: 'POST', handler: adminUserResetPasswordHandler },
  { segments: ["admin","users",":id"], method: 'DELETE', handler: adminUserDeleteHandler },
  { segments: ["admin","students-stats"], method: 'GET', handler: adminStudentsStatsHandler },
  { segments: ["admin","global-banks"], method: 'GET', handler: adminGlobalBanksGetHandler },
  { segments: ["admin","global-banks"], method: 'POST', handler: adminGlobalBanksPostHandler },
  { segments: ["admin","global-banks",":id"], method: 'PUT', handler: adminGlobalBankUpdateHandler },
  { segments: ["admin","global-banks",":id"], method: 'DELETE', handler: adminGlobalBankDeleteHandler },
  { segments: ["admin","exchanges"], method: 'GET', handler: adminExchangesGetHandler },
  { segments: ["admin","exchanges"], method: 'POST', handler: adminExchangesPostHandler },
  { segments: ["admin","exchanges",":id"], method: 'PUT', handler: adminExchangeUpdateHandler },
  { segments: ["admin","settings"], method: 'GET', handler: adminSettingsGetHandler },
  { segments: ["admin","settings"], method: 'PUT', handler: adminSettingsPutHandler },
  { segments: ["admin","audit-logs"], method: 'GET', handler: adminAuditLogsHandler },
  { segments: ["admin","backup"], method: 'POST', handler: adminBackupHandler },
  { segments: ["admin","backups"], method: 'GET', handler: adminBackupsHandler },
];

function getPathSegments(req: VercelRequest): string[] {
  const queryPath = req.query.path;
  if (queryPath) {
    return Array.isArray(queryPath) ? queryPath : [queryPath];
  }
  const pathname = (req.url ?? '').split('?')[0];
  if (pathname.startsWith('/api/')) {
    return pathname.slice('/api/'.length).split('/').filter(Boolean);
  }
  if (pathname === '/api') return [];
  return pathname.split('/').filter((segment) => segment && segment !== 'api');
}

function matchRoute(pathSegments: string[], route: RouteEntry): Record<string, string> | null {
  if (pathSegments.length !== route.segments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < route.segments.length; i++) {
    const expected = route.segments[i];
    const actual = pathSegments[i];
    if (expected.startsWith(':')) {
      params[expected.slice(1)] = actual;
    } else if (expected !== actual) {
      return null;
    }
  }
  return params;
}

async function healthHandler(_req: VercelRequest, res: VercelResponse) {
  try {
    await loadDatabase();
    return res.status(200).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database unavailable';
    return res.status(503).json({ ok: false, error: message });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathSegments = getPathSegments(req);

  if (pathSegments.length === 1 && pathSegments[0] === 'health' && req.method === 'GET') {
    return healthHandler(req, res);
  }

  for (const route of routes) {
    if (route.method !== req.method) continue;
    const params = matchRoute(pathSegments, route);
    if (params) {
      Object.assign(req.query, params);
      return route.handler(req, res);
    }
  }

  return res.status(404).json({ error: 'Not found' });
}
