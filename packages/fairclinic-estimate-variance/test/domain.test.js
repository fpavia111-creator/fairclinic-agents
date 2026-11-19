// Estimate variance: over the high, under the low, approved and never invoiced, invoiced without approval.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkEstimates } from '../src/index.js';

const est = (over = {}) => ({ estimate_id: 'E1', patient_name: 'Rex', date: '2026-11-01', low: '400', high: '500', approved: 'Yes', ...over });
const st = (e, total, settings = {}) => checkEstimates([est(e)], total === null ? [] : [{ estimate_id: 'E1', total: String(total) }], { settings, asOf: '2026-11-16' }).items[0];

test('an invoice inside the range is ok', () => { assert.equal(st({}, 450).status, 'ok'); });

test('above the high estimate by more than the setting is flagged with the percent', () => {
  const i = st({}, 600); assert.equal(i.status, 'over_high'); assert.equal(i.variance_pct, 20);
  assert.equal(st({}, 540).status, 'ok'); assert.equal(st({}, 540, { over_pct: 5 }).status, 'over_high');
});

test('well below the low estimate is flagged', () => {
  assert.equal(st({}, 300).status, 'under_low'); assert.equal(st({}, 330).status, 'ok');
});

test('an approved estimate with no invoice is flagged only after the stale days', () => {
  assert.equal(st({ date: '2026-10-01' }, null).status, 'not_invoiced');
  assert.equal(st({ date: '2026-11-10' }, null).status, 'open');
});

test('an invoice on a declined estimate is flagged first', () => { assert.equal(st({ approved: 'Declined' }, 450).status, 'invoiced_without_approval'); });

test('several invoices on one estimate are added together', () => {
  const r = checkEstimates([est()], [{ estimate_id: 'E1', total: '300' }, { estimate_id: 'E1', total: '300' }], { asOf: '2026-11-16' });
  assert.equal(r.items[0].invoiced, 600); assert.equal(r.items[0].status, 'over_high');
});

test('a single-figure estimate uses it as low and high', () => {
  assert.equal(st({ low: '' }, 520).status, 'ok'); assert.equal(st({ low: '' }, 380).status, 'under_low');
});

test('the amount above estimate adds up the excess over the high figures', () => {
  const r = checkEstimates([est(), est({ estimate_id: 'E2' })], [{ estimate_id: 'E1', total: '600' }, { estimate_id: 'E2', total: '700' }], { asOf: '2026-11-16' });
  assert.equal(r.above_estimate, 300);
});

test('the report keeps names for the team; the result does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('estimates_write_report', { estimates: 'fixtures/estimates.csv', invoices: 'fixtures/invoices.csv', as_of: '2026-11-16' });
  assert.match(readFileSync(`${root}/${r.result.files[0]}`, 'utf8'), /Tobias Achterberg/); assert.doesNotMatch(JSON.stringify(r), /Achterberg/);
});

test('invoice numbers are listed once each and at most ten are shown (one row per invoice line repeats them)', () => {
  const est = [{ estimate_id: 'E1', low: '100', high: '200', approved: 'Yes', date: '2026-11-01' }];
  const lines = [...Array.from({ length: 30 }, () => ({ estimate_id: 'E1', invoice_number: 'INV-1', total: '1' })), ...Array.from({ length: 12 }, (_, i) => ({ estimate_id: 'E1', invoice_number: `INV-${i + 2}`, total: '10' }))];
  const i = checkEstimates(est, lines, { asOf: '2026-11-16' }).items[0];
  assert.equal(i.invoiced, 150);
  assert.match(i.invoice_numbers, /^INV-1 INV-2 .* and 3 more$/);
  assert.equal(i.invoice_numbers.split(' ').filter((x) => x === 'INV-1').length, 1);
});
