// Fairclinic Vaccine Reminders: the practice system's reminder list, read for who is overdue, who was never reminded,
// who cannot be reached and reminders that went to pets marked deceased or inactive. Due dates come from your system;
// this agent never sets or changes a vaccine schedule.
import { fld, str, isoDate, daysBetween, pct, tally } from 'fairclinic-core';

export const REMINDER_FIELDS = Object.freeze({
  client_id: fld(['Client ID', 'Client #', 'Account', 'Owner ID'], { translate: false }),
  client_name: fld(['Client', 'Client Name', 'Owner', 'Owner Name']),
  patient_name: fld(['Patient Name', 'Patient', 'Pet', 'Animal'], { required: true }),
  species: fld(['Species', 'Animal Type'], { translate: false }),
  reminder: fld(['Reminder Description', 'Reminder', 'Description', 'Service', 'Vaccine'], { required: true, translate: false }),
  due_date: fld(['Due Date', 'Due', 'Date Due', 'Next Due'], { type: 'date', required: true, translate: 'due_date' }),
  last_given: fld(['Last Given', 'Last Done', 'Date Given', 'Previous'], { type: 'date', translate: false }),
  reminder_sent: fld(['Reminder Sent', 'Last Reminder', 'Sent', 'Last Sent'], { type: 'date', translate: false }),
  next_appointment: fld(['Next Appointment', 'Next Appt', 'Appointment', 'Scheduled'], { type: 'date', translate: false }),
  patient_status: fld(['Patient Status', 'Status', 'Active'], { translate: false }),
  client_email: fld(['Email', 'Client Email', 'E-mail']),
  client_phone: fld(['Phone', 'Client Phone', 'Mobile', 'Cell']),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    due_soon_days: { type: 'integer', minimum: 1, maximum: 120, description: 'Reminders due within this many days are checked for a reminder sent (default 30)' },
    recontact_days: { type: 'integer', minimum: 1, maximum: 180, description: 'An overdue reminder sent within this many days counts as reminded (default 30)' },
    inactive_lookback_days: { type: 'integer', minimum: 1, maximum: 365, description: 'A reminder sent to a deceased or inactive pet within this many days is flagged (default 60)' },
  },
});

export const STATUSES = ['sent_to_inactive', 'overdue_no_contact', 'no_contact_info', 'due_soon_no_reminder', 'overdue_reminded', 'reminded', 'booked', 'not_due', 'inactive'];
const INACTIVE = /^(deceased|dead|inactive|i|d|moved|transferred|euthanized|euthanised|archived|no)$/i;

export function checkReminders(rows, { settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10);
  const soon = settings.due_soon_days || 30, recontact = settings.recontact_days || 30, lookback = settings.inactive_lookback_days || 60;
  const items = rows.filter((r) => str(r.patient_name) && str(r.reminder)).map((r) => {
    const due = isoDate(r.due_date), sent = isoDate(r.reminder_sent), appt = isoDate(r.next_appointment);
    const sinceSent = sent ? daysBetween(sent, today) : null; const days = due ? daysBetween(today, due) : null;
    let status, detail;
    if (INACTIVE.test(str(r.patient_status))) {
      if (sent && sinceSent <= lookback) { status = 'sent_to_inactive'; detail = `A reminder went out on ${sent} for a pet marked ${str(r.patient_status).toLowerCase()}. Check the reminder settings for this pet.`; }
      else { status = 'inactive'; detail = `Marked ${str(r.patient_status).toLowerCase()}; left out of the counts.`; }
    } else if (appt && appt >= today) { status = 'booked'; detail = `Booked for ${appt}.`; }
    else if (days !== null && days < 0) {
      if (!str(r.client_email) && !str(r.client_phone)) { status = 'no_contact_info'; detail = `Overdue ${-days} days and there is no e-mail or phone on file to remind the client.`; }
      else if (sent && sinceSent <= recontact) { status = 'overdue_reminded'; detail = `Overdue ${-days} days; reminded ${sinceSent} day(s) ago.`; }
      else { status = 'overdue_no_contact'; detail = `Overdue ${-days} days (due ${due}), not booked, ${sent ? `last reminder ${sinceSent} days ago` : 'no reminder recorded'}.`; }
    } else if (days !== null && days <= soon) {
      if (sent && daysBetween(sent, due) <= 60) { status = 'reminded'; detail = `Due ${due}; reminder sent ${sent}.`; }
      else { status = 'due_soon_no_reminder'; detail = `Due in ${days} day(s) (${due}) and no reminder recorded.`; }
    } else { status = 'not_due'; detail = due ? `Due ${due}.` : 'No due date.'; }
    return { client_id: str(r.client_id), client_name: str(r.client_name), patient_name: str(r.patient_name), species: str(r.species), reminder: str(r.reminder), due_date: due, last_given: isoDate(r.last_given), reminder_sent: sent, next_appointment: appt, status, detail };
  });
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (String(a.due_date) < String(b.due_date) ? -1 : String(a.due_date) > String(b.due_date) ? 1 : `${a.patient_name}|${a.reminder}` < `${b.patient_name}|${b.reminder}` ? -1 : 1));
  const active = items.filter((i) => !['inactive', 'sent_to_inactive'].includes(i.status));
  const current = active.filter((i) => i.due_date && i.due_date >= today).length;
  const t = tally(items, 'status');
  return { as_of: today, reminders: items.length, active: active.length, current_pct: active.length ? pct(current, active.length) : null, overdue: active.filter((i) => i.due_date && i.due_date < today && i.status !== 'booked').length, to_contact: (t.overdue_no_contact || 0) + (t.due_soon_no_reminder || 0) + (t.no_contact_info || 0) + (t.sent_to_inactive || 0), by_status: t, by_reminder: Object.entries(tally(active.filter((i) => i.due_date && i.due_date < today && i.status !== 'booked'), 'reminder')).map(([reminder, overdue]) => ({ reminder, overdue })).sort((a, b) => b.overdue - a.overdue || (a.reminder < b.reminder ? -1 : 1)), items };
}
