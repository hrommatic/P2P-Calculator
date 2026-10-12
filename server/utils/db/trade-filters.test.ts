import assert from 'node:assert/strict';
import { buildTradeListQuery } from './trade-filters.js';

const userId = 'user_test';

{
  const { where, orderBy } = buildTradeListQuery(userId, {
    bankId: 'bank_1',
    exchange: 'Binance',
    sort: 'profit_desc',
  });
  const and = (where as { AND: { userId?: string }[] }).AND;
  assert.ok(and.some((c) => c.userId === userId));
  assert.equal(orderBy[0]?.netProfitUah, 'desc');
}

{
  const { where } = buildTradeListQuery(userId, { search: ' mono ' });
  const and =
    (where as { AND?: PrismaLike[] }).AND ??
    ([where] as PrismaLike[]);
  assert.ok(and.some((c) => Array.isArray(c.OR)));
}

{
  const { orderBy, monthDayFilter } = buildTradeListQuery(userId, {
    monthKey: '2026-03',
    monthDayFrom: '5',
    monthDayTo: '10',
  });
  assert.ok(monthDayFilter);
  assert.equal(monthDayFilter!.monthKey, '2026-03');
  assert.equal(orderBy[0]?.createdAt, 'desc');
}

console.log('trade-filters.test.ts: ok');

type PrismaLike = { OR?: unknown[]; userId?: string };
