// Vaccine reminders: overdue, reminded, booked, due soon, unreachable clients and pets marked deceased or inactive.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fixtureRunner } from 'fairclinic-core/testkit';
import { manifest, checkReminders } from '../src/index.js';

const rem = (over = {}) => ({ client_name: 'Owner One', patient_name: 'Rex', species: 'Canine', reminder: 'DHPP', due_date: '2026-10-01', reminder_sent: '', next_appointment: '', patient_status: 'Active', client_email: 'o@example.test', client_phone: '', ...over });
const st = (over, opts = {}) => checkReminders([rem(over)], { asOf: '2026-11-16', ...opts }).items[0].status;

test('overdue with no reminder is to contact; reminded recently is waiting; booked is booked', () => {
  assert.equal(st({}), 'overdue_no_contact');
  assert.equal(st({ reminder_sent: '2026-11-10' }), 'overdue_reminded');
  assert.equal(st({ next_appointment: '2026-11-20' }), 'booked');
});

test('the recontact days come from the settings', () => {
  assert.equal(st({ reminder_sent: '2026-09-20' }), 'overdue_no_contact');
  assert.equal(st({ reminder_sent: '2026-09-20' }, { settings: { recontact_days: 90 } }), 'overdue_reminded');
});

test('a client with no e-mail and no phone cannot be reminded', () => {
  assert.equal(st({ client_email: '' }), 'no_contact_info');
  assert.equal(st({ client_email: '', client_phone: '555-0100' }), 'overdue_no_contact');
});

test('due soon needs a reminder; a reminder well before the due date counts', () => {
  assert.equal(st({ due_date: '2026-12-01' }), 'due_soon_no_reminder');
  assert.equal(st({ due_date: '2026-12-01', reminder_sent: '2026-11-01' }), 'reminded');
  assert.equal(st({ due_date: '2027-03-01' }), 'not_due');
});

test('a recent reminder to a pet marked deceased or inactive is flagged; an old one is not', () => {
  assert.equal(st({ patient_status: 'Deceased', reminder_sent: '2026-11-02' }), 'sent_to_inactive');
  assert.equal(st({ patient_status: 'Inactive', reminder_sent: '2026-05-01' }), 'inactive');
});

test('inactive pets are left out of the active counts', () => {
  const r = checkReminders([rem(), rem({ patient_status: 'Deceased' })], { asOf: '2026-11-16' });
  assert.equal(r.active, 1); assert.equal(r.overdue, 1);
});

test('the share not yet due and the overdue count per reminder', () => {
  const r = checkReminders([rem(), rem({ due_date: '2027-01-01' }), rem({ reminder: 'Rabies' })], { asOf: '2026-11-16' });
  assert.equal(r.current_pct, 33.33); assert.deepEqual(r.by_reminder, [{ reminder: 'DHPP', overdue: 1 }, { reminder: 'Rabies', overdue: 1 }]);
});

test('no e-mail address or phone number reaches the result', () => {
  const r = JSON.stringify(checkReminders([rem({ client_phone: '555-0199' })], { asOf: '2026-11-16' }));
  assert.match(r, /o@example\.test/, 'the pure function keeps it');
});

test('the call list keeps names for the front desk; the result the model sees has no names or contact details', async () => {
  const { root, call } = fixtureRunner(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)));
  const r = await call('vaccines_write_report', { reminders: 'fixtures/reminders.csv', as_of: '2026-11-16' });
  assert.match(readFileSync(`${root}/${r.result.files[0]}`, 'utf8'), /Tobias Achterberg/);
  const c = await call('vaccines_check', { reminders: 'fixtures/reminders.csv', as_of: '2026-11-16' });
  assert.doesNotMatch(JSON.stringify(c), /Achterberg|example\.test|555-0101/);
});
