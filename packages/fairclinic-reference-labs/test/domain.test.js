// Reference labs: each send-out test against the client charge for the same pet, date and item.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkSendouts } from '../src/index.js';

const lab = (over = {}) => ({ accession: 'A1', date: '2026-11-02', patient_name: 'Rex', test: 'Chem panel', lab_cost: '40', ...over });
const ch = (over = {}) => ({ patient_name: 'Rex', date: '2026-11-02', item: 'Chem panel', amount: '100', ...over });
const st = (l, c, settings = {}) => checkSendouts([lab(l)], c, { settings }).items.map((i) => i.status);

test('a test charged at more than twice cost is ok', () => { assert.deepEqual(st({}, [ch()]), ['ok']); });

test('no charge for the pet near the date is not charged; the window is a setting', () => {
  assert.deepEqual(st({}, []), ['not_charged']);
  assert.deepEqual(st({}, [ch({ date: '2026-11-08' })]), ['not_charged']);
  assert.deepEqual(st({}, [ch({ date: '2026-11-08' })], { match_days: 7 }), ['ok']);
});

test('below cost and under the markup rule are flagged', () => {
  assert.deepEqual(st({}, [ch({ amount: '35' })]), ['charged_below_cost']);
  assert.deepEqual(st({}, [ch({ amount: '60' })]), ['low_markup']);
  assert.deepEqual(st({}, [ch({ amount: '60' })], { min_markup: 1.5 }), ['ok']);
});

test('the test map joins names that differ between the lab and the invoice', () => {
  assert.deepEqual(st({ test: 'HW Ag' }, [ch({ item: 'Heartworm antigen test' })]), ['not_charged']);
  assert.deepEqual(st({ test: 'HW Ag' }, [ch({ item: 'Heartworm antigen test' })], { test_map: { 'HW Ag': 'Heartworm antigen test' } }), ['ok']);
});

test('one charge matches one test only', () => {
  const r = checkSendouts([lab(), lab({ accession: 'A2' })], [ch()]);
  assert.deepEqual(r.items.map((i) => i.status).sort(), ['not_charged', 'ok']);
});

test('a send-out item charged with no test on the lab invoice is listed only when the item is in the map', () => {
  assert.deepEqual(checkSendouts([], [ch({ item: 'Lyme' })], { settings: { test_map: { Lyme: 'Lyme' } } }).items.map((i) => i.status), ['charged_not_sent']);
  assert.equal(checkSendouts([], [ch({ item: 'Exam' })]).items.length, 0);
});

test('pet names and items match whatever the case and punctuation', () => {
  assert.deepEqual(st({ patient_name: 'REX', test: 'Chem-Panel' }, [ch({ item: 'chem panel' })]), ['ok']);
});

test('the lab cost of tests not charged is added up', () => {
  assert.equal(checkSendouts([lab(), lab({ accession: 'A2', test: 'T4', lab_cost: '22' })], [ch()]).cost_not_charged, 22);
});

test('the list keeps pet and client names for the team; the result does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('sendouts_write_report', { lab: 'fixtures/lab-invoice.csv', charges: 'fixtures/client-charges.csv', settings: 'fixtures/settings.json' });
  assert.match(readFileSync(`${root}/${r.result.files[0]}`, 'utf8'), /Felix Oduya/); assert.doesNotMatch(JSON.stringify(r), /Oduya|Juniper/);
});
