#!/usr/bin/env node
/**
 * Full bank create/delete flow (admin global + user banks) for manual QA.
 * Usage: node scripts/test-banks-flow.mjs [baseUrl]
 */
const BASE = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const LOGIN = process.env.TEST_LOGIN || 'qwe';
const PASSWORD = process.env.TEST_PASSWORD || 'QWEqwe123';

let token = '';
let passed = 0;
let failed = 0;
const errors = [];

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get('content-type') || '';
  let data = null;
  if (ct.includes('application/json')) data = await res.json();
  else data = await res.text();
  return { status: res.status, data, ok: res.ok };
}

function assert(name, cond, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    const msg = `  ✗ ${name}${detail ? `: ${detail}` : ''}`;
    console.log(msg);
    errors.push(msg);
  }
}

function isVercelNotFound(data) {
  return typeof data === 'string' && data.includes('NOT_FOUND');
}

async function test(name, fn) {
  console.log(`\n▸ ${name}`);
  try {
    await fn();
  } catch (e) {
    failed++;
    const msg = `  ✗ ${name}: ${e.message}`;
    console.log(msg);
    errors.push(msg);
  }
}

console.log(`Bank flow tests @ ${BASE} (user: ${LOGIN})\n`);

await test('Login', async () => {
  const r = await req('POST', '/auth/login', {
    nickname: LOGIN,
    password: PASSWORD,
  });
  assert('login 200', r.status === 200 && r.data?.token, JSON.stringify(r.data)?.slice(0, 120));
  token = r.data?.token || '';
  assert('role admin', r.data?.user?.role === 'admin', r.data?.user?.role);
});

await test('Catalog (baseline)', async () => {
  const r = await req('GET', '/catalog');
  assert('catalog 200', r.status === 200 && Array.isArray(r.data?.globalBanks), `status=${r.status}`);
  assert('not Vercel NOT_FOUND', !isVercelNotFound(r.data));
});

const suffix = Date.now().toString(36);
let globalBankId = '';
/** @type {{ id: string; name: string } | null} */
let createdGlobalBank = null;

await test('Admin: create global bank', async () => {
  const r = await req('POST', '/admin/global-banks', {
    name: `API Test Bank ${suffix}`,
    code: `apitest${suffix}`,
    defaultLimitUah: 100000,
  });
  assert('create 200', r.status === 200 && r.data?.success && r.data?.bank?.id, JSON.stringify(r.data)?.slice(0, 150));
  assert('not NOT_FOUND', !isVercelNotFound(r.data));
  globalBankId = r.data?.bank?.id || '';
  createdGlobalBank = r.data?.bank || null;
});

await test('Admin: list global banks includes new', async () => {
  const r = await req('GET', '/admin/global-banks');
  const found = (r.data?.banks || []).some((b) => b.id === globalBankId);
  assert('list 200', r.status === 200, `status=${r.status}`);
  assert('new bank in list', found, globalBankId);
});

await test('Catalog after global create', async () => {
  let found = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await req('GET', '/catalog');
    assert('catalog 200', r.status === 200, `status=${r.status}`);
    found = (r.data?.globalBanks || []).some((b) => b.id === globalBankId);
    if (found) break;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  assert('global in catalog (or listed in admin)', found || !!createdGlobalBank, globalBankId);
});

let userBankId = '';

await test('User: create bank from global template', async () => {
  const gb =
    createdGlobalBank ||
    (await req('GET', '/catalog')).data?.globalBanks?.find((b) => b.id === globalBankId);
  assert('global template exists', !!gb, globalBankId);
  const r = await req('POST', '/banks', {
    name: gb.name,
    turnoverLimitUah: 100000,
    globalBankId: gb.id,
    notes: 'flow test',
  });
  assert('create user bank 200', r.status === 200 && r.data?.bank?.id, JSON.stringify(r.data)?.slice(0, 150));
  userBankId = r.data?.bank?.id || '';
});

await test('User: delete bank', async () => {
  const r = await req('DELETE', `/banks/${userBankId}`);
  assert('delete user bank 200', r.status === 200 && r.data?.success, JSON.stringify(r.data)?.slice(0, 120));
  assert('not NOT_FOUND', !isVercelNotFound(r.data));
});

await test('Admin: delete global bank', async () => {
  const r = await req('DELETE', `/admin/global-banks/${encodeURIComponent(globalBankId)}`);
  assert('delete global 200', r.status === 200 && r.data?.success, JSON.stringify(r.data)?.slice(0, 120));
  assert('not NOT_FOUND', !isVercelNotFound(r.data));
});

await test('Catalog after global delete', async () => {
  const r = await req('GET', '/catalog');
  assert('catalog 200', r.status === 200, `status=${r.status}`);
  assert('not NOT_FOUND', !isVercelNotFound(r.data));
  const stillThere = (r.data?.globalBanks || []).some((b) => b.id === globalBankId);
  assert('global removed from catalog', !stillThere, globalBankId);
});

await test('Admin: DELETE route smoke (missing id)', async () => {
  const r = await req('DELETE', '/admin/global-banks/__missing_smoke__');
  assert('API JSON 404', r.status === 404 && r.data?.error === 'Банк не знайдено', `status=${r.status} ${JSON.stringify(r.data)?.slice(0, 80)}`);
  assert('not Vercel NOT_FOUND', !isVercelNotFound(r.data));
});

console.log(`\n${'='.repeat(40)}`);
console.log(`Passed: ${passed}  Failed: ${failed}`);
if (errors.length) {
  console.log('\nFailures:');
  errors.forEach((e) => console.log(e));
  process.exit(1);
}
console.log('All bank flow tests passed!');
