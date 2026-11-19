// Patient balances: credits, plans, collections review, statements, insurance and small balances; the letter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkBalances, letterText } from '../src/index.js';

const acct = (over = {}) => ({ account_number: 'A1', guarantor: 'Pat One', balance: '200', aged_0_30: '200', insurance_pending: '0', last_payment: '2026-11-01', last_statement: '2026-11-05', payment_plan: 'No', ...over });
const st = (over, opts = {}) => checkBalances([acct(over)], { asOf: '2026-11-16', ...opts }).items[0].status;

test('a recent statement and payment is ok; a zero balance is left out', () => {
  assert.equal(st({}), 'ok');
  assert.equal(checkBalances([acct({ balance: '0' })], { asOf: '2026-11-16' }).accounts, 0);
});

test('a negative balance is a credit for a person to check, before anything else', () => {
  assert.equal(st({ balance: '-40', payment_plan: 'Yes', last_payment: '' }), 'credit_balance');
});

test('payment plans: missed after the plan days, fine before', () => {
  assert.equal(st({ payment_plan: 'Yes', last_payment: '2026-09-01' }), 'plan_missed');
  assert.equal(st({ payment_plan: 'Yes', last_payment: '2026-11-01' }), 'payment_plan');
  assert.equal(st({ payment_plan: 'Yes', last_payment: '2026-10-10' }, { settings: { plan_days: 30 } }), 'plan_missed');
});

test('money over 90 days with no recent payment goes to collections review', () => {
  assert.equal(st({ aged_90_plus: '150', last_payment: '2026-08-01' }), 'collections_review');
  assert.equal(st({ aged_90_plus: '150', last_payment: '2026-10-20' }), 'ok');
});

test('no statement in the statement days, or none at all, is flagged', () => {
  assert.equal(st({ last_statement: '2026-09-01' }), 'no_statement');
  assert.equal(st({ last_statement: '' }), 'no_statement');
  assert.equal(st({ last_statement: '2026-09-01' }, { settings: { statement_days: 90 } }), 'ok');
});

test('a balance waiting on insurance is not billed to the patient; small portions follow the setting', () => {
  assert.equal(st({ insurance_pending: '200', last_statement: '' }), 'insurance_pending');
  assert.equal(st({ balance: '204', insurance_pending: '200', last_statement: '' }), 'small_balance');
  assert.equal(st({ balance: '204', insurance_pending: '200', last_statement: '' }, { settings: { small_balance: 2 } }), 'no_statement');
});

test('totals: credits separate, insurance only on owing accounts, buckets added', () => {
  const r = checkBalances([acct(), acct({ account_number: 'A2', balance: '-50', aged_0_30: '-50' }), acct({ account_number: 'A3', balance: '300', aged_0_30: '0', aged_90_plus: '300', insurance_pending: '100' })], { asOf: '2026-11-16' });
  assert.equal(r.total, 450); assert.equal(r.credits, 50); assert.equal(r.patient_portion, 400); assert.equal(r.insurance_pending, 100); assert.equal(r.buckets['90+'], 300);
});

test('the letter states the figures, asks the person to call and threatens nothing', () => {
  const i = checkBalances([acct({ insurance_pending: '50' })], { asOf: '2026-11-16' }).items[0];
  const t = letterText(i, { practice: 'Example Dental (fictional)' });
  assert.match(t, /a balance of 150 that is yours to pay/); assert.match(t, /a further 50 is waiting on insurance/);
  assert.doesNotMatch(t, /collection|legal action|credit bureau/i); assert.match(t, /\[TO CONFIRM practice phone\]/);
});

test('the worklist keeps names for the team; the letter draft result the model sees does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('balances_write_report', { balances: 'fixtures/ar-by-guarantor.csv', as_of: '2026-11-16' });
  assert.match(readFileSync(`${root}/${r.result.files[0]}`, 'utf8'), /Marisol Quintero/);
  const d = await call('balances_draft_balance_letter', { balances: 'fixtures/ar-by-guarantor.csv', as_of: '2026-11-16', account: 'G1009' });
  assert.equal(d.status, 'executed', d.reason); assert.doesNotMatch(JSON.stringify(d), /Brightwater|G1009/);
  assert.match(readFileSync(d.result.file, 'utf8'), /Dear Omar Brightwater/);
});
