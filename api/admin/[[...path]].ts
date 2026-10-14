import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGroupPathSegments } from '../_lib/pathSegments.js';
import { adminUserStatusHandler, adminUserProfileHandler, adminUserResetPasswordHandler, adminUserDeleteHandler, adminExchangeUpdateHandler, adminOverviewHandler, adminUsersHandler, adminStudentsStatsHandler, adminGlobalBanksGetHandler, adminGlobalBanksPostHandler, adminExchangesGetHandler, adminExchangesPostHandler } from '../../server/routes/admin.routes.js';

type RouteEntry = {
  segments: string[];
  method: string;
  handler: (req: VercelRequest, res: VercelResponse) => unknown;
};

const routes: RouteEntry[] = [
  { segments: ["users",":id","status"], method: 'PUT', handler: adminUserStatusHandler },
  { segments: ["users",":id","profile"], method: 'PUT', handler: adminUserProfileHandler },
  { segments: ["users",":id","reset-password"], method: 'POST', handler: adminUserResetPasswordHandler },
  { segments: ["users",":id"], method: 'DELETE', handler: adminUserDeleteHandler },
  { segments: ["exchanges",":id"], method: 'PUT', handler: adminExchangeUpdateHandler },
  { segments: ["overview"], method: 'GET', handler: adminOverviewHandler },
  { segments: ["users"], method: 'GET', handler: adminUsersHandler },
  { segments: ["students-stats"], method: 'GET', handler: adminStudentsStatsHandler },
  { segments: ["global-banks"], method: 'GET', handler: adminGlobalBanksGetHandler },
  { segments: ["global-banks"], method: 'POST', handler: adminGlobalBanksPostHandler },
  { segments: ["exchanges"], method: 'GET', handler: adminExchangesGetHandler },
  { segments: ["exchanges"], method: 'POST', handler: adminExchangesPostHandler },
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
  const pathSegments = getGroupPathSegments(req, 'admin');

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
