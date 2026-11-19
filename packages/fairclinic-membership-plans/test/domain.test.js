// Membership plans: monthly charges, failures, amounts, cancellations, annual renewals, use after lapse, roster.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkMemberships } from '../src/index.js';

const mem = (over = {}) => ({ patient_name: 'Pat One', plan: 'Adult', fee: '29', billing: 'Monthly', start_date: '2026-01-01', status: 'Active', cancel_date: '', renewal_date: '', ...over });
const pay = (over = {}) => ({ patient_name: 'Pat One', date: '2026-10-15', amount: '29', status: 'Succeeded', ...over });
const run = (members, payments, visits = [], opts = {}) => checkMemberships(members, payments, visits, { month: '2026-10', asOf: '2026-11-16', ...opts });
const st = (m, p, v) => run([mem(m)], p, v).items[0].status;

test('a monthly member charged the plan fee in the month is ok', () => { assert.equal(st({}, [pay()]), 'ok'); });

test('no charge is missed; a failed charge that was retried and paid later in the month is fine', () => {
  assert.equal(st({}, []), 'missed_payment');
  assert.equal(st({}, [pay({ status: 'Failed', date: '2026-10-10' })]), 'failed_not_retried');
  assert.equal(st({}, [pay({ status: 'Failed', date: '2026-10-10' }), pay({ date: '2026-10-13' })]), 'ok');
});

test('a charge that differs from the plan fee is flagged; the tolerance setting applies', () => {
  assert.equal(st({}, [pay({ amount: '25' })]), 'wrong_amount');
  assert.equal(run([mem()], [pay({ amount: '28.5' })], [], { settings: { tolerance: 1 } }).items[0].status, 'ok');
});

test('a charge after the cancel date is for a person to decide on; a member who cancelled before the month is not missed', () => {
  assert.equal(st({ status: 'Cancelled', cancel_date: '2026-09-30' }, [pay()]), 'billed_after_cancel');
  assert.equal(st({ status: 'Cancelled', cancel_date: '2026-09-30' }, []), 'ok');
  assert.equal(st({ status: 'Cancelled', cancel_date: '2026-10-20' }, [pay()]), 'ok');
});

test('a member who joins during the month is expected to pay that month', () => {
  assert.equal(st({ start_date: '2026-10-20', fee: '19' }, [pay({ amount: '19', date: '2026-10-20' })]), 'ok');
  assert.equal(st({ start_date: '2026-11-02' }, []), 'ok');
});

test('annual plans: renewal due soon, lapsed without payment, renewed when paid', () => {
  assert.equal(st({ billing: 'Annual', fee: '329', renewal_date: '2026-12-01' }, []), 'renewal_due');
  assert.equal(st({ billing: 'Annual', fee: '329', renewal_date: '2026-10-05' }, []), 'annual_lapsed');
  assert.equal(st({ billing: 'Annual', fee: '329', renewal_date: '2026-10-05' }, [pay({ amount: '329', date: '2026-10-06' })]), 'ok');
});

test('a visit after a membership ended is flagged with the discount', () => {
  const r = run([mem({ status: 'Cancelled', cancel_date: '2026-08-31' })], [], [{ patient_name: 'Pat One', date: '2026-10-08', code: 'D1110', discount: '24' }]).items[0];
  assert.equal(r.status, 'used_after_lapse'); assert.match(r.findings[0].detail, /24 member discount/);
});

test('a charge for someone not on the roster is listed; names match whatever the case and spacing', () => {
  const r = run([mem()], [pay({ patient_name: 'PAT  one' }), pay({ patient_name: 'Someone Else' })]);
  assert.deepEqual(r.items.map((i) => i.status), ['not_in_roster', 'ok']);
});

test('the billing list keeps names for the team; the result does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('membership_write_report', { members: 'fixtures/members.csv', payments: 'fixtures/payments-2026-10.csv', month: '2026-10', as_of: '2026-11-16' });
  assert.match(readFileSync(`${root}/${r.result.files[0]}`, 'utf8'), /Dmitri Okonkwo/); assert.doesNotMatch(JSON.stringify(r), /Okonkwo/);
});
