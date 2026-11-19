// Supply costs: percent of production, price increases, repeated lines and category spikes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkSupplies } from '../src/index.js';

const line = (over = {}) => ({ supplier: 'S', invoice_number: 'I1', date: '2026-08-05', item: 'Gloves', category: 'Infection control', qty: '10', unit_price: '10', amount: '100', ...over });

test('supplies as a percent of production per month, over target flagged', () => {
  const r = checkSupplies([line({ amount: '700', qty: '70' })], [{ month: '2026-08', production: '10000' }]);
  assert.equal(r.items[0].supply_pct, 7); assert.equal(r.items[0].status, 'over_target');
  assert.equal(checkSupplies([line({ amount: '700', qty: '70' })], [{ month: '2026-08', production: '10000' }], { settings: { target_pct: 8 } }).items[0].status, 'ok');
});

test('a unit price up more than the setting from the last one paid is flagged; a small rise is not', () => {
  const up = checkSupplies([line(), line({ invoice_number: 'I2', date: '2026-09-05', unit_price: '11.5', amount: '115' })]);
  assert.equal(up.by_finding.price_increase, 1);
  assert.equal(checkSupplies([line(), line({ invoice_number: 'I2', date: '2026-09-05', unit_price: '10.5', amount: '105' })]).by_finding.price_increase, undefined);
});

test('prices are compared within one supplier and item only', () => {
  const r = checkSupplies([line(), line({ supplier: 'T', invoice_number: 'J1', date: '2026-09-05', unit_price: '20', amount: '200' })]);
  assert.equal(r.by_finding.price_increase, undefined);
});

test('the same line twice on one invoice is flagged; two different lines are not', () => {
  assert.equal(checkSupplies([line(), line()]).by_finding.duplicate_line, 1);
  assert.equal(checkSupplies([line(), line({ item: 'Masks' })]).by_finding.duplicate_line, undefined);
});

test('the amount is worked out from quantity and unit price when it is missing', () => {
  assert.equal(checkSupplies([line({ amount: '' })]).supplies, 100);
});

test('a category far above its other months is a spike', () => {
  const r = checkSupplies([line(), line({ invoice_number: 'I2', date: '2026-09-05' }), line({ invoice_number: 'I3', date: '2026-10-05', qty: '20', amount: '200' })]);
  assert.equal(r.by_finding.category_spike, 1);
  assert.equal(checkSupplies([line(), line({ invoice_number: 'I2', date: '2026-09-05' }), line({ invoice_number: 'I3', date: '2026-10-05', qty: '20', amount: '200' })], [], { settings: { spike_pct: 250 } }).by_finding.category_spike, undefined);
});

test('lines without a category are grouped as uncategorised', () => {
  assert.equal(checkSupplies([line({ category: '' })]).by_category[0].category, 'Uncategorised');
});

test('months written as MM/YYYY in the production file are read', () => {
  assert.equal(checkSupplies([line()], [{ month: '08/2026', production: '10000' }]).supply_pct, 1);
});

test('the report has one row per month and per flagged line', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('supplies_write_report', { invoices: 'fixtures/supply-invoices.csv', production: 'fixtures/production-by-month.csv' });
  assert.equal(readFileSync(`${root}/${r.result.files[0]}`, 'utf8').trim().split('\n').length, 6);
});
