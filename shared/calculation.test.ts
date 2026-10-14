import assert from 'node:assert/strict';
import { calculateTrade } from './calculation.js';

{
  const r = calculateTrade({
    buyRate: 44,
    buyAmountUah: 1000,
    sellRate: 46,
    buyCommission: 0,
    sellCommission: 0,
    defaultBuyWhenEmpty: false,
  });
  assert.equal(r.buyUsdtAmount, 22.7273);
  assert.equal(r.netProfitUah, 45.45);
}

{
  const r = calculateTrade({
    buyRate: 44,
    buyAmountUah: 0,
    sellRate: 46,
    defaultBuyWhenEmpty: true,
  });
  assert.equal(r.buyAmountUah, 10000);
}

console.log('calculation.test.ts: ok');
