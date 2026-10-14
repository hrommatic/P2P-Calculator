import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGroupPathSegments } from '../_lib/pathSegments.js';
import { banksIndexGetHandler, banksIndexPostHandler, bankUpdateHandler, bankDeleteHandler } from '../../server/routes/banks.routes.js';

type RouteEntry = {
  segments: string[];
  method: string;
  handler: (req: VercelRequest, res: VercelResponse) => unknown;
};

const routes: RouteEntry[] = [
  { segments: [], method: 'GET', handler: banksIndexGetHandler },
  { segments: [], method: 'POST', handler: banksIndexPostHandler },
  { segments: [":id"], method: 'PUT', handler: bankUpdateHandler },
  { segments: [":id"], method: 'DELETE', handler: bankDeleteHandler },
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
  const pathSegments = getGroupPathSegments(req, 'banks');

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
