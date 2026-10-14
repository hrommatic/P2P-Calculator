import type { VercelRequest } from '@vercel/node';

/** Segments after /api/{group}/ for catch-all route handlers. */
export function getGroupPathSegments(
  req: VercelRequest,
  groupName: string,
): string[] {
  const queryPath = req.query.path;
  if (queryPath !== undefined && queryPath !== null) {
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
