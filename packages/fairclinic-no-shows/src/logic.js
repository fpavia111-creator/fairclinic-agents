// Fairclinic No-shows: missed and late-cancelled appointments, who was not rebooked, repeat no-shows and rates by provider.
import { fld, str, num, round2, isoDate, daysBetween, pct, tally } from 'fairclinic-core';

export const APPOINTMENT_FIELDS = Object.freeze({
  appointment_id: fld(['Appointment', 'Appt ID', 'Appointment ID', 'ID'], { required: true, translate: false }),
  patient_name: fld(['Patient', 'Patient Name', 'Pet']),
  provider: fld(['Provider', 'Doctor', 'Hygienist', 'Column', 'Operatory'], { translate: 'provider' }),
  date: fld(['Date', 'Appointment Date', 'Appt Date', 'Scheduled For'], { type: 'date', required: true }),
  appointment_type: fld(['Type', 'Appointment Type', 'Reason', 'Procedure'], { translate: false }),
  status: fld(['Status', 'Appointment Status', 'Outcome'], { required: true, translate: false }),
  cancelled_on: fld(['Cancelled On', 'Cancel Date', 'Cancelled'], { type: 'date', translate: false }),
  rebooked: fld(['Rebooked', 'Rebooked For', 'Next Appointment', 'Rescheduled To'], { type: 'date', translate: false }),
  fee_charged: fld(['Fee Charged', 'No-show Fee', 'Cancellation Fee', 'Fee'], { type: 'money', translate: false }),
  scheduled_value: fld(['Scheduled Value', 'Scheduled Production', 'Value', 'Est Production'], { type: 'money', translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    late_cancel_days: { type: 'integer', minimum: 0, maximum: 14, description: 'A cancellation fewer than this many days before the visit is late (default 2)' },
    no_show_fee: { type: 'number', minimum: 0, maximum: 10000, description: 'Your no-show fee, if your policy has one; no-shows without it are listed for a person to decide (default none)' },
  },
});

export const STATUSES = ['repeat_no_show', 'no_show_not_rebooked', 'late_cancel_not_rebooked', 'fee_not_charged', 'ok'];
const NOSHOW = /no[\s-]?show|missed|broken|dna|failed/i, CANCEL = /cancel/i;

export function checkNoShows(rows, { settings = {} } = {}) {
  const late = settings.late_cancel_days ?? 2, fee = settings.no_show_fee || 0;
  const appts = rows.filter((r) => str(r.appointment_id) && isoDate(r.date)).map((r) => ({ r, id: str(r.appointment_id), date: isoDate(r.date), patient: str(r.patient_name), st: str(r.status) })).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));
  const seenNoShow = new Map();
  const items = appts.map(({ r, id, date, patient, st }) => {
    const noShow = NOSHOW.test(st); const cancelled = !noShow && CANCEL.test(st);
    const canc = isoDate(r.cancelled_on); const before = cancelled && canc ? daysBetween(canc, date) : null;
    const isLate = cancelled && before !== null && before < late; const reb = isoDate(r.rebooked); const value = num(r.scheduled_value);
    const f = []; const add = (code, detail) => f.push({ code, detail });
    if (noShow) {
      const k = patient.toLowerCase(); const n = (seenNoShow.get(k) || 0) + 1; seenNoShow.set(k, n);
      if (n >= 2 && patient) add('repeat_no_show', `No-show number ${n} for this patient in the file.`);
      if (!reb) add('no_show_not_rebooked', `Missed the ${date} appointment and is not rebooked.`);
      if (fee && !(num(r.fee_charged) > 0)) add('fee_not_charged', `Your policy has a ${fee} no-show fee and none was charged; a person decides whether to charge or waive it.`);
    } else if (isLate && !reb) add('late_cancel_not_rebooked', `Cancelled ${before === 0 ? 'the same day' : `${before} day(s) before`} and not rebooked.`);
    return { appointment_id: id, patient_name: patient, provider: str(r.provider), date, appointment_type: str(r.appointment_type), outcome: noShow ? 'no_show' : cancelled ? (isLate ? 'late_cancel' : 'cancelled') : 'kept', rebooked: reb, scheduled_value: value, status: STATUSES.find((s) => f.some((x) => x.code === s)) || 'ok', findings: f };
  });
  const prov = new Map(); for (const i of items) { const k = i.provider || '(none)'; const x = prov.get(k) || { provider: k, appointments: 0, no_shows: 0, late_cancels: 0 }; x.appointments++; if (i.outcome === 'no_show') x.no_shows++; if (i.outcome === 'late_cancel') x.late_cancels++; prov.set(k, x); }
  const by_provider = [...prov.values()].map((x) => ({ ...x, no_show_pct: pct(x.no_shows, x.appointments) })).sort((a, b) => b.no_show_pct - a.no_show_pct || (a.provider < b.provider ? -1 : 1));
  const ns = items.filter((i) => i.outcome === 'no_show').length, lc = items.filter((i) => i.outcome === 'late_cancel').length;
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (a.date < b.date ? -1 : 1));
  return { appointments: items.length, no_shows: ns, late_cancels: lc, no_show_pct: pct(ns, items.length), late_cancel_pct: pct(lc, items.length), unfilled_value: round2(items.filter((i) => ['no_show', 'late_cancel'].includes(i.outcome)).reduce((s, i) => s + (i.scheduled_value || 0), 0)), to_review: items.filter((i) => i.status !== 'ok').length, by_status: tally(items, 'status'), by_finding: tally(items, (i) => i.findings.map((x) => x.code)), by_provider, items };
}
