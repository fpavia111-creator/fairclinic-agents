// Recall gaps: overdue, missed visits, due soon, lapsed, contacted, inactive and reappointment rates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkRecall } from '../src/index.js';

const rec = (over = {}) => ({ patient_name: 'Pat One', recall_type: 'Prophy', due_date: '2026-10-01', next_appointment: '', hygienist: 'Hana Test', last_contact: '', status: 'Active', ...over });
const st = (over, opts = {}) => checkRecall([rec(over)], [], { asOf: '2026-11-16', ...opts }).items[0].status;

test('overdue and not booked is overdue; booked in the future is scheduled', () => {
  assert.equal(st({}), 'overdue');
  assert.equal(st({ next_appointment: '2026-11-30' }), 'scheduled');
});

test('a booked date that has passed while the recall is still open is a missed visit', () => {
  assert.equal(st({ next_appointment: '2026-11-02' }), 'missed_appointment');
  assert.equal(st({ due_date: '2026-12-10', next_appointment: '2026-11-02' }), 'due_soon');
});

test('a recent contact leaves an overdue patient waiting; an old contact does not', () => {
  assert.equal(st({ last_contact: '2026-11-10' }), 'contacted');
  assert.equal(st({ last_contact: '2026-09-01' }), 'overdue');
  assert.equal(st({ last_contact: '2026-11-01' }, { settings: { recontact_days: 10 } }), 'overdue');
});

test('long overdue patients go on the reactivation list; the months come from the settings', () => {
  assert.equal(st({ due_date: '2025-01-01' }), 'lapsed');
  assert.equal(st({ due_date: '2025-01-01' }, { settings: { lapsed_months: 36 } }), 'overdue');
});

test('due within the window and not booked is due soon; later is not due', () => {
  assert.equal(st({ due_date: '2026-12-01' }), 'due_soon');
  assert.equal(st({ due_date: '2027-02-01' }), 'not_due');
  assert.equal(st({ due_date: '2026-12-01' }, { settings: { due_soon_days: 10 } }), 'not_due');
});

test('inactive patients are listed but not counted for contact', () => {
  const r = checkRecall([rec({ status: 'Inactive', due_date: '2024-01-01' })], [], { asOf: '2026-11-16' });
  assert.equal(r.items[0].status, 'inactive'); assert.equal(r.to_contact, 0); assert.equal(r.booked_pct, 0);
});

test('reappointment counts a visit only when the next visit is after it', () => {
  const v = [{ patient_name: 'A', visit_date: '2026-11-02', hygienist: 'H', next_appointment: '2027-05-01' }, { patient_name: 'B', visit_date: '2026-11-02', hygienist: 'H', next_appointment: '' }, { patient_name: 'C', visit_date: '2026-11-03', hygienist: 'H', next_appointment: '2026-11-01' }];
  const r = checkRecall([rec()], v, { asOf: '2026-11-16' });
  assert.deepEqual(r.hygienists[0], { hygienist: 'H', visits: 3, reappointed: 1, rate_pct: 33.33, status: 'below_target', left_without: 2 });
  assert.equal(r.reappointment_pct, 33.33);
});

test('the worst gaps come first: missed visits, then the most overdue', () => {
  const r = checkRecall([rec({ patient_name: 'A', due_date: '2026-11-01' }), rec({ patient_name: 'B', due_date: '2026-08-01' }), rec({ patient_name: 'C', next_appointment: '2026-11-05' })], [], { asOf: '2026-11-16' });
  assert.deepEqual(r.items.map((i) => i.patient_name), ['C', 'B', 'A']);
});

test('the call list keeps real names and leaves out booked patients; the result does not show names', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('recall_write_report', { recall: 'fixtures/recall.csv', visits: 'fixtures/hygiene-visits.csv', as_of: '2026-11-16' });
  assert.equal(r.status, 'executed', r.reason);
  const csv = readFileSync(`${root}/${r.result.files[0]}`, 'utf8');
  assert.match(csv, /Lucia Fontaine/); assert.doesNotMatch(csv, /Rowan Achebe|Omar Brightwater/); assert.doesNotMatch(JSON.stringify(r), /Fontaine/);
});
