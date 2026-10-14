import assert from 'node:assert/strict';
import type { VercelRequest } from '@vercel/node';
import { getGroupPathSegments } from '../api/_lib/pathSegments.js';

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

{
  const req = mockReq({ url: '/api/admin/users/user_123_abcd' });
  assert.deepEqual(getGroupPathSegments(req, 'admin', ['users']), ['user_123_abcd']);
}

{
  const req = mockReq({ path: ['users', 'user_123_abcd', 'status'] });
  assert.deepEqual(getGroupPathSegments(req, 'admin', ['users']), [
    'user_123_abcd',
    'status',
  ]);
}

console.log('pathSegments.test.ts: ok');
