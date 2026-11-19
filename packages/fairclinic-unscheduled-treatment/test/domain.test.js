// Unscheduled treatment: per-patient totals, benefits ending, stale plans and the patient letter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkTreatment, letterText } from '../src/index.js';

const row = (over = {}) => ({ patient_name: 'Pat One', provider: 'Dr. Example', code: 'D2740', fee: '1000', est_insurance: '500', status: 'Accepted', date_planned: '2026-10-01', scheduled_date: '', remaining_benefit: '', ...over });
const check = (rows, opts = {}) => checkTreatment(rows, { asOf: '2026-11-16', ...opts });

test('accepted treatment not booked is grouped per patient and added up', () => {
  const r = check([row(), row({ code: 'D2950', fee: '300' })]);
  assert.equal(r.patients, 1); assert.equal(r.items[0].unscheduled_accepted, 1300); assert.equal(r.items[0].status, 'accepted_unscheduled');
});

test('a booked line or a completed line is not unscheduled', () => {
  assert.equal(check([row({ scheduled_date: '2026-12-01' })]).items[0].status, 'scheduled');
  assert.equal(check([row({ status: 'Completed' })]).items[0].status, 'done');
  assert.equal(check([row({ status: 'Declined' })]).items[0].status, 'declined');
});

test('remaining benefits are flagged only near the end of the benefit year', () => {
  assert.equal(check([row({ remaining_benefit: '800' })]).items[0].status, 'benefits_expiring');
  assert.equal(check([row({ remaining_benefit: '800' })], { asOf: '2026-08-01' }).items[0].status, 'accepted_unscheduled');
  assert.equal(check([row({ remaining_benefit: '0' })]).items[0].status, 'accepted_unscheduled');
});

test('a benefit year that ends on another date is read from the file', () => {
  const r = check([row({ remaining_benefit: '800', benefit_year_end: '2027-03-31' })]).items[0];
  assert.equal(r.status, 'accepted_unscheduled'); assert.equal(r.benefit_year_end, '2027-03-31');
  assert.equal(check([row({ remaining_benefit: '800', benefit_year_end: '2026-12-15' })]).items[0].status, 'benefits_expiring');
});

test('an old plan is set aside for the dentist, not counted as accepted', () => {
  const r = check([row({ date_planned: '2025-06-01' })]);
  assert.equal(r.items[0].status, 'stale'); assert.equal(r.unscheduled_accepted, 0); assert.equal(r.items[0].stale_value, 1000);
  assert.equal(check([row({ date_planned: '2025-06-01' })], { settings: { stale_days: 730 } }).items[0].status, 'accepted_unscheduled');
});

test('proposed treatment is kept apart from accepted treatment', () => {
  const r = check([row({ status: 'Proposed' }), row({ patient_name: 'Pat Two' })]);
  assert.equal(r.unscheduled_proposed, 1000); assert.equal(r.unscheduled_accepted, 1000); assert.equal(r.to_call, 2);
});

test('the minimum value setting leaves small balances off the call list', () => {
  assert.equal(check([row({ fee: '90' })], { settings: { min_value: 100 } }).patients, 0);
  assert.equal(check([row({ fee: '90' })]).patients, 1);
});

test('the letter lists the open lines, gives estimates as estimates and never tells the patient what care to have', () => {
  const i = check([row({ remaining_benefit: '800' }), row({ code: 'D1110', fee: '120', status: 'Completed' })]).items[0];
  const d = letterText(i, { practice: 'Example Dental (fictional)' });
  assert.equal(d.total, 1000); assert.match(d.text, /D2740/); assert.doesNotMatch(d.text, /D1110/);
  assert.match(d.text, /your plan decides what it pays/); assert.doesNotMatch(d.text, /\byou (need|should|must)\b/i);
  assert.match(d.text, /\[TO CONFIRM mailing address/);
});

test('the call list keeps real names; the draft summary the model sees does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('treatment_write_report', { plans: 'fixtures/treatment-plans.csv', as_of: '2026-11-16' });
  assert.match(readFileSync(`${root}/${r.result.files[0]}`, 'utf8'), /Omar Brightwater/);
  const d = await call('treatment_draft_patient_letter', { plans: 'fixtures/treatment-plans.csv', as_of: '2026-11-16', patient: 'Omar Brightwater' });
  assert.equal(d.status, 'executed', d.reason); assert.doesNotMatch(JSON.stringify(d), /Brightwater/);
  assert.match(readFileSync(d.result.file, 'utf8'), /Dear Omar Brightwater/);
});
