// No-shows: missed and late-cancelled visits, rebooking, repeats, fees and rates by provider.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkNoShows } from '../src/index.js';

const ap = (over = {}) => ({ appointment_id: 'A1', patient_name: 'Pat', provider: 'Dr. One', date: '2026-11-05', status: 'Completed', cancelled_on: '', rebooked: '', fee_charged: '', scheduled_value: '100', ...over });
const one = (over, settings = {}) => checkNoShows([ap(over)], { settings }).items[0];

test('a kept appointment is ok', () => { const i = one({}); assert.equal(i.status, 'ok'); assert.equal(i.outcome, 'kept'); });

test('a no-show not rebooked is followed up; rebooked it is fine', () => {
  assert.equal(one({ status: 'No-show' }).status, 'no_show_not_rebooked');
  assert.equal(one({ status: 'Missed', rebooked: '2026-11-20' }).status, 'ok');
});

test('a cancellation inside the late window and not rebooked is followed up; an early one is not', () => {
  assert.equal(one({ status: 'Cancelled', cancelled_on: '2026-11-04' }).status, 'late_cancel_not_rebooked');
  assert.equal(one({ status: 'Cancelled', cancelled_on: '2026-11-01' }).status, 'ok');
  assert.equal(one({ status: 'Cancelled', cancelled_on: '2026-11-04' }, { late_cancel_days: 1 }).status, 'ok');
});

test('the second no-show for the same patient is a repeat, in date order', () => {
  const r = checkNoShows([ap({ appointment_id: 'B', date: '2026-11-10', status: 'No-show', rebooked: '2026-12-01' }), ap({ appointment_id: 'A', status: 'No-show', rebooked: '2026-11-20' })]);
  assert.deepEqual(r.items.map((i) => [i.appointment_id, i.status]), [['B', 'repeat_no_show'], ['A', 'ok']]);
});

test('a no-show fee in the policy that was not charged is listed; one that was charged is not', () => {
  assert.equal(one({ status: 'No-show', rebooked: '2026-11-20' }, { no_show_fee: 25 }).status, 'fee_not_charged');
  assert.equal(one({ status: 'No-show', rebooked: '2026-11-20', fee_charged: '25' }, { no_show_fee: 25 }).status, 'ok');
});

test('rates and lost value count no-shows and late cancellations', () => {
  const r = checkNoShows([ap(), ap({ appointment_id: 'A2', status: 'No-show' }), ap({ appointment_id: 'A3', status: 'Cancelled', cancelled_on: '2026-11-05' }), ap({ appointment_id: 'A4', status: 'Cancelled', cancelled_on: '2026-10-01' })]);
  assert.equal(r.no_show_pct, 25); assert.equal(r.late_cancel_pct, 25); assert.equal(r.unfilled_value, 200);
});

test('rates by provider, highest first', () => {
  const r = checkNoShows([ap(), ap({ appointment_id: 'A2', provider: 'Hyg', status: 'No-show' }), ap({ appointment_id: 'A3', provider: 'Hyg' })]);
  assert.deepEqual(r.by_provider.map((p) => [p.provider, p.no_show_pct]), [['Hyg', 50], ['Dr. One', 0]]);
});

test('rows without an id or a date are skipped', () => { assert.equal(checkNoShows([ap({ appointment_id: '' }), ap({ date: '' })]).appointments, 0); });

test('the call list keeps patient names for the front desk; the result does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('noshows_write_report', { appointments: 'fixtures/appointments.csv', settings: 'fixtures/settings.json' });
  assert.match(readFileSync(`${root}/${r.result.files[0]}`, 'utf8'), /Marisol Quintero/); assert.doesNotMatch(JSON.stringify(r), /Quintero/);
});
