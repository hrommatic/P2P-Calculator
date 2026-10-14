import assert from 'node:assert/strict';
import {
  getKyivDayStartMs,
  kyivMonthDaysToCreatedAtRange,
  tradeFiltersToCreatedAtRange,
  tradeMatchesKyivMonthDays,
} from './kyiv-dates.js';

const monthKey = '2026-03';
const dayFrom = 5;
const dayTo = 10;

const range = kyivMonthDaysToCreatedAtRange(monthKey, dayFrom, dayTo);
assert.ok(range);

const samples = [
  new Date(getKyivDayStartMs('2026-03-04')),
  new Date(getKyivDayStartMs('2026-03-05')),
  new Date(getKyivDayStartMs('2026-03-10')),
  new Date(getKyivDayStartMs('2026-03-11')),
];

for (const at of samples) {
  const inRange: boolean = at >= range!.gte && at < range!.lt;
  const matches = tradeMatchesKyivMonthDays(at, monthKey, dayFrom, dayTo);
  assert.equal(inRange, matches, at.toISOString());
}

assert.equal(
  tradeFiltersToCreatedAtRange({
    monthKey,
    monthDayFrom: dayTo,
    monthDayTo: dayFrom,
  })!.gte.getTime(),
  range!.gte.getTime(),
);

console.log('kyiv-dates.test.ts: ok');
