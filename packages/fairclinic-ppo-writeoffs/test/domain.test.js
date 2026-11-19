// PPO write-offs: contractual against discretionary, duplicates, networks, reasons, amounts and the summaries.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkWriteoffs } from '../src/index.js';

const adj = (over = {}) => ({ date: '2026-11-02', patient_name: 'Pat One', type: 'PPO Write-off', carrier: 'Example PPO', amount: '50', entered_by: 'Jo', note: '', ...over });
const one = (over, settings = { in_network: ['Example PPO'] }) => checkWriteoffs([adj(over)], [], { settings }).items[0];

test('a PPO write-off for an in-network plan is fine without a note', () => {
  const i = one({}); assert.equal(i.kind, 'contractual'); assert.equal(i.status, 'ok');
});

test('contractual types are recognised by their wording', () => {
  for (const t of ['PPO Write-off', 'Contractual Adjustment', 'Insurance Write-off', 'Ins W/O']) assert.equal(one({ type: t }).kind, 'contractual', t);
  for (const t of ['Courtesy Discount', 'Bad Debt', 'Small Balance']) assert.equal(one({ type: t, note: 'x' }).kind, 'discretionary', t);
});

test('out-of-network contractual write-offs are flagged only when a network list is given', () => {
  assert.equal(one({ carrier: 'Other Indemnity' }).status, 'out_of_network');
  assert.equal(one({ carrier: 'Other Indemnity' }, {}).status, 'ok');
  assert.equal(one({ carrier: 'EXAMPLE ppo' }).status, 'ok');
});

test('a contractual write-off with no carrier is flagged', () => {
  assert.equal(one({ carrier: '' }).status, 'no_carrier');
});

test('discretionary adjustments need a reason, and large ones are flagged at the review amount', () => {
  assert.equal(one({ type: 'Courtesy', note: '' }).status, 'no_reason');
  assert.equal(one({ type: 'Courtesy', note: 'x', amount: '500' }).status, 'large');
  assert.equal(one({ type: 'Courtesy', note: 'x', amount: '499.99' }).status, 'ok');
  assert.equal(one({ type: 'Courtesy', note: 'x', amount: '300' }, { large_amount: 250 }).status, 'large');
});

test('the second of two identical adjustments is the duplicate, whichever order the rows come in', () => {
  const a = adj({ type: 'Courtesy', note: 'x' }); const b = adj({ type: 'Courtesy', note: 'x', entered_by: 'Sam' });
  for (const rows of [[a, b], [b, a]]) { const r = checkWriteoffs(rows); assert.equal(r.duplicates, 1); }
});

test('negative amounts (credits written as minus) are read as their size', () => {
  assert.equal(one({ amount: '-75' }).amount, 75);
});

test('write-off percent per carrier uses the production file; staff shares add up to 100', () => {
  const r = checkWriteoffs([adj(), adj({ patient_name: 'B', amount: '150' }), adj({ type: 'Courtesy', note: 'x', amount: '30', entered_by: 'A' }), adj({ type: 'Courtesy', note: 'y', amount: '90', entered_by: 'B' })], [{ carrier: 'Example PPO', production: '1000' }]);
  assert.deepEqual(r.by_carrier[0], { carrier: 'Example PPO', writeoffs: 200, count: 2, production: 1000, writeoff_pct: 20 });
  assert.equal(r.by_staff.reduce((s, x) => s + x.share_pct, 0), 100);
});

test('the review list names the person who entered each adjustment and keeps patient names in the file only', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('writeoffs_write_report', { adjustments: 'fixtures/adjustments.csv', settings: 'fixtures/settings.json' });
  const csv = readFileSync(`${root}/${r.result.files[0]}`, 'utf8');
  assert.match(csv, /Saoirse Delacroix.*Sam Billing/); assert.doesNotMatch(JSON.stringify(r), /Delacroix/);
});
