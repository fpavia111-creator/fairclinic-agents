// Fairclinic Pre-authorizations: dental pre-authorizations and pre-treatment estimates that need a person.
import { fld, str, num, round2, isoDate, daysBetween, payerKey, tally, rollup } from 'fairclinic-core';

export const PREAUTH_FIELDS = Object.freeze({
  preauth_id: fld(['Pre-auth #', 'Preauth ID', 'Predetermination #', 'Pre-D #', 'Pre-Treatment #', 'Estimate #'], { required: true, translate: false }),
  patient_name: fld(['Patient', 'Patient Name']),
  payer: fld(['Carrier', 'Carrier Name', 'Insurance', 'Payer']),
  provider: fld(['Provider', 'Dentist', 'Treating Provider']),
  code: fld(['Procedure', 'Code', 'CDT', 'CDT Code', 'Proc Code'], { translate: false }),
  fee: fld(['Fee', 'Office Fee', 'Procedure Fee'], { type: 'money', translate: 'charge' }),
  requested: fld(['Requested', 'Est. Insurance', 'Estimate', 'Est Ins', 'Expected Insurance'], { type: 'money', translate: false }),
  created: fld(['Created', 'Date Created', 'Entry Date', 'Date Planned'], { type: 'date', translate: false }),
  date_sent: fld(['Date Sent', 'Sent', 'Sent Date', 'Submitted'], { type: 'date', translate: false }),
  status: fld(['Status', 'Pre-auth Status', 'Determination'], { translate: false }),
  response_date: fld(['Response Date', 'Date Received', 'Determination Date', 'Received'], { type: 'date', translate: false }),
  approved_amount: fld(['Approved Amount', 'Approved', 'Ins Approved', 'Allowed Benefit'], { type: 'money', translate: false }),
  valid_until: fld(['Valid Until', 'Expires', 'Expiration Date', 'Approval Expires', 'Good Through'], { type: 'date', translate: 'expires' }),
  scheduled_date: fld(['Scheduled', 'Scheduled Date', 'Appointment', 'Next Appt', 'Appt Date'], { type: 'date', translate: false }),
  completed_date: fld(['Completed', 'Date Completed', 'Completed Date'], { type: 'date', translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    response_days: { type: 'integer', minimum: 5, maximum: 120, description: 'Days after sending before a missing answer is chased (default 30)' },
    expiry_warn_days: { type: 'integer', minimum: 5, maximum: 120, description: 'Warn this many days before an approval runs out (default 30)' },
    unsent_days: { type: 'integer', minimum: 1, maximum: 60, description: 'Days after creating before an unsent request is flagged (default 5)' },
    reduced_pct: { type: 'number', minimum: 1, maximum: 100, description: 'Approved below this percent of the amount requested is flagged as reduced (default 80)' },
  },
});

export const STATUSES = ['done_after_expiry', 'expired', 'scheduled_after_expiry', 'denied', 'expiring', 'no_response', 'approved_unscheduled', 'not_sent', 'reduced', 'pending', 'ok'];
const APPROVED = /^(approved|approve|approved partial|partial|partially approved|accepted|a)$/i;
const DENIED = /^(denied|deny|rejected|not approved|d)$/i;

export function checkPreauths(rows, { settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10);
  const respDays = settings.response_days || 30, warn = settings.expiry_warn_days || 30, unsent = settings.unsent_days || 5, reducedPct = settings.reduced_pct || 80;
  const items = rows.filter((r) => str(r.preauth_id)).map((r) => {
    const st = str(r.status); const sent = isoDate(r.date_sent); const until = isoDate(r.valid_until);
    const sched = isoDate(r.scheduled_date); const done = isoDate(r.completed_date);
    const approved = num(r.approved_amount); const requested = num(r.requested);
    const f = []; const add = (code, detail) => f.push({ code, detail });
    if (APPROVED.test(st)) {
      if (done && until && done > until) add('done_after_expiry', `Completed ${done}, after the approval ran out on ${until}; the carrier may not pay as estimated.`);
      else if (!done && until && until < today) add('expired', `Approved, but the approval ran out on ${until} and the work is not recorded as done.`);
      else if (!done && sched && until && sched > until) add('scheduled_after_expiry', `Scheduled for ${sched}, after the approval runs out on ${until}; move the visit or ask for a new pre-authorization.`);
      // A visit already booked before the approval ends needs nothing (found by the clean-set accuracy run, 19 Nov 2026).
      else if (!done && !sched && until && daysBetween(today, until) <= warn) add('expiring', `The approval runs out in ${daysBetween(today, until)} day(s) (${until}) and nothing is scheduled.`);
      if (!done && !sched && !(until && until < today)) add('approved_unscheduled', `Approved for ${approved ?? 'an amount not shown'} and not scheduled.`);
      if (approved !== null && requested && approved < requested * reducedPct / 100) add('reduced', `Approved ${approved} of the ${requested} requested (${round2((approved / requested) * 100)}%); the patient's share changes.`);
    } else if (DENIED.test(st)) add('denied', `Denied${isoDate(r.response_date) ? ` on ${isoDate(r.response_date)}` : ''}; the dentist and patient decide what happens next.`);
    else if (sent) { const d = daysBetween(sent, today); if (d > respDays) add('no_response', `Sent ${d} days ago with no answer recorded.`); }
    else { const c = isoDate(r.created); const d = c ? daysBetween(c, today) : null; if (d !== null && d > unsent) add('not_sent', `Created ${d} days ago and not sent.`); }
    const status = STATUSES.find((s) => f.some((x) => x.code === s)) || (APPROVED.test(st) || done ? 'ok' : 'pending');
    return { preauth_id: str(r.preauth_id), patient_name: str(r.patient_name), payer: str(r.payer), provider: str(r.provider), code: str(r.code), fee: num(r.fee), requested, approved_amount: approved, date_sent: sent, valid_until: until, scheduled_date: sched, completed_date: done, status, findings: f };
  });
  items.sort((a, b) => (a.preauth_id < b.preauth_id ? -1 : a.preauth_id > b.preauth_id ? 1 : 0));
  const by = tally(items, 'status');
  const value = (sts) => round2(items.filter((i) => sts.includes(i.status)).reduce((s, i) => s + (i.approved_amount || 0), 0));
  return {
    as_of: today, preauths: items.length, needs_action: items.filter((i) => !['ok', 'pending'].includes(i.status)).length,
    approved_at_risk: value(['expiring', 'approved_unscheduled', 'scheduled_after_expiry']), expired_value: value(['expired']),
    expired: by.expired || 0, expiring: by.expiring || 0, no_response: by.no_response || 0, denied: by.denied || 0, not_sent: by.not_sent || 0,
    reduced: items.filter((i) => i.findings.some((x) => x.code === 'reduced')).length,
    by_status: by, by_payer: rollup(items.filter((i) => !['ok', 'pending'].includes(i.status)), (i) => i.payer || 'unknown', { amount: 'approved_amount', label: 'payer' }).map(({ claims: _c, ...r }) => r),
    items,
  };
}
