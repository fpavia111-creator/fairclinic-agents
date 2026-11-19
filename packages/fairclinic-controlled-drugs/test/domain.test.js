// Controlled drugs: balances worked out from entries, written balances, counts, waste, patients and initials.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkDrugs } from '../src/index.js';

const e = (date, type, qty, bal, over = {}) => ({ date, drug: 'Drug A', entry_type: type, quantity: String(qty), running_balance: bal === null ? '' : String(bal), patient_name: 'Rex', initials: 'AB', witness: '', ...over });
const count = (n) => [{ drug: 'Drug A', counted: String(n), count_date: '2026-11-15' }];
const drug = (r) => r.by_drug[0];

test('a log whose entries add up to the count is ok', () => {
  const r = checkDrugs([e('2026-11-01', 'Opening', 10, 10), e('2026-11-02', 'Administered', 1, 9)], count(9));
  assert.equal(drug(r).status, 'ok'); assert.equal(r.to_review, 0);
});

test('receipts add, use and waste subtract, adjustments keep their sign', () => {
  const r = checkDrugs([e('2026-11-01', 'Opening', 10, 10), e('2026-11-02', 'Received', 5, 15), e('2026-11-03', 'Wasted', 0.5, 14.5, { witness: 'CD', patient_name: '' }), e('2026-11-04', 'Adjustment', -0.5, 14)], count(14));
  assert.equal(drug(r).log_balance, 14); assert.equal(drug(r).status, 'ok');
});

test('an arithmetic error in a written balance is named, and the count is compared with the true balance', () => {
  const r = checkDrugs([e('2026-11-01', 'Opening', 10, 10), e('2026-11-02', 'Administered', 1, 8.8), e('2026-11-03', 'Administered', 1, 7.8)], count(7.8));
  assert.equal(r.by_status.balance_math, 1); assert.equal(drug(r).status, 'count_mismatch'); assert.equal(drug(r).log_balance, 8); assert.equal(drug(r).written_balance, 7.8);
});

test('without an opening row, the first balance is used as the starting point', () => {
  const r = checkDrugs([e('2026-11-02', 'Administered', 1, 9), e('2026-11-03', 'Administered', 1, 8)], count(8));
  assert.equal(drug(r).status, 'ok');
});

test('waste needs a witness unless the setting says otherwise; use needs a patient', () => {
  const rows = [e('2026-11-01', 'Opening', 10, 10), e('2026-11-02', 'Wasted', 1, 9, { patient_name: '' }), e('2026-11-03', 'Administered', 1, 8, { patient_name: '' })];
  assert.deepEqual(Object.keys(checkDrugs(rows, count(8)).by_status).sort(), ['no_patient', 'ok', 'waste_no_witness']);
  assert.equal(checkDrugs(rows, count(8), { settings: { waste_needs_witness: false } }).by_status.waste_no_witness, undefined);
});

test('an entry without initials is listed', () => {
  assert.equal(checkDrugs([e('2026-11-01', 'Opening', 10, 10), e('2026-11-02', 'Administered', 1, 9, { initials: '' })], count(9)).by_status.missing_initials, 1);
});

test('a drug missing from the count file is no_count', () => {
  assert.equal(drug(checkDrugs([e('2026-11-01', 'Opening', 10, 10)], [])).status, 'no_count');
});

test('rows out of date order are read in date order', () => {
  const r = checkDrugs([e('2026-11-03', 'Administered', 1, 8), e('2026-11-01', 'Opening', 10, 10), e('2026-11-02', 'Administered', 1, 9)], count(8));
  assert.equal(r.to_review, 0);
});

test('the report keeps pet and client names for the registrant; the result does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('drugs_write_report', { log: 'fixtures/controlled-log.csv', counts: 'fixtures/counts.csv' });
  const csv = readFileSync(`${root}/${r.result.files[0]}`, 'utf8');
  assert.match(csv, /Mochi/); assert.doesNotMatch(JSON.stringify(r), /Mochi/);
});
