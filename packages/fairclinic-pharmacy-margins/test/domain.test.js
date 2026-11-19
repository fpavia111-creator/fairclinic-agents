// Pharmacy margins: below cost, cost rises, margins under target, dispensing fees and gaps on quantities sold.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkPharmacy } from '../src/index.js';

const item = (over = {}) => ({ item: 'Tab A', item_type: 'Rx', cost: '1', previous_cost: '1', price: '2', previous_price: '2', dispensing_fee: '10', ...over });
const one = (over, sales = [], settings = {}) => checkPharmacy([item(over)], sales, { settings }).items[0];

test('an item at a 50% margin with a fee is ok', () => { const i = one({}); assert.equal(i.status, 'ok'); assert.equal(i.margin_pct, 50); });

test('a price below cost is flagged first, with the loss on quantities sold', () => {
  const i = one({ price: '0.8', previous_price: '0.8' }, [{ item: 'Tab A', qty: '100' }]);
  assert.equal(i.status, 'below_cost'); assert.match(i.findings[0].detail, /100 sold lose 20/);
});

test('a cost rise with an unchanged price is flagged; a rise passed on is not', () => {
  assert.equal(one({ cost: '1.2', previous_cost: '1' }).status, 'cost_rise_not_passed');
  assert.equal(one({ cost: '1.2', previous_cost: '1', price: '2.4' }).status, 'ok');
  assert.equal(one({ cost: '1.04', previous_cost: '1' }).status, 'ok');
});

test('a margin under target is flagged with the target price, and the target is a setting', () => {
  const i = one({ price: '1.5', previous_price: '1.5' }); assert.equal(i.status, 'low_margin'); assert.match(i.findings[0].detail, /about 1.82/);
  assert.equal(one({ price: '1.5', previous_price: '1.5' }, [], { target_margin_pct: 30 }).status, 'ok');
});

test('the gap to target uses the quantities sold, matched by item name in any case', () => {
  const i = one({ price: '1.5', previous_price: '1.5' }, [{ item: 'TAB A', qty: '100' }]);
  assert.equal(i.gap_to_target, 31.82);
});

test('prescription items need a dispensing fee unless the setting says not; over-the-counter items do not', () => {
  assert.equal(one({ dispensing_fee: '' }).status, 'no_dispensing_fee');
  assert.equal(one({ dispensing_fee: '' }, [], { rx_needs_fee: false }).status, 'ok');
  assert.equal(one({ dispensing_fee: '', item_type: 'OTC' }).status, 'ok');
});

test('the average margin covers priced items', () => {
  const r = checkPharmacy([item(), item({ item: 'B', price: '4', previous_price: '4' })]);
  assert.equal(r.average_margin_pct, 62.5);
});

test('items with the largest gap come first within a status', () => {
  const r = checkPharmacy([item({ item: 'Small', price: '1.5', previous_price: '1.5' }), item({ item: 'Big', price: '1.5', previous_price: '1.5' })], [{ item: 'Small', qty: '10' }, { item: 'Big', qty: '1000' }]);
  assert.deepEqual(r.items.map((i) => i.item), ['Big', 'Small']);
});

test('the report lists only items to review', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('pharmacy_write_report', { prices: 'fixtures/pharmacy-prices.csv', sales: 'fixtures/sales-month.csv' });
  assert.equal(readFileSync(`${root}/${r.result.files[0]}`, 'utf8').trim().split('\n').length, 5);
});
