// Fairclinic Unscheduled Treatment: treatment planned and not booked, per patient, with benefits left this year.
import { fld, str, num, round2, isoDate, daysBetween, tally } from 'fairclinic-core';

export const PLAN_FIELDS = Object.freeze({
  patient_name: fld(['Patient', 'Patient Name'], { required: true }),
  provider: fld(['Provider', 'Dentist', 'Treating Provider']),
  code: fld(['Procedure', 'Code', 'CDT', 'CDT Code', 'Proc Code'], { translate: false }),
  description: fld(['Description', 'Procedure Description', 'Treatment']),
  fee: fld(['Fee', 'Treatment Fee', 'Office Fee', 'Amount'], { type: 'money', translate: 'charge' }),
  est_insurance: fld(['Est. Insurance', 'Estimated Insurance', 'Ins Est', 'Insurance Estimate'], { type: 'money', translate: false }),
  status: fld(['Status', 'Plan Status', 'Treatment Status'], { translate: false }),
  date_planned: fld(['Date Planned', 'Planned', 'Date Presented', 'Plan Date', 'Created'], { type: 'date', translate: false }),
  scheduled_date: fld(['Scheduled', 'Scheduled Date', 'Appointment', 'Next Appt', 'Appt Date'], { type: 'date', translate: false }),
  remaining_benefit: fld(['Remaining Benefit', 'Benefits Remaining', 'Annual Max Remaining', 'Remaining Max'], { type: 'money', translate: false }),
  benefit_year_end: fld(['Benefit Year End', 'Plan Year End', 'Benefit Renewal'], { type: 'date', translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    stale_days: { type: 'integer', minimum: 90, maximum: 1095, description: 'A plan older than this is set aside for the dentist to review (default 365)' },
    benefits_warn_days: { type: 'integer', minimum: 7, maximum: 180, description: 'Flag remaining benefits when the benefit year ends within this many days (default 60)' },
    min_value: { type: 'number', minimum: 0, maximum: 100000, description: 'Leave out patients whose unscheduled treatment is below this amount (default 0)' },
  },
});

export const STATUSES = ['benefits_expiring', 'accepted_unscheduled', 'proposed_unscheduled', 'stale', 'declined', 'scheduled', 'done'];
const ACCEPTED = /^(accepted|accept|approved|a)$/i, PROPOSED = /^(proposed|planned|recommended|pending|presented|tp|p)$/i;
const DECLINED = /^(declined|rejected|refused|d)$/i, DONE = /^(completed|complete|done|c)$/i, SCHED = /^(scheduled|booked|s)$/i;

export function checkTreatment(rows, { settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10);
  const staleDays = settings.stale_days || 365, warn = settings.benefits_warn_days || 60, minValue = settings.min_value || 0;
  const by = new Map();
  for (const r of rows) {
    const p = str(r.patient_name); if (!p) continue;
    const st = str(r.status); const sched = isoDate(r.scheduled_date); const planned = isoDate(r.date_planned);
    const kind = DONE.test(st) ? 'done' : DECLINED.test(st) ? 'declined' : sched || SCHED.test(st) ? 'scheduled' : planned && daysBetween(planned, today) > staleDays ? 'stale' : ACCEPTED.test(st) ? 'accepted' : PROPOSED.test(st) ? 'proposed' : 'proposed';
    const x = by.get(p) || { patient_name: p, providers: new Set(), lines: [], remaining_benefit: null, benefit_year_end: null };
    if (str(r.provider)) x.providers.add(str(r.provider));
    const rem = num(r.remaining_benefit); if (rem !== null) x.remaining_benefit = Math.max(x.remaining_benefit ?? 0, rem);
    if (isoDate(r.benefit_year_end)) x.benefit_year_end = isoDate(r.benefit_year_end);
    x.lines.push({ code: str(r.code), description: str(r.description), fee: round2(num(r.fee) || 0), est_insurance: num(r.est_insurance), date_planned: planned, scheduled_date: sched, kind });
    by.set(p, x);
  }
  const items = [...by.values()].map((x) => {
    const sum = (k) => round2(x.lines.filter((l) => l.kind === k).reduce((s, l) => s + l.fee, 0));
    const accepted = sum('accepted'), proposed = sum('proposed'), stale = sum('stale');
    const yearEnd = x.benefit_year_end || `${today.slice(0, 4)}-12-31`;
    const left = daysBetween(today, yearEnd);
    const f = []; const add = (code, detail) => f.push({ code, detail });
    if ((accepted || proposed) && x.remaining_benefit > 0 && left >= 0 && left <= warn) add('benefits_expiring', `${x.remaining_benefit} of benefits shown as remaining until ${yearEnd} (${left} days), with ${round2(accepted + proposed)} of treatment not scheduled.`);
    if (accepted) add('accepted_unscheduled', `${accepted} of accepted treatment not scheduled (${x.lines.filter((l) => l.kind === 'accepted').map((l) => l.code).join(', ')}).`);
    if (proposed) add('proposed_unscheduled', `${proposed} of proposed treatment not scheduled (${x.lines.filter((l) => l.kind === 'proposed').map((l) => l.code).join(', ')}).`);
    if (stale) add('stale', `${stale} planned more than ${staleDays} days ago and not scheduled; the dentist decides whether the plan still stands.`);
    const status = f.length ? f[0].code : x.lines.some((l) => l.kind === 'scheduled') ? 'scheduled' : x.lines.some((l) => l.kind === 'declined') ? 'declined' : 'done';
    const oldest = x.lines.filter((l) => ['accepted', 'proposed', 'stale'].includes(l.kind)).map((l) => l.date_planned).filter(Boolean).sort()[0] || null;
    return { patient_name: x.patient_name, providers: [...x.providers].sort().join(', '), unscheduled_accepted: accepted, unscheduled_proposed: proposed, stale_value: stale, remaining_benefit: x.remaining_benefit, benefit_year_end: yearEnd, oldest_planned: oldest, status, findings: f, lines: x.lines };
  }).filter((i) => i.unscheduled_accepted + i.unscheduled_proposed + i.stale_value >= minValue || !['accepted_unscheduled', 'proposed_unscheduled', 'benefits_expiring', 'stale'].includes(i.status));
  items.sort((a, b) => (b.unscheduled_accepted + b.unscheduled_proposed) - (a.unscheduled_accepted + a.unscheduled_proposed) || (a.patient_name < b.patient_name ? -1 : 1));
  const t = tally(items, 'status');
  const work = items.filter((i) => ['benefits_expiring', 'accepted_unscheduled', 'proposed_unscheduled'].includes(i.status));
  return {
    as_of: today, patients: items.length, to_call: work.length,
    unscheduled_accepted: round2(items.reduce((s, i) => s + i.unscheduled_accepted, 0)), unscheduled_proposed: round2(items.reduce((s, i) => s + i.unscheduled_proposed, 0)),
    benefits_expiring: t.benefits_expiring || 0, benefits_remaining: round2(items.filter((i) => i.status === 'benefits_expiring').reduce((s, i) => s + (i.remaining_benefit || 0), 0)),
    stale: t.stale || 0, by_status: t, items,
  };
}

/** A plain letter to one patient about treatment that is not booked. It never says what care the patient needs. */
export function letterText(item, { practice, phone, from } = {}) {
  const open = item.lines.filter((l) => ['accepted', 'proposed'].includes(l.kind));
  const total = round2(open.reduce((s, l) => s + l.fee, 0));
  return { total, text: [
    `# Letter to ${item.patient_name}`, '',
    `**To:** ${item.patient_name}, [TO CONFIRM mailing address or e-mail on file]`,
    `**From:** ${from || '[TO CONFIRM your name]'}, ${practice || '[TO CONFIRM practice name]'}`, '',
    `Dear ${item.patient_name},`, '',
    `Our records show treatment that your dentist discussed with you and that is not booked yet:`, '',
    '| Code | Description | Fee | Insurance estimate |', '| --- | --- | --- | --- |',
    ...open.map((l) => `| ${l.code} | ${l.description} | ${l.fee} | ${l.est_insurance ?? ''} |`), '',
    item.remaining_benefit > 0 ? `Your plan showed ${item.remaining_benefit} of benefits remaining for the benefit year ending ${item.benefit_year_end}. This is an estimate; your plan decides what it pays.` : 'Insurance amounts are estimates; your plan decides what it pays.', '',
    `If you would like to book a visit or ask your dentist a question about it, please call us at ${phone || '[TO CONFIRM practice phone]'}.`, '',
    'Kind regards,', '', `${practice || '[TO CONFIRM practice name]'}`,
  ].join('\n') };
}
