import type { VercelRequest, VercelResponse } from '@vercel/node';

export function methodNotAllowed(res: VercelResponse, allowed: string[]): VercelResponse {
  res.setHeader('Allow', allowed.join(', '));
  return res.status(405).json({ error: 'Method not allowed' });
}

export function parseJsonBody(req: VercelRequest): Record<string, unknown> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      throw new Error('Invalid JSON body');
    }
  }
  return {};
}

export function sendServerError(res: VercelResponse, err: unknown): VercelResponse {
  console.error(err);
  if (res.headersSent) {
    return res;
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  if (message === 'Invalid JSON body') {
    return res.status(400).json({ error: 'Некоректне тіло запиту (Invalid JSON body)' });
  }
  return res.status(500).json({ error: message });
}

export function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) {
    return realIp;
  }
  return 'unknown';
}

export function getBearerToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7).trim();
}
