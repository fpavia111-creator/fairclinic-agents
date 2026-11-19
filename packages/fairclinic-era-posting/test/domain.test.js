// Fairclinic ERA Posting: ERA claims against postings, denials, reversals and check totals.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, matchRemits } from '../src/index.js';

const era = (over = {}) => ({ claim_id: 'E1', patient_name: 'Pat One', payer: 'Example Dental PPO', check_number: 'K1', status: '1', charge: 200, paid: 120, adjustments: [], lines: [{ adjustments: [{ group: 'CO', reason: '45', amount: 50 }, { group: 'PR', reason: '2', amount: 30 }] }], ...over });
const post = (over = {}) => ({ claim_id: 'E1', check_number: 'K1', paid: '120', writeoff: '50', posted_by: 'Jo Front', ...over });

test('a claim posted exactly as the ERA shows is ok and the check ties', () => {
  const r = matchRemits([era()], [post()]);
  assert.equal(r.items[0].status, 'ok'); assert.equal(r.items[0].patient_portion, 30);
  assert.equal(r.checks[0].status, 'ties'); assert.equal(r.checks_not_tying, 0);
});

test('payment and write-off differences are each named with the difference', () => {
  const r = matchRemits([era()], [post({ paid: '102', writeoff: '68' })]);
  assert.deepEqual(r.items[0].findings.map((f) => [f.code, f.amount]), [['payment_mismatch', -18], ['writeoff_mismatch', 18]]);
  assert.equal(r.items[0].status, 'payment_mismatch');
});

test('a small difference inside the tolerance is equal', () => {
  assert.equal(matchRemits([era()], [post({ paid: '120.004' })]).items[0].status, 'ok');
  assert.equal(matchRemits([era()], [post({ paid: '120.50' })], { settings: { tolerance: 1 } }).items[0].status, 'ok');
});

test('a denial written off in full is caught; the same denial with no posting is a denial to work', () => {
  const d = era({ status: '4', paid: 0, lines: [{ adjustments: [{ group: 'CO', reason: '29', amount: 200 }] }] });
  assert.equal(matchRemits([d], [post({ paid: '0', writeoff: '200' })]).items[0].status, 'denial_written_off');
  const open = matchRemits([d], []).items[0];
  assert.equal(open.status, 'denied'); assert.match(open.findings[0].detail, /CO-29/);
});

test('contractual reason codes come from the settings', () => {
  const c = era({ lines: [{ adjustments: [{ group: 'CO', reason: '45', amount: 50 }, { group: 'CO', reason: '97', amount: 10 }] }] });
  assert.equal(matchRemits([c], [post()]).items[0].status, 'ok');
  assert.equal(matchRemits([c], [post()], { settings: { contractual_reasons: ['45', '97'] } }).items[0].status, 'writeoff_mismatch');
});

test('a reversal is its own status and is not read as a payment mismatch', () => {
  const r = matchRemits([era({ status: '22', paid: -120 })], [post()]).items[0];
  assert.equal(r.status, 'reversal'); assert.ok(!r.findings.some((f) => f.code === 'payment_mismatch'));
});

test('a posting on an ERA check for a claim that is not on that ERA is flagged; postings on other checks are ignored', () => {
  const r = matchRemits([era()], [post(), post({ claim_id: 'X9', paid: '40', writeoff: '0' }), post({ claim_id: 'Z1', check_number: 'K2' })]);
  assert.deepEqual(r.items.map((i) => [i.claim_id, i.status]), [['E1', 'ok'], ['X9', 'not_on_era']]);
  assert.equal(r.checks[0].difference, 40);
});

test('the posting list keeps real names for the team; the result the model sees does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('era_write_report', { era: 'fixtures/era-2026-11.835', posted: 'fixtures/posted-payments.csv' });
  assert.equal(r.status, 'executed', r.reason);
  const csv = readFileSync(`${root}/${r.result.files[0]}`, 'utf8');
  assert.match(csv, /Marisol Quintero|QUINTERO/i); assert.doesNotMatch(JSON.stringify(r), /Quintero/i);
  assert.doesNotMatch(csv, /^ok,/m);
});

test('provider-level adjustments (835 PLB) are listed per check, also on a payment with no claims (Nevada Medicaid sample 835 layout)', async () => {
  const o = matchRemits([era()], [post()], { payments: [{ trace_number: 'K1', payer: 'Example Dental PPO', amount: 100 }, { trace_number: 'K9', payer: 'Example Dental PPO', amount: 75 }], plb: [{ trace_number: 'K1', reason: 'WO', reference: 'R1', amount: 20 }, { trace_number: 'K9', reason: 'CS', reference: 'R2', amount: -75 }] });
  const adj = o.items.filter((i) => i.status === 'provider_adjustment');
  assert.equal(adj.length, 2); assert.equal(o.provider_adjustments, 2);
  assert.match(adj.find((i) => i.check_number === 'K9').findings[0].detail, /no claims/);
  const k9 = o.checks.find((c) => c.check_number === 'K9');
  assert.equal(k9.claims, 0); assert.equal(k9.payment_amount, 75); assert.equal(k9.provider_adjustments, -75);
  assert.equal(o.items.find((i) => i.claim_id === 'E1').status, 'ok', 'the claim itself still ties');
  // A whole 835 with segments ended by line breaks and a claim-less PLB payment, read through the tool.
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const { writeFileSync } = await import('node:fs');
  writeFileSync(`${root}/plb.835`, ['ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *261112*1200*^*00501*000000009*0*T*:', 'GS*HP*SENDER*RECEIVER*20261112*1200*9*X*005010X221A1', 'ST*835*0001', 'BPR*I*75.00*C*CHK************20261112', 'TRN*1*K9*1000099909', 'N1*PR*Example Dental PPO', 'N1*PE*BRIGHT EXAMPLE DENTAL*XX*1999999984', 'PLB*1999999984*20261231*CS:R2*-75.00', 'SE*7*0001', 'GE*1*9', 'IEA*1*000000009', ''].join('\n'));
  writeFileSync(`${root}/none.csv`, 'Claim ID,Check Number,Payment Posted,Write-off Posted\n');
  const r = await call('era_check', { era: 'plb.835', posted: 'none.csv' });
  assert.equal(r.status, 'executed'); assert.equal(r.result.provider_adjustments, 1); assert.equal(r.result.checks[0].payment_amount, 75);
});
