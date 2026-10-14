import fs from 'fs';
import path from 'path';

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

function pathPatternSegmentCount(pathPattern) {
  if (!pathPattern) return 0;
  return pathPattern.split('/').length;
}

/** Vercel file path for multi-segment routes (e.g. global-banks/:id → api/admin/global-banks/[id].ts). */
function pathPatternToApiFile(groupName, pathPattern) {
  const parts = pathPattern.split('/');
  const fsParts = parts.map((p) => (p.startsWith(':') ? `[${p.slice(1)}]` : p));
  return `api/${groupName}/${fsParts.join('/')}.ts`;
}

function buildDedicatedRouteFile(routeList, depth) {
  const prefix = '../'.repeat(depth) + 'server/';
  const modules = [...new Set(routeList.map((r) => r.module))];
  const imports = modules
    .map((mod) => {
      const names = [...new Set(routeList.filter((r) => r.module === mod).map((r) => r.export))];
      return `import { ${names.join(', ')} } from '${prefix}routes/${mod}.js';`;
    })
    .join('\n');
  const methods = routeList.map((r) => `'${r.method}'`);
  const dispatch = routeList
    .map((r) => `  if (req.method === '${r.method}') return ${r.export}(req, res);`)
    .join('\n');

  return `import type { VercelRequest, VercelResponse } from '@vercel/node';
${imports}
import { methodNotAllowed } from '${prefix}middlewares/helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
${dispatch}
  return methodNotAllowed(res, [${methods.join(', ')}]);
}
`;
}

function buildGroupRouter(groupRoutes, depth, groupName) {
  const nestedRoutes = groupRoutes.filter((r) => r.path);
  const prefix = '../'.repeat(depth) + 'server/';
  const modules = [...new Set(nestedRoutes.map((r) => r.module))];
  const imports = modules
    .map((mod) => {
      const names = [...new Set(nestedRoutes.filter((r) => r.module === mod).map((r) => r.export))];
      return `import { ${names.join(', ')} } from '${prefix}routes/${mod}.js';`;
    })
    .join('\n');

  const routeEntries = nestedRoutes
    .map((r) => {
      const segments = parsePathPattern(r.path);
      return `  { segments: ${JSON.stringify(segments)}, method: '${r.method}', handler: ${r.export} },`;
    })
    .join('\n');

  const libPrefix = '../'.repeat(depth - 1);
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
  const pathSegments = getGroupPathSegments(req, '${groupName}');

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

/** Segments after /api/{group}/ for catch-all route handlers. */
export function getGroupPathSegments(
  req: VercelRequest,
  groupName: string,
): string[] {
  const queryPath = req.query.path;
  if (queryPath) {
    const parts = Array.isArray(queryPath) ? queryPath : [queryPath];
    return parts.flatMap((p) => String(p).split('/').filter(Boolean));
  }

  const pathname = (req.url ?? '').split('?')[0];
  const marker = '/api/';
  const idx = pathname.indexOf(marker);
  if (idx < 0) return [];

  const afterApi = pathname.slice(idx + marker.length).split('/').filter(Boolean);
  if (afterApi[0] === groupName) {
    return afterApi.slice(1);
  }
  return afterApi;
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

function buildIndexRoute(groupRoutes, depth) {
  const prefix = '../'.repeat(depth) + 'server/';
  const indexRoutes = groupRoutes.filter((r) => !r.path);
  const handlers = indexRoutes.map((r) => r.export);
  const methods = indexRoutes.map((r) => `'${r.method}'`);
  const imports = [...new Set(indexRoutes.map((r) => r.module))]
    .map((mod) => {
      const names = [...new Set(indexRoutes.filter((r) => r.module === mod).map((r) => r.export))];
      return `import { ${names.join(', ')} } from '${prefix}routes/${mod}.js';`;
    })
    .join('\n');

  let out = `import type { VercelRequest, VercelResponse } from '@vercel/node';\n`;
  out += `${imports}\n`;
  out += `import { methodNotAllowed } from '${prefix}middlewares/helpers.js';\n\n`;
  out += `export default async function handler(req: VercelRequest, res: VercelResponse) {\n`;
  for (const route of indexRoutes) {
    out += `  if (req.method === '${route.method}') return ${route.export}(req, res);\n`;
  }
  out += `  return methodNotAllowed(res, [${methods.join(', ')}]);\n`;
  out += `}\n`;
  return out;
}

function removeDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
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

const groupFiles = [
  { name: 'auth', file: 'api/auth/[...path].ts', depth: 2 },
  { name: 'trades', file: 'api/trades/[...path].ts', depth: 2 },
  { name: 'banks', file: 'api/banks/[...path].ts', depth: 2 },
  { name: 'dashboard', file: 'api/dashboard/[...path].ts', depth: 2 },
  { name: 'admin', file: 'api/admin/[...path].ts', depth: 2 },
  { name: 'settings', file: 'api/settings/[...path].ts', depth: 2 },
];

let functionCount = 2;

const catalogRoute = routes.find((r) => r.path === 'catalog');
fs.mkdirSync('api/catalog', { recursive: true });
fs.writeFileSync('api/catalog/index.ts', buildSingleRoute(catalogRoute, 2));
functionCount += 1;

for (const { name, file, depth } of groupFiles) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const groupRoutes = groups[name];
  const hasIndexRoutes = groupRoutes.some((r) => !r.path);

  if (hasIndexRoutes) {
    const indexFile = `api/${name}/index.ts`;
    fs.writeFileSync(indexFile, buildIndexRoute(groupRoutes, depth));
    functionCount += 1;
  }

  const deepRoutesByPath = new Map();
  const catchAllRoutes = [];
  for (const route of groupRoutes) {
    if (!route.path) continue;
    if (pathPatternSegmentCount(route.path) > 1) {
      if (!deepRoutesByPath.has(route.path)) deepRoutesByPath.set(route.path, []);
      deepRoutesByPath.get(route.path).push(route);
    } else {
      catchAllRoutes.push(route);
    }
  }

  for (const [pathPattern, routeList] of deepRoutesByPath) {
    const dedicatedFile = pathPatternToApiFile(name, pathPattern);
    fs.mkdirSync(path.dirname(dedicatedFile), { recursive: true });
    const dedicatedDepth = dedicatedFile.split('/').length - 1;
    fs.writeFileSync(dedicatedFile, buildDedicatedRouteFile(routeList, dedicatedDepth));
    functionCount += 1;
  }

  const staticPrefixesFromDeep = new Set(
    [...deepRoutesByPath.keys()].map((p) => p.split('/')[0]),
  );
  const folderIndexRoutes = new Map();
  const remainingCatchAll = [];
  for (const route of catchAllRoutes) {
    const first = route.path.split('/')[0];
    if (staticPrefixesFromDeep.has(first) && route.path === first) {
      if (!folderIndexRoutes.has(first)) folderIndexRoutes.set(first, []);
      folderIndexRoutes.get(first).push(route);
    } else {
      remainingCatchAll.push(route);
    }
  }

  for (const [prefix, routeList] of folderIndexRoutes) {
    const indexFile = `api/${name}/${prefix}/index.ts`;
    fs.mkdirSync(path.dirname(indexFile), { recursive: true });
    const indexDepth = indexFile.split('/').length - 1;
    fs.writeFileSync(indexFile, buildDedicatedRouteFile(routeList, indexDepth));
    functionCount += 1;
  }

  const routerRoutes = [
    ...groupRoutes.filter((r) => !r.path),
    ...remainingCatchAll,
  ];
  if (remainingCatchAll.length > 0 || hasIndexRoutes) {
    fs.writeFileSync(file, buildGroupRouter(routerRoutes, depth, name));
    functionCount += 1;
  }
}

console.log('Generated', functionCount, 'api functions (Hobby plan compatible)');
