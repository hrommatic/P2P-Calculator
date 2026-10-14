import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getGroupPathSegments } from '../_lib/pathSegments.js';
import { registerHandler, loginHandler, logoutHandler, meHandler, changePasswordHandler, updateProfileHandler } from '../../server/routes/auth.routes.js';

type RouteEntry = {
  segments: string[];
  method: string;
  handler: (req: VercelRequest, res: VercelResponse) => unknown;
};

const routes: RouteEntry[] = [
  { segments: ["register"], method: 'POST', handler: registerHandler },
  { segments: ["login"], method: 'POST', handler: loginHandler },
  { segments: ["logout"], method: 'POST', handler: logoutHandler },
  { segments: ["me"], method: 'GET', handler: meHandler },
  { segments: ["change-password"], method: 'POST', handler: changePasswordHandler },
  { segments: ["update-profile"], method: 'POST', handler: updateProfileHandler },
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
  const pathSegments = getGroupPathSegments(req, 'auth');

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
