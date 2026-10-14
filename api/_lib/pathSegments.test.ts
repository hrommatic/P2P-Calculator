import assert from 'node:assert/strict';
import type { VercelRequest } from '@vercel/node';
import { getGroupPathSegments } from './pathSegments.js';

function mockReq(partial: {
  url?: string;
  path?: string | string[];
}): VercelRequest {
  return {
    url: partial.url,
    query: partial.path !== undefined ? { path: partial.path } : {},
  } as VercelRequest;
}

{
  const req = mockReq({ path: 'ub_user_abc123' });
  assert.deepEqual(getGroupPathSegments(req, 'banks'), ['ub_user_abc123']);
}

{
  const req = mockReq({ url: '/api/banks/ub_user_abc123' });
  assert.deepEqual(getGroupPathSegments(req, 'banks'), ['ub_user_abc123']);
}

{
  const req = mockReq({ path: ['banks', 'ub_user_abc123'] });
  assert.deepEqual(getGroupPathSegments(req, 'banks'), ['ub_user_abc123']);
}

{
  const req = mockReq({ path: 'gb_template_1' });
  assert.deepEqual(getGroupPathSegments(req, 'admin', ['global-banks']), [
    'gb_template_1',
  ]);
}

console.log('pathSegments.test.ts: ok');
