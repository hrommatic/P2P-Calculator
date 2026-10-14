import assert from 'node:assert/strict';
import {
  bankStatsDeltaForTrade,
  mergeBankStatsDeltaMaps,
} from './bank-stats-delta.js';

const trade = {
  buyBankId: 'buy-bank',
  sellBankId: 'sell-bank',
  buyAmountUah: 1000,
  sellAmountUah: 1050,
  netProfitUah: 40,
};

const sameBankTrade = {
  ...trade,
  sellBankId: 'buy-bank',
  sellAmountUah: 1050,
};

{
  const add = bankStatsDeltaForTrade(trade, 1);
  assert.equal(add.size, 2);
  assert.deepEqual(add.get('buy-bank'), {
    buyTurnoverUah: 1000,
    sellTurnoverUah: 0,
    netProfitUah: 40,
    tradesCount: 1,
  });
  assert.deepEqual(add.get('sell-bank'), {
    buyTurnoverUah: 0,
    sellTurnoverUah: 1050,
    netProfitUah: 40,
    tradesCount: 1,
  });

  const remove = bankStatsDeltaForTrade(trade, -1);
  const net = mergeBankStatsDeltaMaps(add, remove);
  assert.equal(net.size, 2);
  for (const d of net.values()) {
    assert.deepEqual(d, {
      buyTurnoverUah: 0,
      sellTurnoverUah: 0,
      netProfitUah: 0,
      tradesCount: 0,
    });
  }
}

{
  const add = bankStatsDeltaForTrade(sameBankTrade, 1);
  assert.equal(add.size, 1);
  assert.deepEqual(add.get('buy-bank'), {
    buyTurnoverUah: 1000,
    sellTurnoverUah: 1050,
    netProfitUah: 40,
    tradesCount: 1,
  });
}

console.log('bank-stats-delta.test.ts: ok');
