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
