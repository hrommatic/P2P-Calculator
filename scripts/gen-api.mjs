import fs from 'fs';

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
  { path: 'catalog', module: 'catalog.routes', method: 'GET', export: 'catalogGetHandler' },
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
];

const groups = {
  auth: [],
  trades: [],
  banks: [],
  dashboard: [],
  admin: [],
  settings: [],
};

for (const route of routes) {
  if (route.path.startsWith('auth/')) {
    groups.auth.push({ ...route, path: route.path.slice('auth/'.length) });
  } else if (route.path.startsWith('trades')) {
    groups.trades.push({ ...route, path: route.path.slice('trades/'.length) || '' });
  } else if (route.path.startsWith('banks')) {
    groups.banks.push({ ...route, path: route.path.slice('banks/'.length) || '' });
  } else if (route.path.startsWith('dashboard/')) {
    groups.dashboard.push({ ...route, path: route.path.slice('dashboard/'.length) });
  } else if (route.path.startsWith('admin/')) {
    groups.admin.push({ ...route, path: route.path.slice('admin/'.length) });
  } else if (route.path.startsWith('settings/')) {
    groups.settings.push({ ...route, path: route.path.slice('settings/'.length) });
  }
}

function parsePathPattern(pathPattern) {
  if (!pathPattern) return [];
  return pathPattern.split('/');
}

function buildGroupRouter(groupRoutes, depth, groupName, pathPrefixAfterGroup = null) {
  const prefix = '../'.repeat(depth) + 'server/';
  const modules = [...new Set(groupRoutes.map((r) => r.module))];
  const imports = modules
    .map((mod) => {
      const names = [...new Set(groupRoutes.filter((r) => r.module === mod).map((r) => r.export))];
      return `import { ${names.join(', ')} } from '${prefix}routes/${mod}.js';`;
    })
    .join('\n');

  const routeEntries = groupRoutes
    .map((r) => {
      const segments = parsePathPattern(r.path);
      return `  { segments: ${JSON.stringify(segments)}, method: '${r.method}', handler: ${r.export} },`;
    })
    .join('\n');

  const libPrefix = '../'.repeat(depth - 1);
  const prefixArg =
    pathPrefixAfterGroup && pathPrefixAfterGroup.length > 0
      ? `, ${JSON.stringify(pathPrefixAfterGroup)}`
      : '';
  const segmentCall = `getGroupPathSegments(req, '${groupName}'${prefixArg})`;

  return `import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGroupPathSegments } from '${libPrefix}_lib/pathSegments.js';
${imports}

type RouteEntry = {
  segments: string[];
  method: string;
  handler: (req: VercelRequest, res: VercelResponse) => unknown;
};

const routes: RouteEntry[] = [
${routeEntries}
];

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathSegments = ${segmentCall};

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

function buildPathSegmentsLib() {
  return `import type { VercelRequest } from '@vercel/node';

function readPathSegments(req: VercelRequest): string[] {
  const queryPath = req.query.path;
  if (queryPath !== undefined && queryPath !== null) {
    const parts = Array.isArray(queryPath) ? queryPath : [queryPath];
    return parts.flatMap((p) => String(p).split('/').filter(Boolean));
  }

  const pathname = (req.url ?? '').split('?')[0];
  const marker = '/api/';
  const idx = pathname.indexOf(marker);
  if (idx < 0) return [];

  return pathname.slice(idx + marker.length).split('/').filter(Boolean);
}

/** Segments after /api/{group}/ for catch-all route handlers. */
export function getGroupPathSegments(
  req: VercelRequest,
  groupName: string,
  pathPrefixAfterGroup: string[] = [],
): string[] {
  const queryPath = req.query.path;
  if (queryPath !== undefined && queryPath !== null && pathPrefixAfterGroup.length > 0) {
    const parts = Array.isArray(queryPath) ? queryPath : [queryPath];
    return parts.flatMap((p) => String(p).split('/').filter(Boolean));
  }

  const afterApi = readPathSegments(req);
  if (afterApi[0] !== groupName) return [];

  let segments = afterApi.slice(1);
  if (pathPrefixAfterGroup.length > 0) {
    for (let i = 0; i < pathPrefixAfterGroup.length; i++) {
      if (segments[i] !== pathPrefixAfterGroup[i]) return [];
    }
    segments = segments.slice(pathPrefixAfterGroup.length);
  }
  return segments;
}
`;
}

function buildHealthRoute() {
  return `import type { VercelRequest, VercelResponse } from '@vercel/node';
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
`;
}

function buildSingleRoute(route, depth = 1) {
  const prefix = '../'.repeat(depth) + 'server/';
  return `export { ${route.export} as default } from '${prefix}routes/${route.module}.js';\n`;
}

function removeDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = `${dir}/${entry.name}`;
    if (entry.isDirectory()) removeDir(fullPath);
    else fs.unlinkSync(fullPath);
  }
  fs.rmdirSync(dir);
}

removeDir('api');
fs.mkdirSync('api', { recursive: true });
fs.mkdirSync('api/_lib', { recursive: true });
fs.writeFileSync('api/_lib/pathSegments.ts', buildPathSegmentsLib());

fs.writeFileSync('api/health.ts', buildHealthRoute());

const exchangesRoute = routes.find((r) => r.path === 'exchanges');
fs.writeFileSync('api/exchanges.ts', buildSingleRoute(exchangesRoute));

const catalogRoute = routes.find((r) => r.path === 'catalog');
fs.writeFileSync('api/catalog.ts', buildSingleRoute(catalogRoute));

const groupFiles = [
  { name: 'auth', file: 'api/auth/[[...path]].ts', depth: 2 },
  { name: 'trades', file: 'api/trades/[[...path]].ts', depth: 2 },
  { name: 'banks', file: 'api/banks/[[...path]].ts', depth: 2 },
  { name: 'dashboard', file: 'api/dashboard/[[...path]].ts', depth: 2 },
  { name: 'settings', file: 'api/settings/[[...path]].ts', depth: 2 },
];

let functionCount = 3;

for (const { name, file, depth } of groupFiles) {
  fs.mkdirSync(file.slice(0, file.lastIndexOf('/')), { recursive: true });
  fs.writeFileSync(file, buildGroupRouter(groups[name], depth, name));
  functionCount += 1;
}

const adminRoot = [];
const adminNested = new Map();

for (const route of groups.admin) {
  const slashIdx = route.path.indexOf('/');
  if (slashIdx === -1) {
    adminRoot.push(route);
    continue;
  }
  const prefix = route.path.slice(0, slashIdx);
  const rest = route.path.slice(slashIdx + 1);
  if (!adminNested.has(prefix)) adminNested.set(prefix, []);
  adminNested.get(prefix).push({ ...route, path: rest });
}

fs.mkdirSync('api/admin', { recursive: true });
fs.writeFileSync(
  'api/admin/[[...path]].ts',
  buildGroupRouter(adminRoot, 2, 'admin'),
);
functionCount += 1;

for (const [prefix, nestedRoutes] of adminNested) {
  const file = `api/admin/${prefix}/[[...path]].ts`;
  const depth = file.split('/').length - 1;
  fs.mkdirSync(`api/admin/${prefix}`, { recursive: true });
  fs.writeFileSync(file, buildGroupRouter(nestedRoutes, depth, 'admin', [prefix]));
  functionCount += 1;
}

console.log('Generated', functionCount, 'api functions (Hobby plan: max 12)');
