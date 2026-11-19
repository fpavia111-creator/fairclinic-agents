// Provider production: net production, collection and adjustment percents, drops, missing months and totals.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkProduction } from '../src/index.js';

const row = (month, gross = 10000, adj = 2500, coll = 7400, provider = 'Dr. One') => ({ provider, month, gross_production: String(gross), adjustments: String(adj), collections: String(coll) });
const months = (n, f = () => ({})) => Array.from({ length: n }, (_, i) => ({ ...row(`2026-0${i + 1}`), ...f(i) }));

test('net production, collection percent and adjustment percent are worked out per month', () => {
  const i = checkProduction([row('2026-01')]).items[0];
  assert.equal(i.net_production, 7500); assert.equal(i.collection_pct, 98.67); assert.equal(i.adjustment_pct, 25); assert.equal(i.status, 'ok');
});

test('collections below the target are flagged, and the target is a setting', () => {
  assert.equal(checkProduction([row('2026-01', 10000, 2500, 7000)]).items[0].status, 'low_collections');
  assert.equal(checkProduction([row('2026-01', 10000, 2500, 7000)], { settings: { collection_target_pct: 90 } }).items[0].status, 'ok');
});

test('high adjustments are flagged against the limit', () => {
  assert.equal(checkProduction([row('2026-01', 10000, 4000, 5900)]).items[0].status, 'high_adjustments');
});

test('a month far below the provider\'s other months is a drop; one provider is not compared with another', () => {
  const r = checkProduction([...months(3), row('2026-04', 6000, 1500, 4450), row('2026-04', 3000, 750, 2230, 'Hyg Two')]);
  const by = Object.fromEntries(r.items.map((i) => [`${i.provider}|${i.month}`, i.status]));
  assert.equal(by['Dr. One|2026-04'], 'production_drop'); assert.equal(by['Hyg Two|2026-04'], 'ok');
});

test('a gap between a provider\'s months is a missing month; months outside their range are not', () => {
  const r = checkProduction([row('2026-01'), row('2026-03'), row('2026-02', 10000, 2500, 7400, 'Dr. Two')]);
  assert.deepEqual(r.items.filter((i) => i.status === 'missing_month').map((i) => `${i.provider}|${i.month}`), ['Dr. One|2026-02']);
});

test('several rows for the same provider and month are added; adjustments written as minus are read as their size', () => {
  const r = checkProduction([row('2026-01', 6000, -1500, 4400), row('2026-01', 4000, 1000, 3000)]);
  assert.equal(r.items.length, 1); assert.equal(r.items[0].gross_production, 10000); assert.equal(r.items[0].adjustments, 2500);
});

test('months written as dates are grouped by month', () => {
  const r = checkProduction([row('2026-01-31'), row('2026-02-28')]);
  assert.deepEqual(r.items.map((i) => i.month), ['2026-01', '2026-02']);
});

test('totals per provider and overall leave missing months out', () => {
  const r = checkProduction([row('2026-01'), row('2026-03')]);
  assert.equal(r.by_provider[0].months, 2); assert.equal(r.gross_production, 20000); assert.equal(r.collection_pct, 98.67);
});

test('the report lists every provider-month with its status', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('production_write_report', { production: 'fixtures/production-by-provider.csv' });
  const csv = readFileSync(`${root}/${r.result.files[0]}`, 'utf8');
  assert.equal(csv.trim().split('\n').length, 17); assert.match(csv, /missing_month,Hana Test RDH,2026-09/);
});
