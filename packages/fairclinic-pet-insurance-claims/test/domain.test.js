// Pet insurance claims: information requests, direct payments, drafts, waiting claims, denials.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkPetClaims } from '../src/index.js';

const claim = (over = {}) => ({ claim_id: 'P1', patient_name: 'Rex', insurer: 'Example Pet', claimed: '500', created: '2026-11-01', submitted: '2026-11-02', status: 'Submitted', paid: '', direct_pay: 'No', ...over });
const st = (over, opts = {}) => checkPetClaims([claim(over)], { asOf: '2026-11-16', ...opts }).items[0].status;

test('a recent submission is pending; one with no decision after the response days is chased', () => {
  assert.equal(st({}), 'pending');
  assert.equal(st({ submitted: '2026-10-10' }), 'no_response');
  assert.equal(st({ submitted: '2026-10-10' }, { settings: { response_days: 60 } }), 'pending');
});

test('an information request comes first, whatever the dates', () => {
  assert.equal(st({ status: 'Info requested', submitted: '2026-09-01' }), 'info_requested');
  assert.equal(st({ status: 'Pending documents' }), 'info_requested');
});

test('a direct payment below the claim leaves a client balance; full payment or payment to the client is paid', () => {
  assert.equal(st({ status: 'Paid', paid: '400', direct_pay: 'Yes' }), 'direct_pay_balance');
  assert.equal(st({ status: 'Paid', paid: '500', direct_pay: 'Yes' }), 'paid');
  assert.equal(st({ status: 'Paid', paid: '400', direct_pay: 'No' }), 'paid');
});

test('a draft is flagged after the draft days', () => {
  assert.equal(st({ status: 'Draft', submitted: '', created: '2026-11-14' }), 'pending');
  assert.equal(st({ status: 'Draft', submitted: '', created: '2026-11-01' }), 'not_submitted');
});

test('denials are their own status', () => { assert.equal(st({ status: 'Declined' }), 'denied'); });

test('open amounts leave out paid and denied claims, and direct-pay claims are counted apart', () => {
  const r = checkPetClaims([claim(), claim({ claim_id: 'P2', direct_pay: 'Yes', claimed: '300' }), claim({ claim_id: 'P3', status: 'Paid', paid: '100' }), claim({ claim_id: 'P4', status: 'Denied' })], { asOf: '2026-11-16' });
  assert.equal(r.open, 2); assert.equal(r.open_claimed, 800); assert.equal(r.direct_pay_open, 300);
});

test('the client balance after a short direct payment is added up', () => {
  const r = checkPetClaims([claim({ status: 'Paid', paid: '350', direct_pay: 'Yes' }), claim({ claim_id: 'P2', status: 'Paid', paid: '450', direct_pay: 'Yes' })], { asOf: '2026-11-16' });
  assert.equal(r.client_balances, 200);
});

test('the oldest open claims come first within a status', () => {
  const r = checkPetClaims([claim({ claim_id: 'B', submitted: '2026-10-20' }), claim({ claim_id: 'A', submitted: '2026-10-01' })], { asOf: '2026-11-16' });
  assert.deepEqual(r.items.map((i) => i.claim_id), ['A', 'B']);
});

test('the worklist keeps names for the front desk; the result does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('petclaims_write_report', { claims: 'fixtures/pet-claims.csv', as_of: '2026-11-16' });
  assert.match(readFileSync(`${root}/${r.result.files[0]}`, 'utf8'), /Felix Oduya/); assert.doesNotMatch(JSON.stringify(r), /Oduya/);
});
