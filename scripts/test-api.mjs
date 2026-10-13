#!/usr/bin/env node

const BASE = (process.argv[2] || 'https://p2p-calculator-weld.vercel.app').replace(/\/$/, '');
const ADMIN_PASS = process.env.ADMIN_INITIAL_PASSWORD || 'ChangeMeOnFirstDeploy!';

let token = '';
let passed = 0;
let failed = 0;
const errors = [];

async function req(method, path, body, auth = true, attempt = 0) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(45000),
    });
    const ct = res.headers.get('content-type') || '';
    let data = null;
    if (ct.includes('application/json')) data = await res.json();
    else data = await res.text();
    return { status: res.status, data, ok: res.ok };
  } catch (err) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 2000));
      return req(method, path, body, auth, attempt + 1);
    }
    throw err;
  }
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

console.log(`Testing ${BASE}\n`);

await test('Public: health', async () => {
  const r = await req('GET', '/health', null, false);
  assert('health 200', r.status === 200 && r.data?.ok === true, JSON.stringify(r.data));
});

await test('Public: settings', async () => {
  const r = await req('GET', '/settings/public', null, false);
  assert('settings 200', r.status === 200 && r.data?.siteName, JSON.stringify(r.data));
});

await test('Public: exchanges', async () => {
  const r = await req('GET', '/exchanges', null, false);
  assert('exchanges 200', r.status === 200 && Array.isArray(r.data?.exchanges), JSON.stringify(r.data));
});

await test('Auth: login admin', async () => {
  const r = await req('POST', '/auth/login', { nickname: 'admin', password: ADMIN_PASS }, false);
  assert('login 200', r.status === 200 && r.data?.token, JSON.stringify(r.data));
  token = r.data?.token || '';
  assert('user is admin', r.data?.user?.role === 'admin');
});

await test('Auth: me', async () => {
  const r = await req('GET', '/auth/me');
  assert('me 200', r.status === 200 && r.data?.user?.nickname === 'admin');
});

await test('Auth: update profile', async () => {
  const r = await req('POST', '/auth/update-profile', { themePreference: 'navy', languagePreference: 'uk' });
  assert('update profile 200', r.status === 200 && r.data?.success);
});

await test('Banks: list', async () => {
  const r = await req('GET', '/banks');
  assert('banks 200', r.status === 200 && Array.isArray(r.data?.banks), `status=${r.status} ${JSON.stringify(r.data)?.slice(0, 120)}`);
});

let bankId = '';
await test('Banks: create', async () => {
  const r = await req('POST', '/banks', {
    name: `Test Bank ${Date.now()}`,
    turnoverLimitUah: 50000,
    initialTurnoverUah: 0,
    color: '#3b82f6',
    notes: 'API test',
  });
  assert('create bank 200', r.status === 200 && r.data?.bank?.id, JSON.stringify(r.data));
  bankId = r.data?.bank?.id || '';
});

await test('Banks: update', async () => {
  const r = await req('PUT', `/banks/${bankId}`, {
    name: `Test Bank Updated ${Date.now()}`,
    turnoverLimitUah: 60000,
  });
  assert('update bank 200', r.status === 200 && r.data?.success, JSON.stringify(r.data));
});

await test('Dashboard: stats', async () => {
  const r = await req('GET', '/dashboard/stats');
  assert('stats 200', r.status === 200, JSON.stringify(r.data)?.slice(0, 120));
});

let tradeId = '';
await test('Trades: list', async () => {
  const r = await req('GET', '/trades');
  assert('trades 200', r.status === 200 && Array.isArray(r.data?.trades), `status=${r.status}`);
});

await test('Trades: create', async () => {
  const banks = (await req('GET', '/banks')).data?.banks || [];
  const buyBank = banks[0]?.id || bankId;
  const sellBank = banks[1]?.id || buyBank;
  const r = await req('POST', '/trades', {
    buyExchange: 'Binance',
    sellExchange: 'Binance',
    buyBankId: buyBank,
    sellBankId: sellBank,
    buyRate: 44,
    sellRate: 46,
    buyAmountUah: 1000,
    buyCommission: 0,
    buyCommissionType: 'percent',
    sellCommission: 0,
    sellCommissionType: 'percent',
    extraExpensesUah: 0,
    note: 'API test trade',
  });
  assert('create trade 200', r.status === 200 && r.data?.trade?.id, JSON.stringify(r.data));
  tradeId = r.data?.trade?.id || '';
});

await test('Trades: update', async () => {
  if (!tradeId) return assert('skip update (no trade)', false, 'no trade id');
  const list = await req('GET', '/trades');
  const trade = list.data?.trades?.find((t) => t.id === tradeId);
  if (!trade) return assert('trade in list', false, 'not found');
  const r = await req('PUT', `/trades/${tradeId}`, {
    buyExchange: trade.buyExchange,
    buyBankId: trade.buyBankId,
    buyRate: trade.buyRate,
    buyAmountUah: trade.buyAmountUah,
    buyCommission: trade.buyCommission,
    buyCommissionType: trade.buyCommissionType,
    sellExchange: trade.sellExchange,
    sellBankId: trade.sellBankId,
    sellRate: trade.sellRate,
    sellUsdtAmount: trade.sellUsdtAmount,
    sellCommission: trade.sellCommission,
    sellCommissionType: trade.sellCommissionType,
    extraExpensesUah: trade.extraExpensesUah,
    notes: 'Updated via API test',
  });
  assert('update trade 200', r.status === 200 && r.data?.success, JSON.stringify(r.data));
});

await test('Trades: export-csv', async () => {
  const r = await req('GET', '/trades/export-csv');
  assert('export 200', r.status === 200, `status=${r.status}`);
});

await test('Admin: overview', async () => {
  const r = await req('GET', '/admin/overview');
  assert('overview 200', r.status === 200, JSON.stringify(r.data)?.slice(0, 120));
});

await test('Admin: users', async () => {
  const r = await req('GET', '/admin/users');
  assert('users 200', r.status === 200 && Array.isArray(r.data?.users), JSON.stringify(r.data)?.slice(0, 120));
});

await test('Admin: students-stats', async () => {
  const r = await req('GET', '/admin/students-stats');
  assert('students-stats 200', r.status === 200, JSON.stringify(r.data)?.slice(0, 120));
});

await test('Admin: global-banks', async () => {
  const r = await req('GET', '/admin/global-banks');
  assert('global-banks 200', r.status === 200 && Array.isArray(r.data?.banks), `status=${r.status} ${JSON.stringify(r.data)?.slice(0, 80)}`);
});

await test('Admin: exchanges', async () => {
  const r = await req('GET', '/admin/exchanges');
  assert('admin exchanges 200', r.status === 200 && Array.isArray(r.data?.exchanges), `status=${r.status}`);
});

await test('Cleanup: delete trade', async () => {
  if (!tradeId) return assert('skip delete trade', true);
  const r = await req('DELETE', `/trades/${tradeId}`);
  assert('delete trade 200', r.status === 200 && r.data?.success, JSON.stringify(r.data));
});

await test('Cleanup: delete bank', async () => {
  if (!bankId) return assert('skip delete bank', true);
  const r = await req('DELETE', `/banks/${bankId}`);
  assert('delete bank 200', r.status === 200 && r.data?.success, JSON.stringify(r.data));
});

await test('Auth: logout', async () => {
  const r = await req('POST', '/auth/logout');
  assert('logout 200', r.status === 200 && r.data?.success);
});

console.log(`\n${'='.repeat(40)}`);
console.log(`Passed: ${passed}  Failed: ${failed}`);
if (errors.length) {
  console.log('\nFailures:');
  errors.forEach((e) => console.log(e));
  process.exit(1);
}
console.log('All tests passed!');
