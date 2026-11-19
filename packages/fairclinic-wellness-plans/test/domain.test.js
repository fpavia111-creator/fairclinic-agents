// Wellness plans: monthly charges, plan use against what is included, early cancellations.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkWellness } from '../src/index.js';

const settings = { plans: { Adult: { monthly_fee: 30, included: { Exam: 2, Vaccine: 3 } } }, service_prices: { Exam: 60, Vaccine: 30 } };
const enr = (over = {}) => ({ client_name: 'Owner', patient_name: 'Rex', plan: 'Adult', monthly_fee: '30', start_date: '2026-01-01', status: 'Active', cancel_date: '', ...over });
const pay = (over = {}) => ({ client_name: 'Owner', date: '2026-10-01', amount: '30', status: 'Succeeded', ...over });
const use = (service, qty = 1, date = '2026-03-01') => ({ patient_name: 'Rex', date, service, qty: String(qty) });
const run = (e, p, u = [], s = settings) => checkWellness([enr(e)], p, u, { month: '2026-10', settings: s, asOf: '2026-11-16' }).items[0];

test('paid at the plan fee and within the plan is ok', () => { assert.equal(run({}, [pay()], [use('Exam')]).status, 'ok'); });

test('missed, failed and wrong charges', () => {
  assert.equal(run({}, []).status, 'missed_payment');
  assert.equal(run({}, [pay({ status: 'Failed' })]).status, 'failed_not_retried');
  assert.equal(run({}, [pay({ amount: '25' })]).status, 'wrong_amount');
});

test('the plan fee comes from the settings when the enrollment has none', () => {
  assert.equal(run({ monthly_fee: '' }, [pay({ amount: '25' })]).status, 'wrong_amount');
});

test('use beyond what the plan includes is flagged and valued at list price', () => {
  const i = run({}, [pay()], [use('Exam', 3)]);
  assert.equal(i.status, 'over_used'); assert.match(i.findings[0].detail, /would be 60 at list price/);
});

test('service names match whatever the case', () => {
  assert.equal(run({}, [pay()], [use('EXAM', 2), use('vaccine', 3)]).status, 'ok');
});

test('an early cancellation with more used than paid shows the arithmetic, and only plan use counts', () => {
  const i = run({ status: 'Cancelled', cancel_date: '2026-04-30' }, [], [use('Exam', 2), use('Vaccine', 3), use('Exam', 1, '2026-06-01')]);
  assert.equal(i.status, 'early_cancel_balance'); assert.equal(i.months_enrolled, 4); assert.equal(i.fees_due, 120); assert.equal(i.used_value, 210);
});

test('a cancellation where the fees cover the use is fine', () => {
  assert.equal(run({ status: 'Cancelled', cancel_date: '2026-09-30' }, [], [use('Exam')]).status, 'ok');
});

test('an enrollment on a plan not in the settings is counted as unknown', () => {
  const r = checkWellness([enr({ plan: 'Senior' })], [pay()], [], { month: '2026-10', settings, asOf: '2026-11-16' });
  assert.equal(r.unknown_plans, 1);
});

test('the report keeps names for the team; the result does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('wellness_write_report', { enrollments: 'fixtures/enrollments.csv', payments: 'fixtures/payments-2026-10.csv', usage: 'fixtures/plan-usage.csv', settings: 'fixtures/settings.json', month: '2026-10', as_of: '2026-11-16' });
  assert.match(readFileSync(`${root}/${r.result.files[0]}`, 'utf8'), /Felix Oduya/); assert.doesNotMatch(JSON.stringify(r), /Oduya/);
});
