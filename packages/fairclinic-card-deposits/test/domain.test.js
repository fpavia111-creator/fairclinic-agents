// Card deposits: batches against bank deposits and practice-system card totals.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkDeposits } from '../src/index.js';

const b = (over = {}) => ({ batch_id: 'B1', batch_date: '2026-11-02', gross: '1000', fees: '30', refunds: '0', chargebacks: '0', net: '970', ...over });
const dep = (amount = '970', date = '2026-11-03', description = 'MERCH DEP') => ({ date, amount, description });
const st = (batch, deps, pms = [], settings = {}) => checkDeposits([b(batch)], deps, pms, { settings }).items[0].status;

test('a deposit of the net amount a day later is ok', () => { assert.equal(st({}, [dep()]), 'ok'); });

test('no deposit within the window is no_deposit; the window is a setting', () => {
  assert.equal(st({}, [dep('970', '2026-11-10')]), 'no_deposit');
  assert.equal(st({}, [dep('970', '2026-11-10')], [], { deposit_days: 10 }), 'ok');
});

test('a deposit naming the batch is matched even when the amount differs', () => {
  const r = checkDeposits([b()], [dep('960', '2026-11-03', 'MERCH DEP B1')]);
  assert.equal(r.items[0].status, 'amount_differs'); assert.equal(r.items[0].deposited, 960);
});

test('net is worked out when the file has none', () => {
  assert.equal(checkDeposits([b({ net: '', refunds: '20' })], [dep('950')]).items[0].status, 'ok');
});

test('a chargeback and a practice-system difference are both named', () => {
  const i = checkDeposits([b({ chargebacks: '50', net: '920' })], [dep('920')], [{ date: '2026-11-02', card_total: '1010' }]).items[0];
  assert.deepEqual(i.findings.map((f) => f.code), ['chargeback', 'pms_differs']);
});

test('fees above the percent are flagged', () => {
  assert.equal(st({ fees: '40', net: '960' }, [dep('960')]), 'fees_high');
  assert.equal(st({ fees: '40', net: '960' }, [dep('960')], [], { fee_pct: 5 }), 'ok');
});

test('a card deposit that matches no batch is listed; other bank lines are not', () => {
  const r = checkDeposits([b()], [dep(), dep('500', '2026-11-05'), dep('800', '2026-11-05', 'PAYROLL')]);
  assert.deepEqual(r.items.map((i) => i.status).sort(), ['deposit_unmatched', 'ok']);
});

test('two batches with the same net each take their own deposit', () => {
  const r = checkDeposits([b(), b({ batch_id: 'B2', batch_date: '2026-11-03' })], [dep('970', '2026-11-03'), dep('970', '2026-11-04')]);
  assert.deepEqual(r.items.map((i) => i.status), ['ok', 'ok']);
});

test('the report lists only what needs a person', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('deposits_write_report', { batches: 'fixtures/processor-batches.csv', deposits: 'fixtures/bank-lines.csv', pms: 'fixtures/pms-card-totals.csv' });
  assert.equal(readFileSync(`${root}/${r.result.files[0]}`, 'utf8').trim().split('\n').length, 5);
});
