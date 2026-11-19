// Fairclinic Recall Gaps: recall and hygiene patients who are overdue or not booked, and who leaves without a next visit.
import { fld, str, round2, isoDate, daysBetween, tally, pct } from 'fairclinic-core';

export const RECALL_FIELDS = Object.freeze({
  patient_name: fld(['Patient', 'Patient Name'], { required: true }),
  recall_type: fld(['Recall Type', 'Type', 'Recall', 'Interval Type'], { translate: false }),
  due_date: fld(['Due Date', 'Recall Due', 'Due', 'Date Due', 'DateDue'], { type: 'date', required: true, translate: 'due_date' }),
  last_visit: fld(['Last Visit', 'Previous Date', 'Last Recall', 'DatePrevious', 'Last Hygiene'], { type: 'date', translate: false }),
  next_appointment: fld(['Next Appointment', 'Next Appt', 'Scheduled', 'DateScheduled', 'Appt Date'], { type: 'date', translate: false }),
  hygienist: fld(['Hygienist', 'Provider', 'Hyg', 'RDH'], { translate: false }),
  last_contact: fld(['Last Contact', 'Contacted', 'Last Reminder', 'Reminder Sent'], { type: 'date', translate: false }),
  status: fld(['Status', 'Patient Status', 'Active'], { translate: false }),
});

export const VISIT_FIELDS = Object.freeze({
  patient_name: fld(['Patient', 'Patient Name'], { required: true }),
  visit_date: fld(['Date', 'Visit Date', 'Appointment Date', 'Date of Service'], { type: 'date', required: true, translate: 'date' }),
  hygienist: fld(['Hygienist', 'Provider', 'Hyg', 'RDH'], { translate: false }),
  next_appointment: fld(['Next Appointment', 'Next Appt', 'Rebooked For', 'Next Visit'], { type: 'date', translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    due_soon_days: { type: 'integer', minimum: 1, maximum: 120, description: 'A recall due within this many days and not booked is flagged (default 30)' },
    recontact_days: { type: 'integer', minimum: 1, maximum: 180, description: 'An overdue patient contacted within this many days is left waiting (default 30)' },
    lapsed_months: { type: 'integer', minimum: 6, maximum: 60, description: 'Overdue longer than this goes on the reactivation list (default 18)' },
    reappointment_target: { type: 'number', minimum: 1, maximum: 100, description: 'Percent of hygiene visits that should leave with the next visit booked (default 85)' },
  },
});

export const STATUSES = ['missed_appointment', 'overdue', 'lapsed', 'due_soon', 'contacted', 'scheduled', 'not_due', 'inactive'];

export function checkRecall(recalls, visits = [], { settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10);
  const soon = settings.due_soon_days || 30, recontact = settings.recontact_days || 30, lapsedDays = Math.round((settings.lapsed_months || 18) * 30.44), target = settings.reappointment_target || 85;
  const items = recalls.filter((r) => str(r.patient_name)).map((r) => {
    const due = isoDate(r.due_date); const next = isoDate(r.next_appointment); const contact = isoDate(r.last_contact);
    const overdue = due ? daysBetween(due, today) : null;
    let status, detail;
    if (/^(inactive|i|no|false|archived|moved)$/i.test(str(r.status))) { status = 'inactive'; detail = 'Marked inactive in the practice system; left out of the counts.'; }
    else if (next && next >= today) { status = 'scheduled'; detail = `Booked for ${next}.`; }
    else if (next && next < today && overdue > 0) { status = 'missed_appointment'; detail = `The booked visit on ${next} has passed and the recall (due ${due}) is still open; it was probably missed or cancelled.`; }
    else if (overdue > lapsedDays) { status = 'lapsed'; detail = `Overdue ${overdue} days (due ${due}); on the reactivation list.`; }
    else if (overdue > 0 && contact && daysBetween(contact, today) <= recontact) { status = 'contacted'; detail = `Overdue ${overdue} days; contacted ${daysBetween(contact, today)} day(s) ago.`; }
    else if (overdue > 0) { status = 'overdue'; detail = `Overdue ${overdue} days (due ${due}), not booked${contact ? `, last contact ${contact}` : ', no contact recorded'}.`; }
    else if (overdue !== null && -overdue <= soon) { status = 'due_soon'; detail = `Due in ${-overdue} day(s) (${due}) and not booked.`; }
    else { status = 'not_due'; detail = due ? `Due ${due}.` : 'No due date.'; }
    return { patient_name: str(r.patient_name), recall_type: str(r.recall_type), hygienist: str(r.hygienist), due_date: due, days_overdue: overdue > 0 ? overdue : 0, last_visit: isoDate(r.last_visit), next_appointment: next, last_contact: contact, status, detail };
  });
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || b.days_overdue - a.days_overdue || (a.patient_name < b.patient_name ? -1 : 1));
  const hyg = new Map();
  for (const v of visits) {
    if (!str(v.patient_name) || !isoDate(v.visit_date)) continue;
    const k = str(v.hygienist) || 'unknown'; const x = hyg.get(k) || { hygienist: k, visits: 0, reappointed: 0, left_without: [] };
    const next = isoDate(v.next_appointment); x.visits++;
    if (next && next > isoDate(v.visit_date)) x.reappointed++; else x.left_without.push(str(v.patient_name));
    hyg.set(k, x);
  }
  const hygienists = [...hyg.values()].map((x) => ({ hygienist: x.hygienist, visits: x.visits, reappointed: x.reappointed, rate_pct: pct(x.reappointed, x.visits), status: pct(x.reappointed, x.visits) < target ? 'below_target' : 'ok', left_without: x.left_without.length })).sort((a, b) => (a.hygienist < b.hygienist ? -1 : 1));
  const t = tally(items, 'status');
  const allVisits = hygienists.reduce((s, h) => s + h.visits, 0), allRe = hygienists.reduce((s, h) => s + h.reappointed, 0);
  return {
    as_of: today, patients: items.length, to_contact: (t.overdue || 0) + (t.lapsed || 0) + (t.due_soon || 0) + (t.missed_appointment || 0),
    overdue: t.overdue || 0, lapsed: t.lapsed || 0, due_soon: t.due_soon || 0, missed_appointments: t.missed_appointment || 0, contacted: t.contacted || 0, scheduled: t.scheduled || 0,
    booked_pct: pct(t.scheduled || 0, items.filter((i) => i.status !== 'inactive').length),
    reappointment_pct: allVisits ? round2(pct(allRe, allVisits)) : null, hygienists_below_target: hygienists.filter((h) => h.status !== 'ok').length,
    by_status: t, hygienists, items,
  };
}
