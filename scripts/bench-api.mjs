#!/usr/bin/env node

const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const ADMIN_PASS = process.env.ADMIN_INITIAL_PASSWORD || 'ChangeMeOnFirstDeploy!';

async function timed(label, fn) {
  const start = performance.now();
  const result = await fn();
  const ms = Math.round(performance.now() - start);
  console.log(`${label.padEnd(28)} ${String(ms).padStart(5)} ms`);
  return result;
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(60000),
  });
  const data = res.headers.get('content-type')?.includes('json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(data).slice(0, 120)}`);
  return data;
}

console.log(`Benchmark ${BASE}\n`);

await timed('GET /health', () => req('GET', '/health', null));
await timed('GET /settings/public', () => req('GET', '/settings/public', null));
await timed('GET /exchanges', () => req('GET', '/exchanges', null));

const login = await timed('POST /auth/login', () =>
  req('POST', '/auth/login', { nickname: 'admin', password: ADMIN_PASS }, null),
);
const token = login.token;

await timed('GET /auth/me', () => req('GET', '/auth/me', null, token));
await timed('GET /banks', () => req('GET', '/banks', null, token));
await timed('GET /dashboard/stats', () => req('GET', '/dashboard/stats', null, token));
await timed('GET /trades', () => req('GET', '/trades', null, token));
await timed('GET /admin/overview', () => req('GET', '/admin/overview', null, token));

console.log('\nWarm repeat (same lambda):');
await timed('GET /auth/me (warm)', () => req('GET', '/auth/me', null, token));
await timed('GET /banks (warm)', () => req('GET', '/banks', null, token));
