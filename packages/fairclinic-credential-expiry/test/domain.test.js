// Credential expiry: expired, expiring, renewals submitted, missing dates and CE hours.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkCredentials } from '../src/index.js';

const c = (over = {}) => ({ holder: 'Dr. One', credential: 'State license', credential_number: 'AB1234567', expires: '2027-08-01', renewal_submitted: '', ce_required: '', ce_done: '', ...over });
const st = (over, opts = {}) => checkCredentials([c(over)], { asOf: '2026-11-16', ...opts }).items[0];

test('a credential far from expiry is ok', () => { assert.equal(st({}).status, 'ok'); });

test('expired and expiring within the warning days', () => {
  assert.equal(st({ expires: '2026-11-01' }).status, 'expired');
  assert.equal(st({ expires: '2027-01-15' }).status, 'expiring');
  assert.equal(st({ expires: '2027-01-15' }, { settings: { warn_days: 30 } }).status, 'ok');
});

test('a submitted renewal turns expiring into waiting', () => {
  assert.equal(st({ expires: '2027-01-15', renewal_submitted: '2026-11-10' }).status, 'renewal_submitted');
  assert.equal(st({ expires: '2027-01-15', renewal_submitted: '2026-12-01' }).status, 'expiring', 'a future date is not a submission');
});

test('no expiry date is listed', () => { assert.equal(st({ expires: '' }).status, 'missing_expiry'); });

test('CE hours are checked only when renewal is near', () => {
  assert.equal(st({ expires: '2027-03-31', ce_required: '30', ce_done: '10' }).status, 'ce_short');
  assert.equal(st({ expires: '2027-03-31', ce_required: '30', ce_done: '30' }).status, 'ok');
  assert.equal(st({ expires: '2027-08-01', ce_required: '30', ce_done: '10' }).status, 'ok');
  assert.equal(st({ expires: '2027-08-01', ce_required: '30', ce_done: '10' }, { settings: { ce_warn_days: 365 } }).status, 'ce_short');
});

test('expiring also lists the CE shortfall', () => {
  assert.deepEqual(st({ expires: '2027-01-15', ce_required: '20', ce_done: '5' }).findings.map((f) => f.code), ['expiring', 'ce_short']);
});

test('numbers keep only their last four characters', () => { const n = st({}).number; assert.match(n, /4567$/); assert.doesNotMatch(n, /AB123/); });

test('the soonest expiry comes first within a status, and the next expiry is reported', () => {
  const r = checkCredentials([c({ holder: 'B', expires: '2027-01-20' }), c({ holder: 'A', expires: '2026-12-20' })], { asOf: '2026-11-16' });
  assert.deepEqual(r.items.map((i) => i.holder), ['A', 'B']); assert.equal(r.next_expiry, '2026-12-20');
});

test('the report lists everything that is not ok', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('credentials_write_report', { credentials: 'fixtures/credentials.csv', as_of: '2026-11-16' });
  assert.equal(readFileSync(`${root}/${r.result.files[0]}`, 'utf8').trim().split('\n').length, 7);
});

test('a public board file (Washington State layout) is read: first and last name joined, the board status wins over the date', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const { writeFileSync } = await import('node:fs');
  writeFileSync(`${root}/board.csv`, [
    '"credentialnumber","lastname","firstname","middlename","credentialtype","status","birthyear","ceduedate","firstissuedate","lastissuedate","expirationdate","actiontaken"',
    '"DE.DE.00000001","Example","Ada","","Dentist License","Active","","03/31/2027","01/01/2010","03/01/2026","03/31/2027","No"',
    '"DE.DE.00000002","Sample","Ben","","Dentist License","Active","","10/31/2026","01/01/2012","10/01/2025","10/31/2026","No"',
    '"VT.VT.00000003","Test","Cora","","Veterinary License","Expired","","","01/01/2015","01/01/2024","01/01/2025","No"',
    '"VT.VT.00000004","Demo","Iris","","Veterinary License","Suspended","","","01/01/2015","01/01/2026","12/31/2027","Yes"',
  ].join('\n') + '\n');
  const r = await call('credentials_check', { credentials: 'board.csv', as_of: '2026-11-16' }, { phi: 'off' });
  assert.equal(r.status, 'executed');
  const by = Object.fromEntries(r.result.items.map((i) => [i.number.slice(-4), i]));
  assert.equal(by['0001'].status, 'ok');
  assert.equal(by['0002'].status, 'expired'); assert.match(by['0002'].findings[0].detail, /board still lists it as Active/);
  assert.equal(by['0003'].status, 'not_active'); assert.equal(by['0004'].status, 'not_active', 'suspended even though the date is in the future');
  assert.equal(r.result.holders, 4);
});
