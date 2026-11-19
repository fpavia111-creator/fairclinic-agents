// Staff discounts: approvals, staff accounts, percent limits, reasons and the per-person summary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkDiscounts } from '../src/index.js';

const d = (over = {}) => ({ date: '2026-11-02', invoice_number: 'I1', client_name: 'Owner', discount_type: 'Courtesy', amount: '30', invoice_total: '300', entered_by: 'Kim', approved_by: '', reason: 'Wait', ...over });
const st = (over, settings = {}) => checkDiscounts([d(over)], { settings }).items[0].status;

test('a small discount with a reason is ok without an approver', () => { assert.equal(st({}), 'ok'); });

test('above the approval amount a second person is needed', () => {
  assert.equal(st({ amount: '80' }), 'no_approver');
  assert.equal(st({ amount: '80', approved_by: 'Kim' }), 'self_approved');
  assert.equal(st({ amount: '80', approved_by: 'Dr. Lee' }), 'ok');
  assert.equal(st({ amount: '80' }, { approval_over: 100 }), 'ok');
});

test('names match whatever the case and spacing', () => { assert.equal(st({ amount: '80', approved_by: 'KIM ' }), 'self_approved'); });

test('a staff discount needs the account on the staff list', () => {
  assert.equal(st({ discount_type: 'Staff discount', reason: '' }, { staff_accounts: ['Sam'] }), 'staff_discount_non_staff');
  assert.equal(st({ discount_type: 'Employee discount', client_name: 'sam', reason: '' }, { staff_accounts: ['Sam'] }), 'ok');
});

test('a discount above the percent limit is flagged', () => {
  assert.equal(st({ amount: '40', invoice_total: '60' }), 'high_pct');
  assert.equal(st({ amount: '40', invoice_total: '60' }, { max_pct: 70 }), 'ok');
});

test('a discretionary discount needs a reason', () => { assert.equal(st({ reason: '' }), 'no_reason'); });

test('amounts written as negatives are read as their size', () => { assert.equal(checkDiscounts([d({ amount: '-30' })]).total, 30); });

test('per-person totals and shares add up', () => {
  const r = checkDiscounts([d(), d({ invoice_number: 'I2', entered_by: 'Lee', amount: '90', approved_by: 'Dr. X' })]);
  assert.deepEqual(r.by_staff.map((s) => [s.entered_by, s.amount, s.share_pct]), [['Lee', 90, 75], ['Kim', 30, 25]]);
});

test('the review list keeps client names for the owner; the result does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('discounts_write_report', { discounts: 'fixtures/discounts.csv', settings: 'fixtures/settings.json' });
  assert.match(readFileSync(`${root}/${r.result.files[0]}`, 'utf8'), /Felix Oduya/); assert.doesNotMatch(JSON.stringify(r), /Oduya/);
});
