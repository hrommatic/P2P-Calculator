import fs from 'fs';
import path from 'path';

/** @typedef {{ path: string, module: string, method: string, export: string }} RouteDef */

/** @type {RouteDef[]} */
const routes = [
  { path: 'auth/register', module: 'auth.routes', method: 'POST', export: 'registerHandler' },
  { path: 'auth/login', module: 'auth.routes', method: 'POST', export: 'loginHandler' },
  { path: 'auth/logout', module: 'auth.routes', method: 'POST', export: 'logoutHandler' },
  { path: 'auth/me', module: 'auth.routes', method: 'GET', export: 'meHandler' },
  { path: 'auth/change-password', module: 'auth.routes', method: 'POST', export: 'changePasswordHandler' },
  { path: 'auth/update-profile', module: 'auth.routes', method: 'POST', export: 'updateProfileHandler' },
  { path: 'exchanges', module: 'auth.routes', method: 'GET', export: 'exchangesHandler' },
  { path: 'settings/public', module: 'auth.routes', method: 'GET', export: 'settingsPublicHandler' },
  { path: 'trades', module: 'trades.routes', method: 'GET', export: 'tradesIndexHandler' },
  { path: 'trades', module: 'trades.routes', method: 'POST', export: 'tradesCreateHandler' },
  { path: 'trades/export-csv', module: 'trades.routes', method: 'GET', export: 'tradesExportCsvHandler' },
  { path: 'trades/:id', module: 'trades.routes', method: 'PUT', export: 'tradeUpdateHandler' },
  { path: 'trades/:id', module: 'trades.routes', method: 'DELETE', export: 'tradeDeleteHandler' },
  { path: 'banks', module: 'banks.routes', method: 'GET', export: 'banksIndexGetHandler' },
  { path: 'banks', module: 'banks.routes', method: 'POST', export: 'banksIndexPostHandler' },
  { path: 'banks/:id', module: 'banks.routes', method: 'PUT', export: 'bankUpdateHandler' },
  { path: 'banks/:id', module: 'banks.routes', method: 'DELETE', export: 'bankDeleteHandler' },
  { path: 'dashboard/stats', module: 'dashboard.routes', method: 'GET', export: 'dashboardStatsHandler' },
  { path: 'admin/overview', module: 'admin.routes', method: 'GET', export: 'adminOverviewHandler' },
  { path: 'admin/users', module: 'admin.routes', method: 'GET', export: 'adminUsersHandler' },
  { path: 'admin/users/:id/status', module: 'admin.routes', method: 'PUT', export: 'adminUserStatusHandler' },
  { path: 'admin/users/:id/profile', module: 'admin.routes', method: 'PUT', export: 'adminUserProfileHandler' },
  { path: 'admin/users/:id/reset-password', module: 'admin.routes', method: 'POST', export: 'adminUserResetPasswordHandler' },
  { path: 'admin/users/:id', module: 'admin.routes', method: 'DELETE', export: 'adminUserDeleteHandler' },
  { path: 'admin/students-stats', module: 'admin.routes', method: 'GET', export: 'adminStudentsStatsHandler' },
  { path: 'admin/global-banks', module: 'admin.routes', method: 'GET', export: 'adminGlobalBanksGetHandler' },
  { path: 'admin/global-banks', module: 'admin.routes', method: 'POST', export: 'adminGlobalBanksPostHandler' },
  { path: 'admin/global-banks/:id', module: 'admin.routes', method: 'PUT', export: 'adminGlobalBankUpdateHandler' },
  { path: 'admin/global-banks/:id', module: 'admin.routes', method: 'DELETE', export: 'adminGlobalBankDeleteHandler' },
  { path: 'admin/exchanges', module: 'admin.routes', method: 'GET', export: 'adminExchangesGetHandler' },
  { path: 'admin/exchanges', module: 'admin.routes', method: 'POST', export: 'adminExchangesPostHandler' },
  { path: 'admin/exchanges/:id', module: 'admin.routes', method: 'PUT', export: 'adminExchangeUpdateHandler' },
  { path: 'admin/settings', module: 'admin.routes', method: 'GET', export: 'adminSettingsGetHandler' },
  { path: 'admin/settings', module: 'admin.routes', method: 'PUT', export: 'adminSettingsPutHandler' },
  { path: 'admin/audit-logs', module: 'admin.routes', method: 'GET', export: 'adminAuditLogsHandler' },
  { path: 'admin/backup', module: 'admin.routes', method: 'POST', export: 'adminBackupHandler' },
  { path: 'admin/backups', module: 'admin.routes', method: 'GET', export: 'adminBackupsHandler' },
];

const modules = [...new Set(routes.map((r) => r.module))];

function parsePathPattern(pathPattern) {
  return pathPattern.split('/').map((segment) => (segment.startsWith(':') ? segment : segment));
}

function buildCatchAll() {
  const imports = modules
    .map((mod) => {
      const names = [...new Set(routes.filter((r) => r.module === mod).map((r) => r.export))];
      return `import { ${names.join(', ')} } from '../server/routes/${mod}.js';`;
    })
    .join('\n');

  const routeEntries = routes
    .map((r) => {
      const segments = parsePathPattern(r.path);
      return `  { segments: ${JSON.stringify(segments)}, method: '${r.method}', handler: ${r.export} },`;
    })
    .join('\n');

  return `import type { VercelRequest, VercelResponse } from '@vercel/node';
${imports}
import { loadDatabase } from '../server/utils/db/index.js';

type RouteEntry = {
  segments: string[];
  method: string;
  handler: (req: VercelRequest, res: VercelResponse) => unknown;
};

const routes: RouteEntry[] = [
${routeEntries}
];

function normalizePath(pathParam: string | string[] | undefined): string[] {
  if (!pathParam) return [];
  return Array.isArray(pathParam) ? pathParam : [pathParam];
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
  const pathSegments = normalizePath(req.query.path as string | string[] | undefined);

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
`;
}

function removeOldApiFiles(dir, keep) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      removeOldApiFiles(fullPath, keep);
      if (fs.readdirSync(fullPath).length === 0) fs.rmdirSync(fullPath);
    } else if (entry.isFile() && fullPath !== keep) {
      fs.unlinkSync(fullPath);
    }
  }
}

const outputFile = 'api/[[...path]].ts';
removeOldApiFiles('api', path.resolve(outputFile));
fs.writeFileSync(outputFile, buildCatchAll());

console.log('Generated single catch-all API route:', outputFile);
