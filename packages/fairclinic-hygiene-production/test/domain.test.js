// Hygiene production: per worked hour, open time, periodontal share and production with no hours.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkHygiene } from '../src/index.js';

const hrs = (date = '2026-11-02', sched = 8, open = 0, h = 'H1') => ({ hygienist: h, date, scheduled_hours: String(sched), open_hours: String(open) });
const proc = (code, qty, fee, date = '2026-11-02', h = 'H1') => ({ hygienist: h, date, code, qty: String(qty), fee: String(fee) });

test('production per worked hour uses scheduled minus open hours', () => {
  const i = checkHygiene([hrs('2026-11-02', 8, 2)], [proc('D1110', 9, 120)]).items[0];
  assert.equal(i.worked_hours, 6); assert.equal(i.production_per_hour, 180); assert.equal(i.status, 'open_time');
});

test('below the hourly target is flagged and the target is a setting', () => {
  assert.equal(checkHygiene([hrs()], [proc('D1110', 9, 120)]).items[0].status, 'below_target');
  assert.equal(checkHygiene([hrs()], [proc('D1110', 9, 120)], { settings: { target_per_hour: 130 } }).items[0].status, 'ok');
});

test('a missing quantity counts as one', () => {
  assert.equal(checkHygiene([hrs()], [{ hygienist: 'H1', date: '2026-11-02', code: 'D1110', fee: '1200' }]).items[0].production, 1200);
});

test('production on a day with no hours is left out of the hourly figure and named', () => {
  const i = checkHygiene([hrs()], [proc('D1110', 10, 120), proc('D1110', 2, 120, '2026-11-03')]).items[0];
  assert.equal(i.status, 'no_hours'); assert.equal(i.production_per_hour, 150); assert.equal(i.production, 1440);
});

test('the periodontal share counts periodontal codes among periodontal visits and cleanings', () => {
  const i = checkHygiene([hrs()], [proc('D1110', 6, 120), proc('D4910', 2, 165), proc('D4341', 2, 310), proc('D1206', 5, 55)]).items[0];
  assert.equal(i.perio_visits, 4); assert.equal(i.prophy_visits, 6); assert.equal(i.perio_share_pct, 40);
  assert.equal(checkHygiene([hrs()], [proc('D1110', 6, 120), proc('D4910', 2, 165)], { settings: { perio_codes: ['D4341'] } }).items[0].perio_share_pct, 0);
});

test('open time is flagged above the limit only', () => {
  assert.equal(checkHygiene([hrs('2026-11-02', 8, 1)], [proc('D1110', 12, 120)]).items[0].status, 'ok');
  assert.equal(checkHygiene([hrs('2026-11-02', 8, 1)], [proc('D1110', 12, 120)], { settings: { open_time_pct: 10 } }).items[0].status, 'open_time');
});

test('several hours rows for the same day are added together', () => {
  const i = checkHygiene([hrs('2026-11-02', 4), hrs('2026-11-02', 4)], [proc('D1110', 10, 120)]).items[0];
  assert.equal(i.days, 1); assert.equal(i.scheduled_hours, 8);
});

test('a hygienist with hours and no production is listed with zero', () => {
  const r = checkHygiene([hrs(), hrs('2026-11-02', 8, 0, 'H2')], [proc('D1110', 10, 120)]);
  assert.equal(r.items[1].production, 0); assert.equal(r.items[1].status, 'below_target');
});

test('the report has one row per hygienist', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('hygiene_write_report', { hours: 'fixtures/hygiene-hours.csv', procedures: 'fixtures/hygiene-procedures.csv' });
  assert.equal(readFileSync(`${root}/${r.result.files[0]}`, 'utf8').trim().split('\n').length, 4);
});
