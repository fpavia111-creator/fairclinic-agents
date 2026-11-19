// PPO fees: plan fees against office fees and against what the plan actually allowed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkFees } from '../src/index.js';

const fees = [{ code: 'D1110', office_fee: '120' }, { code: 'D2740', office_fee: '1000' }];
const sch = (allowed1110 = '90', allowed2740 = '700') => [{ plan: 'Example PPO', code: 'D1110', allowed: allowed1110 }, { plan: 'Example PPO', code: 'D2740', allowed: allowed2740 }];
const paid = (code, allowed, n = 1) => Array.from({ length: n }, () => ({ plan: 'Example PPO', code, allowed: String(allowed) }));
const by = (r) => Object.fromEntries(r.items.map((i) => [i.code, i]));

test('everything at the plan fee is ok and the write-off percent is worked out', () => {
  const r = checkFees(fees, sch(), paid('D1110', 90, 2));
  assert.equal(by(r).D1110.status, 'ok'); assert.equal(by(r).D1110.writeoff_pct, 25); assert.equal(by(r).D2740.writeoff_pct, 30);
});

test('lines allowed below the plan\'s own fee are added up', () => {
  const r = checkFees(fees, sch(), [...paid('D1110', 80, 2), ...paid('D1110', 90)]);
  assert.equal(by(r).D1110.status, 'paid_below_schedule'); assert.equal(r.underpaid_amount, 20); assert.equal(by(r).D1110.avg_allowed_paid, 83.33);
});

test('the tolerance keeps rounding out of the list', () => {
  assert.equal(by(checkFees(fees, sch(), paid('D1110', 89.8))).D1110.status, 'ok');
  assert.equal(by(checkFees(fees, sch(), paid('D1110', 89.8), { settings: { tolerance: 0 } })).D1110.status, 'paid_below_schedule');
});

test('an office fee below the plan fee is flagged with the estimate per line', () => {
  const r = checkFees(fees, sch('130'), paid('D1110', 120, 3));
  assert.equal(by(r).D1110.status, 'fee_below_allowed'); assert.equal(r.left_by_low_fees, 30);
});

test('a code paid by a plan but missing from its schedule, and a plan code with no office fee, are both named', () => {
  const r = checkFees(fees, [...sch(), { plan: 'Example PPO', code: 'D9110', allowed: '75' }], paid('D2950', 220));
  assert.equal(by(r).D2950.status, 'not_in_schedule'); assert.equal(by(r).D9110.status, 'no_office_fee');
});

test('deep discounts follow the setting', () => {
  assert.equal(by(checkFees(fees, sch('90', '500'))).D2740.status, 'deep_discount');
  assert.equal(by(checkFees(fees, sch('90', '500'), [], { settings: { deep_discount_pct: 60 } })).D2740.status, 'ok');
});

test('plan names match across files whatever the spelling of case and spaces', () => {
  const r = checkFees(fees, sch(), [{ plan: 'EXAMPLE  ppo', code: 'd1110', allowed: '80' }]);
  assert.equal(r.items.length, 2); assert.equal(by(r).D1110.status, 'paid_below_schedule');
});

test('average write-off per plan, highest first', () => {
  const r = checkFees(fees, [...sch(), { plan: 'Other Plan', code: 'D1110', allowed: '60' }]);
  assert.deepEqual(r.by_plan.map((p) => [p.plan, p.avg_writeoff_pct]), [['Other Plan', 50], ['Example PPO', 27.5]]);
});

test('the report lists only pairs to review', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('fees_write_report', { fees: 'fixtures/office-fees.csv', schedules: 'fixtures/ppo-schedules.csv', paid: 'fixtures/allowed-paid.csv' });
  assert.equal(r.status, 'executed', r.reason);
  const csv = readFileSync(`${root}/${r.result.files[0]}`, 'utf8');
  assert.equal(csv.trim().split('\n').length, 6); assert.doesNotMatch(csv, /^ok,/m);
});
