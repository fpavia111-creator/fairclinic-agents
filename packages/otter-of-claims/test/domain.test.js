// Otter: aging, follow-up dates, filing limits, duplicates, secondary claims and the inquiry draft.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, ageClaims, inquiryText } from '../src/index.js';

const row = (over = {}) => ({ claim_id: 'X1', patient_name: 'Pat One', payer: 'Example Dental PPO', claim_type: 'Primary', date_of_service: '2026-10-01', date_sent: '2026-10-02', billed: '200', expected: '160', paid: '0', status: 'Sent', ...over });
const age = (rows, opts = {}) => ageClaims(rows, { asOf: '2026-11-16', ...opts });

test('a claim sent 45 days ago with no follow-up is due today; one followed up last week is not', () => {
  const r = age([row(), row({ claim_id: 'X2', patient_name: 'Pat Two', last_follow_up: '2026-11-12' })]);
  assert.deepEqual(r.items.map((i) => i.status), ['follow_up', 'waiting']);
  assert.equal(r.items[0].next_follow_up, '2026-11-16'); assert.equal(r.items[1].next_follow_up, '2026-11-26');
  assert.equal(r.items[0].bucket, '31-60'); assert.equal(r.outstanding, 320);
});

test('the filing limit comes from the carrier setting, else the default, and warns ahead of time', () => {
  const s = { filing_days: { 'example dental ppo': 60 }, warn_before_days: 30 };
  const r = age([row({ date_of_service: '2026-09-30' })], { settings: s });
  assert.equal(r.items[0].file_by, '2026-11-29'); assert.equal(r.items[0].status, 'filing_risk');
  assert.equal(age([row({ date_of_service: '2026-09-30' })]).items[0].status, 'follow_up');
  const past = age([row({ date_of_service: '2025-10-01', date_sent: '2025-10-02' })]).items[0];
  assert.match(past.findings.find((f) => f.code === 'filing_risk').detail, /passed on 2026-10-01/);
});

test('one claim exported as several procedure lines is counted once, with its amounts added', () => {
  const r = age([row({ billed: '120', expected: '96' }), row({ billed: '80', expected: '64' })]);
  assert.equal(r.claims, 1); assert.equal(r.items[0].billed, 200); assert.equal(r.items[0].outstanding, 160);
});

test('the same visit sent twice to the same carrier is a duplicate; a secondary claim for the visit is not', () => {
  const r = age([row(), row({ claim_id: 'X2' }), row({ claim_id: 'X3', claim_type: 'Secondary', payer: 'Sample Mutual Dental' })]);
  assert.deepEqual(r.items.map((i) => i.status), ['follow_up', 'duplicate', 'follow_up']);
});

test('a paid primary with a second carrier and no secondary claim is flagged; denied claims are not chased for status', () => {
  const r = age([row({ status: 'Received', paid: '160', secondary_payer: 'Sample Mutual Dental' }), row({ claim_id: 'X2', patient_name: 'Pat Two', status: 'Denied' })]);
  const by = Object.fromEntries(r.items.map((i) => [i.claim_id, i]));
  assert.equal(by.X1.status, 'secondary_not_sent'); assert.equal(r.secondary_not_sent, 1);
  assert.equal(by.X2.status, 'denied'); assert.equal(by.X2.next_follow_up, null);
  assert.ok(!by.X2.findings.some((f) => f.code === 'follow_up'));
});

test('unsent claims are flagged only after the grace days', () => {
  assert.equal(age([row({ date_sent: '', date_of_service: '2026-11-14', status: 'Unsent' })]).items[0].status, 'waiting');
  assert.equal(age([row({ date_sent: '', date_of_service: '2026-11-10', status: 'Unsent' })]).items[0].status, 'unsent');
});

test('the inquiry lists only claims due for follow-up, totals them and leaves the address to confirm', () => {
  const r = age([row(), row({ claim_id: 'X2', patient_name: 'Pat Two', date_of_service: '2026-10-03' }), row({ claim_id: 'X3', patient_name: 'Pat Three', date_of_service: '2026-10-04', status: 'Denied' })]);
  const d = inquiryText(r.items, { payer: 'example dental ppo' });
  assert.deepEqual(d.rows.map((i) => i.claim_id), ['X1', 'X2']); assert.equal(d.total, 320);
  assert.match(d.text, /\[TO CONFIRM carrier provider services/); assert.doesNotMatch(d.text, /X3/);
});

test('the report file keeps real names for the team; the result the model sees does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('otter_write_report', { claims: 'fixtures/claims-outstanding.csv', settings: 'fixtures/settings.json', as_of: '2026-11-16' });
  assert.equal(r.status, 'executed', r.reason);
  const csv = readFileSync(`${root}/${r.result.files[0]}`, 'utf8');
  assert.match(csv, /Marisol Quintero/); assert.doesNotMatch(JSON.stringify(r), /Marisol Quintero/);
  assert.match(csv, /^status,claim_id,patient_name,payer/);
});
