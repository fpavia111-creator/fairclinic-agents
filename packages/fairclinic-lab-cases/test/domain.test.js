// Lab cases: seat appointments, overdue cases, billing after seating, invoices, remakes and duplicates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkLabs } from '../src/index.js';

const kase = (over = {}) => ({ case_id: 'C1', patient_name: 'Pat One', lab: 'Lab A', sent_date: '2026-11-01', due_date: '2026-11-20', returned_date: '', seat_date: '2026-11-25', seated_date: '', billed: 'No', ...over });
const inv = (over = {}) => ({ invoice_number: 'I1', lab: 'Lab A', case_id: 'C1', amount: '200', remake: 'No', ...over });
const st = (c, invoices = [], opts = {}) => checkLabs([kase(c)], invoices, { asOf: '2026-11-16', ...opts }).items[0].status;

test('a case in progress before its due date is ok', () => { assert.equal(st({}), 'ok'); });

test('a case not back close to its seat appointment is urgent; the buffer is a setting', () => {
  assert.equal(st({ seat_date: '2026-11-18' }), 'not_back_for_seat');
  assert.equal(st({ seat_date: '2026-11-18' }, [], { settings: { seat_buffer_days: 1 } }), 'ok');
  assert.equal(st({ seat_date: '2026-11-10', due_date: '2026-11-08' }), 'not_back_for_seat');
});

test('a case past its due date and not back is overdue', () => { assert.equal(st({ due_date: '2026-11-12' }), 'overdue_from_lab'); });

test('seated work not marked billed is flagged', () => {
  assert.equal(st({ returned_date: '2026-11-10', seated_date: '2026-11-12' }, [inv()]), 'seated_not_billed');
  assert.equal(st({ returned_date: '2026-11-10', seated_date: '2026-11-12', billed: 'Yes' }, [inv()]), 'ok');
});

test('a returned case with no invoice is listed only after the waiting days', () => {
  const other = [inv({ invoice_number: 'X', case_id: 'C2' })];
  assert.equal(checkLabs([kase({ returned_date: '2026-10-01', due_date: '2026-10-05', billed: 'Yes' }), kase({ case_id: 'C2', returned_date: '2026-10-01' })], other, { asOf: '2026-11-16' }).items.find((i) => i.case_id === 'C1').status, 'no_invoice');
  assert.equal(checkLabs([kase({ returned_date: '2026-11-10', billed: 'Yes' }), kase({ case_id: 'C2', returned_date: '2026-11-01' })], other, { asOf: '2026-11-16' }).items.find((i) => i.case_id === 'C1').status, 'ok');
  assert.equal(st({ returned_date: '2026-10-01', due_date: '2026-10-05', billed: 'Yes' }), 'ok', 'no invoice file, no invoice check');
});

test('a charged remake, a repeated invoice and the same case invoiced twice are flagged', () => {
  const r = checkLabs([kase({ returned_date: '2026-11-10' })], [inv(), inv({ invoice_number: 'I2', remake: 'Yes' }), inv({ invoice_number: 'I1' }), inv({ invoice_number: 'I3' })], { asOf: '2026-11-16' });
  const st2 = r.items.filter((i) => i.kind === 'invoice').map((i) => `${i.invoice_number}:${i.status}`).sort();
  assert.deepEqual(st2, ['I1:duplicate_invoice', 'I2:remake_charged', 'I3:duplicate_invoice']);
});

test('an invoice for a case not in the log, or not back yet, is flagged', () => {
  const r = checkLabs([kase()], [inv(), inv({ invoice_number: 'I9', case_id: 'C9' })], { asOf: '2026-11-16' });
  assert.deepEqual(r.items.filter((i) => i.kind === 'invoice').map((i) => i.status).sort(), ['case_not_returned', 'invoice_no_case']);
});

test('a free remake is fine', () => {
  const r = checkLabs([kase({ returned_date: '2026-11-10' })], [inv(), inv({ invoice_number: 'I2', remake: 'Yes', amount: '0' })], { asOf: '2026-11-16' });
  assert.equal(r.items.filter((i) => i.kind === 'invoice').length, 0);
});

test('the worklist keeps names for the team; the result does not', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('labs_write_report', { cases: 'fixtures/lab-cases.csv', invoices: 'fixtures/lab-invoices.csv', as_of: '2026-11-16' });
  assert.match(readFileSync(`${root}/${r.result.files[0]}`, 'utf8'), /Theo Vasquez-Lind/); assert.doesNotMatch(JSON.stringify(r), /Vasquez/);
});
