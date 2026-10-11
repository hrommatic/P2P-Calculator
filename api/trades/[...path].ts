import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tradesExportCsvHandler, tradeUpdateHandler, tradeDeleteHandler } from '../../server/routes/trades.routes.js';

type RouteEntry = {
  segments: string[];
  method: string;
  handler: (req: VercelRequest, res: VercelResponse) => unknown;
};

const routes: RouteEntry[] = [
  { segments: ["export-csv"], method: 'GET', handler: tradesExportCsvHandler },
  { segments: [":id"], method: 'PUT', handler: tradeUpdateHandler },
  { segments: [":id"], method: 'DELETE', handler: tradeDeleteHandler },
];

function getPathSegments(req: VercelRequest): string[] {
  const queryPath = req.query.path;
  if (queryPath) {
    return Array.isArray(queryPath) ? queryPath : [queryPath];
  }
  const pathname = (req.url ?? '').split('?')[0];
  const marker = '/api/';
  const idx = pathname.indexOf(marker);
  if (idx >= 0) {
    return pathname.slice(idx + marker.length).split('/').filter(Boolean).slice(1);
  }
  return [];
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathSegments = getPathSegments(req);

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
