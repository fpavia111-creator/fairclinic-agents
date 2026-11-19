// Referral tracking: reports back, first visits, thank-yous and totals by source and specialist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkReferrals } from '../src/index.js';

const out = (over = {}) => ({ date: '2026-10-01', patient_name: 'Pat', referred_to: 'Example Endo', report_received: '', ...over });
const inc = (over = {}) => ({ date: '2026-10-01', patient_name: 'New Pat', source: 'Dr. Ref', source_type: 'Doctor', first_visit: '2026-10-10', production: '500', thanked: '2026-10-11', ...over });
const run = (o, i = [], opts = {}) => checkReferrals(o, i, { asOf: '2026-11-16', ...opts });

test('a referral out with a report back is ok; without one it is chased after the report days', () => {
  assert.equal(run([out({ report_received: '2026-10-20' })]).items[0].status, 'ok');
  assert.equal(run([out()]).items[0].status, 'no_report');
  assert.equal(run([out({ date: '2026-11-01' })]).items[0].status, 'waiting');
  assert.equal(run([out()], [], { settings: { report_days: 60 } }).items[0].status, 'waiting');
});

test('a referral in never seen is followed up after the first-visit days', () => {
  assert.equal(run([], [inc({ first_visit: '' })]).items[0].status, 'no_first_visit');
  assert.equal(run([], [inc({ date: '2026-11-10', first_visit: '' })]).items[0].status, 'waiting');
});

test('a doctor who referred a seen patient and was not thanked is listed; a web referral needs no thank-you', () => {
  assert.equal(run([], [inc({ thanked: '' })]).items[0].status, 'thank_you_not_sent');
  assert.equal(run([], [inc({ thanked: '', source: 'Website', source_type: 'Web' })]).items[0].status, 'ok');
  assert.equal(run([], [inc({ thanked: '', source: 'Dr. Lee', source_type: '' })]).items[0].status, 'thank_you_not_sent');
});

test('totals by source count referrals, patients seen and production', () => {
  const r = run([], [inc(), inc({ first_visit: '', production: '' })]);
  assert.deepEqual(r.by_source, [{ source: 'Dr. Ref', referrals: 2, seen: 1, production: 500 }]);
});

test('reports back are counted per specialist', () => {
  const r = run([out({ report_received: '2026-10-05' }), out(), out({ referred_to: 'Other Ortho' })]);
  assert.deepEqual(r.by_specialist, [{ referred_to: 'Example Endo', referrals: 2, reports: 1 }, { referred_to: 'Other Ortho', referrals: 1, reports: 0 }]);
});

test('the oldest unanswered referrals come first', () => {
  const r = run([out({ referred_to: 'B', date: '2026-09-01' }), out({ referred_to: 'A', date: '2026-08-01' })]);
  assert.deepEqual(r.items.map((i) => i.party), ['A', 'B']);
});

test('rows without a date or a party are skipped', () => {
  assert.equal(run([out({ date: '' }), out({ referred_to: '' })]).referrals_out, 0);
});

test('to-follow-up leaves out waiting and ok', () => {
  assert.equal(run([out(), out({ date: '2026-11-10' })], [inc()]).to_follow_up, 1);
});

test('the follow-up list keeps patient names for the office; the result does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('referrals_write_report', { outgoing: 'fixtures/referrals-out.csv', incoming: 'fixtures/referrals-in.csv', as_of: '2026-11-16' });
  assert.match(readFileSync(`${root}/${r.result.files[0]}`, 'utf8'), /Greta Lindqvist/); assert.doesNotMatch(JSON.stringify(r), /Lindqvist/);
});
