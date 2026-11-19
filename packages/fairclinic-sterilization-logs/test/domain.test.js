// Sterilization logs: incomplete entries, failed cycles, cycle number gaps, spore test gaps and positive tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkSterilization } from '../src/index.js';

const cyc = (date, n, result = 'Pass', initials = 'AB', s = 'A') => ({ date, sterilizer: s, cycle_number: String(n), result, initials });
const spore = (date, result = 'Negative', s = 'A') => ({ date, sterilizer: s, result });
const codes = (r) => r.items.map((i) => i.status);
const run = (c, s = [], opts = {}) => checkSterilization(c, s, { asOf: '2026-11-16', ...opts });

test('a complete log with weekly negative spore tests has no open items', () => {
  const r = run([cyc('2026-11-02', 1), cyc('2026-11-03', 2), cyc('2026-11-09', 3)], [spore('2026-11-02'), spore('2026-11-09')]);
  assert.deepEqual(codes(r), []);
});

test('an entry missing its result, number or initials is listed with what is missing', () => {
  const r = run([cyc('2026-11-02', 1, ''), { date: '2026-11-02', sterilizer: 'A', result: 'Pass', initials: '' }], [spore('2026-11-02')]);
  assert.match(r.items.map((i) => i.detail).join(' '), /no result/); assert.match(r.items.map((i) => i.detail).join(' '), /no cycle number, initials/);
});

test('a failed cycle rerun and passed the same day is fine; one with no rerun is listed', () => {
  assert.deepEqual(codes(run([cyc('2026-11-02', 1, 'Fail'), cyc('2026-11-02', 2)], [spore('2026-11-02')])), []);
  assert.deepEqual(codes(run([cyc('2026-11-02', 1), cyc('2026-11-02', 2, 'Fail')], [spore('2026-11-02')])), ['failed_no_rerun']);
});

test('cycle numbers that skip are a gap; each sterilizer has its own numbers', () => {
  assert.deepEqual(codes(run([cyc('2026-11-02', 1), cyc('2026-11-02', 3), cyc('2026-11-02', 7, 'Pass', 'AB', 'B')], [spore('2026-11-02'), spore('2026-11-02', 'Negative', 'B')])), ['cycle_number_gap']);
});

test('a long gap between spore tests counts only when the sterilizer was used in between', () => {
  assert.deepEqual(codes(run([cyc('2026-11-02', 1), cyc('2026-11-10', 2), cyc('2026-11-14', 3)], [spore('2026-11-01'), spore('2026-11-14')])), ['spore_gap']);
  assert.deepEqual(codes(run([cyc('2026-11-14', 1)], [spore('2026-11-01'), spore('2026-11-14')])), []);
  assert.deepEqual(codes(run([cyc('2026-11-02', 1), cyc('2026-11-10', 2), cyc('2026-11-14', 3)], [spore('2026-11-01'), spore('2026-11-14')], { settings: { spore_interval_days: 14 } })), []);
});

test('use long after the last spore test is listed', () => {
  assert.deepEqual(codes(run([cyc('2026-11-12', 1)], [spore('2026-11-01')])), ['spore_gap']);
});

test('a positive test needs a negative retest logged after it, within the retest days', () => {
  assert.deepEqual(codes(run([cyc('2026-11-12', 1)], [spore('2026-11-12', 'Positive')])), ['positive_no_followup']);
  assert.deepEqual(codes(run([cyc('2026-11-12', 1)], [spore('2026-11-12', 'Positive'), spore('2026-11-13')])), []);
  assert.deepEqual(codes(run([cyc('2026-11-12', 1)], [spore('2026-11-12', 'Positive')], { asOf: '2026-11-13' })), []);
});

test('the wording reports the log and never a compliance finding', () => {
  const r = run([cyc('2026-11-02', 1, 'Fail')], [spore('2026-10-01', 'Positive')]);
  for (const i of r.items) assert.doesNotMatch(i.detail, /complian|violat|illegal|must/i);
});

test('the report lists every open item', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('sterilization_write_report', { cycles: 'fixtures/cycle-log.csv', spores: 'fixtures/spore-tests.csv', as_of: '2026-11-16' });
  assert.equal(readFileSync(`${root}/${r.result.files[0]}`, 'utf8').trim().split('\n').length, 6);
});
