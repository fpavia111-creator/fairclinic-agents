// Payroll production: payroll percent of collections per period, overtime, missing collections, roles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkPayroll } from '../src/index.js';

const p = (over = {}) => ({ employee: 'A', role: 'Tech', period_start: '2026-10-01', period_end: '2026-10-15', regular_hours: '80', overtime_hours: '0', gross_pay: '2000', ...over });
const rev = (c = '10000', d = '2026-10-01') => ({ period_start: d, collections: c });
const period = (r) => r.items.find((i) => i.kind === 'period');

test('payroll under the target is ok, with the percent and collections per hour', () => {
  const i = period(checkPayroll([p()], [rev()]));
  assert.equal(i.status, 'ok'); assert.equal(i.payroll_pct, 20); assert.equal(i.collections_per_hour, 125);
});

test('payroll over the target is flagged, and the target is a setting', () => {
  assert.equal(period(checkPayroll([p({ gross_pay: '4000' })], [rev()])).status, 'payroll_pct_high');
  assert.equal(period(checkPayroll([p({ gross_pay: '4000' })], [rev()], { settings: { payroll_pct_max: 45 } })).status, 'ok');
});

test('a period with no collections figure is named', () => { assert.equal(period(checkPayroll([p()], [])).status, 'no_revenue'); });

test('overtime above the flag lists the employee; at the flag it does not', () => {
  assert.equal(checkPayroll([p({ overtime_hours: '9' })], [rev()]).items.filter((i) => i.status === 'overtime').length, 1);
  assert.equal(checkPayroll([p({ overtime_hours: '8' })], [rev()]).items.filter((i) => i.status === 'overtime').length, 0);
  assert.equal(checkPayroll([p({ overtime_hours: '9' })], [rev()], { settings: { overtime_hours_max: 10 } }).items.filter((i) => i.status === 'overtime').length, 0);
});

test('several employees in a period are added together', () => {
  const i = period(checkPayroll([p(), p({ employee: 'B', gross_pay: '3000', regular_hours: '40', overtime_hours: '2' })], [rev()]));
  assert.equal(i.gross_pay, 5000); assert.equal(i.hours, 122); assert.equal(i.overtime_hours, 2);
});

test('periods are listed in date order, each period before its employees', () => {
  const r = checkPayroll([p({ period_start: '2026-10-16', overtime_hours: '12' }), p()], [rev(), rev('9000', '2026-10-16')]);
  assert.deepEqual(r.items.map((i) => `${i.period_start}|${i.kind}`), ['2026-10-01|period', '2026-10-16|period', '2026-10-16|employee']);
});

test('totals by role count each person once', () => {
  const r = checkPayroll([p(), p({ period_start: '2026-10-16' })], [rev(), rev('9000', '2026-10-16')]);
  assert.deepEqual(r.by_role, [{ role: 'Tech', employees: 1, hours: 160, gross_pay: 4000 }]);
});

test('overall payroll percent uses only periods with collections', () => {
  const r = checkPayroll([p(), p({ period_start: '2026-11-01' })], [rev()]);
  assert.equal(r.collections, 10000); assert.equal(r.gross_pay, 4000);
});

test('the report has a row per period and per flagged employee', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('payroll_write_report', { payroll: 'fixtures/payroll-register.csv', revenue: 'fixtures/collections-by-period.csv' });
  assert.equal(readFileSync(`${root}/${r.result.files[0]}`, 'utf8').trim().split('\n').length, 5);
});
