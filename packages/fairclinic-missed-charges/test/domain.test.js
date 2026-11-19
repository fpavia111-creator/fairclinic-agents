// Missed charges: treatment sheet against invoice, by visit or by patient and date, with quantities and prices.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkCharges } from '../src/index.js';

const tr = (item, qty = 1, over = {}) => ({ visit_id: 'V1', patient_name: 'Rex', date: '2026-11-12', item, qty: String(qty), ...over });
const iv = (item, qty = 1, amount = 50, over = {}) => ({ invoice_number: 'I1', visit_id: 'V1', patient_name: 'Rex', date: '2026-11-12', item, qty: String(qty), amount: String(amount), ...over });
const st = (t, i, p = [], s = {}) => checkCharges(t, i, p, { settings: s }).items.map((x) => x.status);

test('a recorded item on the invoice is ok', () => { assert.deepEqual(st([tr('Exam')], [iv('Exam')]), ['ok']); });

test('an item missing from the invoice is valued from the price list', () => {
  const r = checkCharges([tr('Exam'), tr('Ear cytology', 2)], [iv('Exam')], [{ item: 'Ear cytology', price: '45' }]);
  assert.equal(r.not_invoiced, 1); assert.equal(r.missed_value, 90);
});

test('fewer units invoiced than recorded is short by the difference', () => {
  const r = checkCharges([tr('IV fluids', 3)], [iv('IV fluids', 1, 85)]);
  assert.equal(r.items[0].status, 'qty_short'); assert.equal(r.missed_value, 170);
});

test('matching ignores case and punctuation, and aliases join different wording', () => {
  assert.deepEqual(st([tr('exam, comprehensive')], [iv('Exam - Comprehensive')]), ['ok']);
  assert.deepEqual(st([tr('Fecal flotation')], [iv('Fecal test')], [], { item_aliases: { 'Fecal flotation': 'Fecal test' } }), ['ok']);
});

test('without visit ids, items are matched by patient and date', () => {
  const t = [tr('Exam', 1, { visit_id: '' })];
  assert.deepEqual(st(t, [iv('Exam', 1, 50, { visit_id: '' })]), ['ok']);
  assert.deepEqual(st(t, [iv('Exam', 1, 50, { visit_id: '', date: '2026-11-13' })]).sort(), ['invoiced_not_recorded', 'not_invoiced']);
});

test('a line at no charge is listed for a person to confirm', () => {
  const r = checkCharges([tr('Nail trim')], [iv('Nail trim', 1, 0, { note: 'N/C' })]);
  assert.equal(r.items[0].status, 'no_charge'); assert.match(r.items[0].detail, /N\/C/); assert.equal(r.missed_value, 0);
});

test('an invoiced item that is not on the record is listed; a zero-amount one is not', () => {
  assert.deepEqual(st([tr('Exam')], [iv('Exam'), iv('Heartworm test', 1, 55)]), ['invoiced_not_recorded', 'ok']);
  assert.deepEqual(st([tr('Exam')], [iv('Exam'), iv('Bandage', 1, 0)]), ['ok']);
});

test('the same item recorded twice in a visit is added up', () => {
  const r = checkCharges([tr('Injection'), tr('Injection')], [iv('Injection', 1, 30)]);
  assert.equal(r.items[0].recorded_qty, 2); assert.equal(r.items[0].status, 'qty_short'); assert.equal(r.missed_value, 30);
});

test('the list keeps pet and client names for the team; the result does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('charges_write_report', { treatments: 'fixtures/treatment-sheet.csv', invoices: 'fixtures/ezyvet-invoice-lines.csv', prices: 'fixtures/price-list.csv' });
  assert.match(readFileSync(`${root}/${r.result.files[0]}`, 'utf8'), /Tobias Achterberg/); assert.doesNotMatch(JSON.stringify(r), /Achterberg|Juniper/);
});
