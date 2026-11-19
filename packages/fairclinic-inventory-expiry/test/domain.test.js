// Inventory expiry: expired and expiring lots, missing expiry dates, shrink and overage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkInventory } from '../src/index.js';

const lot = (over = {}) => ({ item: 'Drug A', lot: 'L1', expiry: '2027-06-01', on_hand: '10', unit_cost: '5', ...over });
const cnt = (over = {}) => ({ item: 'Drug A', opening: '10', received: '5', used: '3', counted: '12', unit_cost: '5', ...over });
const st = (s, c = [], opts = {}) => checkInventory(s ? [lot(s)] : [], c, { asOf: '2026-11-16', ...opts }).items[0];

test('a lot well inside its date is ok', () => { assert.equal(st({}).status, 'ok'); });

test('expired with stock on hand is valued at cost; an empty expired lot is not listed', () => {
  const i = st({ expiry: '2026-11-01' }); assert.equal(i.status, 'expired'); assert.equal(i.value, 50);
  assert.equal(st({ expiry: '2026-11-01', on_hand: '0' }).status, 'ok');
});

test('expiring within the window, and the window is a setting', () => {
  assert.equal(st({ expiry: '2026-12-31' }).status, 'expiring');
  assert.equal(st({ expiry: '2026-12-31' }, [], { settings: { expiring_days: 30 } }).status, 'ok');
});

test('stock with no expiry date is listed', () => { assert.equal(st({ expiry: '' }).status, 'no_expiry_date'); });

test('shrink is opening plus received minus used against the count, valued at cost', () => {
  const i = checkInventory([], [cnt({ counted: '10' })], { asOf: '2026-11-16' }).items[0];
  assert.equal(i.status, 'shrink'); assert.equal(i.expected, 12); assert.equal(i.difference, -2); assert.equal(i.value, 10);
});

test('more counted than expected is an overage; the tolerance absorbs small differences', () => {
  assert.equal(checkInventory([], [cnt({ counted: '13' })], { asOf: '2026-11-16' }).items[0].status, 'overage');
  assert.equal(checkInventory([], [cnt({ counted: '11' })], { asOf: '2026-11-16', settings: { count_tolerance: 1 } }).items[0].status, 'ok');
});

test('the unit cost of a counted item falls back to the stock file', () => {
  assert.equal(checkInventory([lot()], [cnt({ counted: '11', unit_cost: '' })], { asOf: '2026-11-16' }).items[0].value, 5);
});

test('the soonest expiry comes first within a status', () => {
  const r = checkInventory([lot({ lot: 'B', expiry: '2026-12-30' }), lot({ lot: 'A', expiry: '2026-11-30' })], [], { asOf: '2026-11-16' });
  assert.deepEqual(r.items.map((i) => i.lot), ['A', 'B']);
});

test('the report lists only what needs a person', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('inventory_write_report', { stock: 'fixtures/stock-on-hand.csv', counts: 'fixtures/count-sheet.csv', as_of: '2026-11-16' });
  assert.equal(readFileSync(`${root}/${r.result.files[0]}`, 'utf8').trim().split('\n').length, 8);
});
