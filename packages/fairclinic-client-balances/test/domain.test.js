// Client balances: credits, unapplied deposits, collections review, statements and small balances.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkClientBalances } from '../src/index.js';

const acct = (over = {}) => ({ client_id: 'A1', client_name: 'Owner', balance: '200', aged_0_30: '200', deposit: '0', last_payment: '2026-11-01', last_statement: '2026-11-05', ...over });
const st = (over, opts = {}) => checkClientBalances([acct(over)], { asOf: '2026-11-16', ...opts }).items[0].status;

test('a recent statement is ok; a zero balance is left out', () => {
  assert.equal(st({}), 'ok'); assert.equal(checkClientBalances([acct({ balance: '0' })], { asOf: '2026-11-16' }).accounts, 0);
});

test('a credit comes first, even with a deposit on the account', () => { assert.equal(st({ balance: '-20', deposit: '50' }), 'credit_balance'); });

test('a deposit sitting on an account that owes money is flagged', () => { assert.equal(st({ deposit: '100' }), 'deposit_not_applied'); });

test('money over 90 days without a recent payment goes to collections review, per the setting', () => {
  assert.equal(st({ aged_90_plus: '200', last_payment: '2026-07-01' }), 'collections_review');
  assert.equal(st({ aged_90_plus: '200', last_payment: '2026-07-01' }, { settings: { collections_days: 180 } }), 'ok');
});

test('no statement in the statement days, or none at all', () => {
  assert.equal(st({ last_statement: '2026-10-01' }), 'no_statement'); assert.equal(st({ last_statement: '' }), 'no_statement');
  assert.equal(st({ last_statement: '2026-10-01' }, { settings: { statement_days: 60 } }), 'ok');
});

test('small balances follow the setting', () => {
  assert.equal(st({ balance: '3', last_statement: '' }), 'small_balance');
  assert.equal(st({ balance: '3', last_statement: '' }, { settings: { small_balance: 1 } }), 'no_statement');
});

test('totals keep credits apart from what is owed', () => {
  const r = checkClientBalances([acct(), acct({ client_id: 'A2', balance: '-50' })], { asOf: '2026-11-16' });
  assert.equal(r.total, 150); assert.equal(r.owed, 200); assert.equal(r.credits, 50);
});

test('credits and the largest balances come first', () => {
  const r = checkClientBalances([acct({ client_id: 'S', balance: '100', last_statement: '' }), acct({ client_id: 'B', balance: '900', last_statement: '' }), acct({ client_id: 'C', balance: '-10' })], { asOf: '2026-11-16' });
  assert.deepEqual(r.items.map((i) => i.client_id), ['C', 'B', 'S']);
});

test('the worklist keeps client names for the team; the result does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('clientar_write_report', { balances: 'fixtures/client-ar.csv', as_of: '2026-11-16' });
  assert.match(readFileSync(`${root}/${r.result.files[0]}`, 'utf8'), /Tobias Achterberg/); assert.doesNotMatch(JSON.stringify(r), /Achterberg|A101/);
});
