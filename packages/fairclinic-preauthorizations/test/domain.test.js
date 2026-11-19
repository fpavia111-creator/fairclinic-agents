// Pre-authorizations: answers, approvals running out, scheduling after expiry, reductions and the report.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkPreauths } from '../src/index.js';

const row = (over = {}) => ({ preauth_id: 'A1', patient_name: 'Pat One', payer: 'Example Dental PPO', code: 'D2740', requested: '500', created: '2026-10-01', date_sent: '2026-10-02', status: 'Approved', approved_amount: '500', valid_until: '2027-04-01', scheduled_date: '2026-12-01', ...over });
const check = (rows, opts = {}) => checkPreauths(rows, { asOf: '2026-11-16', ...opts });
const st = (over, opts) => check([row(over)], opts).items[0].status;

test('approved and scheduled before the approval ends is ok; approved with nothing booked is flagged', () => {
  assert.equal(st({}), 'ok');
  assert.equal(st({ scheduled_date: '' }), 'approved_unscheduled');
});

test('an approval ending within the warning days is expiring; after it ends it is expired', () => {
  assert.equal(st({ valid_until: '2026-12-10', scheduled_date: '' }), 'expiring');
  assert.equal(st({ valid_until: '2026-12-10', scheduled_date: '2026-12-01' }), 'ok', 'booked before the approval ends: nothing to do');
  assert.equal(st({ valid_until: '2026-12-10', scheduled_date: '' }, { settings: { expiry_warn_days: 10 } }), 'approved_unscheduled');
  assert.equal(st({ valid_until: '2026-11-01', scheduled_date: '' }), 'expired');
});

test('a visit booked after the approval ends is caught, and work done after it ended too', () => {
  assert.equal(st({ valid_until: '2027-01-31', scheduled_date: '2027-02-15' }), 'scheduled_after_expiry');
  assert.equal(st({ valid_until: '2026-08-01', completed_date: '2026-09-01' }), 'done_after_expiry');
  assert.equal(st({ valid_until: '2026-08-01', completed_date: '2026-07-20' }), 'ok');
});

test('a request with no answer after the response days is chased; a recent one waits', () => {
  assert.equal(st({ status: 'Sent', approved_amount: '', valid_until: '', date_sent: '2026-10-01' }), 'no_response');
  assert.equal(st({ status: 'Sent', approved_amount: '', valid_until: '', date_sent: '2026-11-01' }), 'pending');
  assert.equal(st({ status: 'Sent', approved_amount: '', valid_until: '', date_sent: '2026-11-01' }, { settings: { response_days: 10 } }), 'no_response');
});

test('an unsent request is flagged only after the grace days', () => {
  assert.equal(st({ status: 'Not sent', date_sent: '', created: '2026-11-14', approved_amount: '', valid_until: '' }), 'pending');
  assert.equal(st({ status: 'Not sent', date_sent: '', created: '2026-11-01', approved_amount: '', valid_until: '' }), 'not_sent');
});

test('a reduced approval is noted without hiding a more urgent status', () => {
  const r = check([row({ approved_amount: '300', scheduled_date: '' })]).items[0];
  assert.deepEqual(r.findings.map((f) => f.code), ['approved_unscheduled', 'reduced']);
  assert.equal(check([row({ approved_amount: '450' })]).items[0].status, 'ok');
});

test('denials are their own status and the amount at risk counts only approvals still open', () => {
  const r = check([row({ preauth_id: 'A1', scheduled_date: '' }), row({ preauth_id: 'A2', status: 'Denied', approved_amount: '' }), row({ preauth_id: 'A3', valid_until: '2026-10-01', scheduled_date: '' })]);
  assert.deepEqual(r.items.map((i) => i.status), ['approved_unscheduled', 'denied', 'expired']);
  assert.equal(r.approved_at_risk, 500); assert.equal(r.expired_value, 500); assert.equal(r.needs_action, 3);
});

test('the worklist keeps real names for the team and leaves out the ones that need nothing', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('preauth_write_report', { preauths: 'fixtures/preauths.csv', settings: 'fixtures/settings.json', as_of: '2026-11-16' });
  assert.equal(r.status, 'executed', r.reason);
  const csv = readFileSync(`${root}/${r.result.files[0]}`, 'utf8');
  assert.match(csv, /Marisol Quintero/); assert.doesNotMatch(csv, /P301|P308/); assert.doesNotMatch(JSON.stringify(r), /Quintero/);
});
