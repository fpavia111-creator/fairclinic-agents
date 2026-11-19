// Boarding and grooming: nights and days against units invoiced, add-ons, missing invoices and cancellations.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkBoarding } from '../src/index.js';

const res = (over = {}) => ({ reservation_id: 'R1', patient_name: 'Rex', service: 'Boarding', check_in: '2026-11-01', check_out: '2026-11-04', add_ons: '', status: 'Completed', ...over });
const line = (item, qty = 1, over = {}) => ({ reservation_id: 'R1', item, qty: String(qty), amount: '0', ...over });
const one = (r, l, settings = {}) => checkBoarding([res(r)], l, { settings }).items[0];

test('three nights invoiced for a three-night stay is ok', () => { assert.equal(one({}, [line('Boarding (per night)', 3)]).status, 'ok'); });

test('fewer nights invoiced than stayed is short, valued at the nightly price', () => {
  const i = one({}, [line('Boarding (per night)', 2)], { prices: { 'Boarding (per night)': 45 } });
  assert.equal(i.status, 'nights_short'); assert.equal(i.missed_value, 45);
});

test('a reservation with no invoice lines is not invoiced', () => {
  const i = one({ service: 'Grooming - full', check_out: '2026-11-01' }, [], { prices: { 'Grooming - full': 75 } });
  assert.equal(i.status, 'not_invoiced'); assert.equal(i.missed_value, 75);
});

test('daycare counts days, check in to check out inclusive', () => {
  assert.equal(one({ service: 'Daycare', check_out: '2026-11-02' }, [line('Daycare', 1)]).status, 'nights_short');
  assert.equal(one({ service: 'Daycare', check_out: '2026-11-02' }, [line('Daycare', 2)]).status, 'ok');
});

test('each booked add-on must appear on the invoice, in any case', () => {
  const i = one({ add_ons: 'Bath; Nail trim' }, [line('Boarding (per night)', 3), line('BATH')]);
  assert.equal(i.status, 'addon_not_invoiced'); assert.equal(i.findings.length, 1); assert.match(i.findings[0].detail, /Nail trim/);
});

test('cancelled reservations are left out', () => {
  const r = checkBoarding([res({ status: 'Cancelled' })], []);
  assert.equal(r.items[0].status, 'cancelled'); assert.equal(r.to_review, 0);
});

test('prices match an item name inside a longer name', () => {
  assert.equal(one({ add_ons: 'Exit bath' }, [line('Boarding (per night)', 3)], { prices: { 'Exit bath - large dog': 40 } }).missed_value, 40);
});

test('a missing check-out counts one night', () => {
  assert.equal(one({ check_out: '' }, [line('Boarding', 1)]).status, 'ok');
});

test('the report keeps names for the front desk; the result does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('boarding_write_report', { reservations: 'fixtures/reservations.csv', invoices: 'fixtures/shepherd-invoice-items.csv', settings: 'fixtures/settings.json' });
  assert.match(readFileSync(`${root}/${r.result.files[0]}`, 'utf8'), /Ines Mwangi/); assert.doesNotMatch(JSON.stringify(r), /Mwangi/);
});
