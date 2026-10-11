import fs from 'fs';
import path from 'path';

/** @typedef {{ file: string, module: string, handlers: { method: string, export: string }[] }} RouteDef */

/** @type {RouteDef[]} */
const routes = [
  { file: 'api/auth/register.ts', module: 'auth.routes', handlers: [{ method: 'POST', export: 'registerHandler' }] },
  { file: 'api/auth/login.ts', module: 'auth.routes', handlers: [{ method: 'POST', export: 'loginHandler' }] },
  { file: 'api/auth/logout.ts', module: 'auth.routes', handlers: [{ method: 'POST', export: 'logoutHandler' }] },
  { file: 'api/auth/me.ts', module: 'auth.routes', handlers: [{ method: 'GET', export: 'meHandler' }] },
  { file: 'api/auth/change-password.ts', module: 'auth.routes', handlers: [{ method: 'POST', export: 'changePasswordHandler' }] },
  { file: 'api/auth/update-profile.ts', module: 'auth.routes', handlers: [{ method: 'POST', export: 'updateProfileHandler' }] },
  { file: 'api/exchanges.ts', module: 'auth.routes', handlers: [{ method: 'GET', export: 'exchangesHandler' }] },
  { file: 'api/settings/public.ts', module: 'auth.routes', handlers: [{ method: 'GET', export: 'settingsPublicHandler' }] },
  { file: 'api/trades/index.ts', module: 'trades.routes', handlers: [
    { method: 'GET', export: 'tradesIndexHandler' },
    { method: 'POST', export: 'tradesCreateHandler' },
  ]},
  { file: 'api/trades/export-csv.ts', module: 'trades.routes', handlers: [{ method: 'GET', export: 'tradesExportCsvHandler' }] },
  { file: 'api/trades/[id].ts', module: 'trades.routes', handlers: [
    { method: 'PUT', export: 'tradeUpdateHandler' },
    { method: 'DELETE', export: 'tradeDeleteHandler' },
  ]},
  { file: 'api/banks/index.ts', module: 'banks.routes', handlers: [
    { method: 'GET', export: 'banksIndexGetHandler' },
    { method: 'POST', export: 'banksIndexPostHandler' },
  ]},
  { file: 'api/banks/[id].ts', module: 'banks.routes', handlers: [
    { method: 'PUT', export: 'bankUpdateHandler' },
    { method: 'DELETE', export: 'bankDeleteHandler' },
  ]},
  { file: 'api/dashboard/stats.ts', module: 'dashboard.routes', handlers: [{ method: 'GET', export: 'dashboardStatsHandler' }] },
  { file: 'api/admin/overview.ts', module: 'admin.routes', handlers: [{ method: 'GET', export: 'adminOverviewHandler' }] },
  { file: 'api/admin/users.ts', module: 'admin.routes', handlers: [{ method: 'GET', export: 'adminUsersHandler' }] },
  { file: 'api/admin/users/[id]/status.ts', module: 'admin.routes', handlers: [{ method: 'PUT', export: 'adminUserStatusHandler' }] },
  { file: 'api/admin/users/[id]/profile.ts', module: 'admin.routes', handlers: [{ method: 'PUT', export: 'adminUserProfileHandler' }] },
  { file: 'api/admin/users/[id]/reset-password.ts', module: 'admin.routes', handlers: [{ method: 'POST', export: 'adminUserResetPasswordHandler' }] },
  { file: 'api/admin/users/[id].ts', module: 'admin.routes', handlers: [{ method: 'DELETE', export: 'adminUserDeleteHandler' }] },
  { file: 'api/admin/students-stats.ts', module: 'admin.routes', handlers: [{ method: 'GET', export: 'adminStudentsStatsHandler' }] },
  { file: 'api/admin/global-banks/index.ts', module: 'admin.routes', handlers: [
    { method: 'GET', export: 'adminGlobalBanksGetHandler' },
    { method: 'POST', export: 'adminGlobalBanksPostHandler' },
  ]},
  { file: 'api/admin/global-banks/[id].ts', module: 'admin.routes', handlers: [
    { method: 'PUT', export: 'adminGlobalBankUpdateHandler' },
    { method: 'DELETE', export: 'adminGlobalBankDeleteHandler' },
  ]},
  { file: 'api/admin/exchanges/index.ts', module: 'admin.routes', handlers: [
    { method: 'GET', export: 'adminExchangesGetHandler' },
    { method: 'POST', export: 'adminExchangesPostHandler' },
  ]},
  { file: 'api/admin/exchanges/[id].ts', module: 'admin.routes', handlers: [{ method: 'PUT', export: 'adminExchangeUpdateHandler' }] },
  { file: 'api/admin/settings.ts', module: 'admin.routes', handlers: [
    { method: 'GET', export: 'adminSettingsGetHandler' },
    { method: 'PUT', export: 'adminSettingsPutHandler' },
  ]},
  { file: 'api/admin/audit-logs.ts', module: 'admin.routes', handlers: [{ method: 'GET', export: 'adminAuditLogsHandler' }] },
  { file: 'api/admin/backup.ts', module: 'admin.routes', handlers: [{ method: 'POST', export: 'adminBackupHandler' }] },
  { file: 'api/admin/backups.ts', module: 'admin.routes', handlers: [{ method: 'GET', export: 'adminBackupsHandler' }] },
];

function serverPrefix(file) {
  const depth = file.split('/').length - 1;
  return '../'.repeat(depth) + 'server/';
}

function buildRoute({ file, module, handlers }) {
  const prefix = serverPrefix(file);
  const routeImport = `${prefix}routes/${module}.js`;
  const helpersImport = `${prefix}middlewares/helpers.js`;

  if (handlers.length === 1) {
    return `export { ${handlers[0].export} as default } from '${routeImport}';\n`;
  }

  const imports = handlers.map((h) => h.export).join(', ');
  const methods = handlers.map((h) => `'${h.method}'`);
  let out = `import type { VercelRequest, VercelResponse } from '@vercel/node';\n`;
  out += `import { ${imports} } from '${routeImport}';\n`;
  out += `import { methodNotAllowed } from '${helpersImport}';\n\n`;
  out += `export default async function handler(req: VercelRequest, res: VercelResponse) {\n`;
  for (const h of handlers) {
    out += `  if (req.method === '${h.method}') return ${h.export}(req, res);\n`;
  }
  out += `  methodNotAllowed(res, [${methods.join(', ')}]);\n`;
  out += `}\n`;
  return out;
}

for (const route of routes) {
  fs.mkdirSync(path.dirname(route.file), { recursive: true });
  fs.writeFileSync(route.file, buildRoute(route));
}

fs.writeFileSync(
  'api/health.ts',
  `import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadDatabase } from '../server/utils/db/index.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    await loadDatabase();
    return res.status(200).json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database unavailable';
    return res.status(503).json({ ok: false, error: message });
  }
}
`,
);

console.log('Generated', routes.length + 1, 'api routes');
