import type { VercelRequest } from '@vercel/node';

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
