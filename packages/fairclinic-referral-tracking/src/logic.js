// Fairclinic Referral Tracking: referrals sent out (report back?) and referrals received (seen? thanked?), with totals by source.
import { fld, str, num, round2, isoDate, daysBetween, tally } from 'fairclinic-core';

export const OUT_FIELDS = Object.freeze({
  date: fld(['Date', 'Referral Date', 'Date Referred', 'Sent'], { type: 'date', required: true }),
  patient_name: fld(['Patient', 'Patient Name', 'Pet']),
  referred_to: fld(['Referred To', 'Specialist', 'Referral To', 'Practice'], { required: true, translate: false }),
  specialty: fld(['Specialty', 'Service', 'Department'], { translate: false }),
  report_received: fld(['Report Received', 'Report Date', 'Letter Received', 'Records Received'], { type: 'date', translate: false }),
});
export const IN_FIELDS = Object.freeze({
  date: fld(['Date', 'Referral Date', 'Date Referred', 'Received'], { type: 'date', required: true }),
  patient_name: fld(['Patient', 'Patient Name', 'New Patient', 'Pet']),
  source: fld(['Source', 'Referred By', 'Referral Source', 'Referring Doctor'], { required: true, translate: false }),
  source_type: fld(['Source Type', 'Type', 'Channel'], { translate: false }),
  first_visit: fld(['First Visit', 'First Appointment', 'Seen'], { type: 'date', translate: false }),
  production: fld(['Production', 'First 90 Days', 'Revenue', 'Charges'], { type: 'money', translate: false }),
  thanked: fld(['Thanked', 'Thank You Sent', 'Thank-you Sent', 'Acknowledged'], { type: 'date', translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    report_days: { type: 'integer', minimum: 1, maximum: 180, description: 'A referral out with no report after this many days is chased (default 30)' },
    first_visit_days: { type: 'integer', minimum: 1, maximum: 180, description: 'A referral in with no first visit after this many days is followed up (default 21)' },
  },
});

export const STATUSES = ['no_report', 'no_first_visit', 'thank_you_not_sent', 'waiting', 'ok'];
const DOCTOR = /doctor|dentist|vet|dvm|dds|dmd|specialist|practice|clinic|hospital/i;

export function checkReferrals(outgoing, incoming = [], { settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10);
  const reportDays = settings.report_days || 30, visitDays = settings.first_visit_days || 21;
  const items = [];
  for (const r of outgoing.filter((x) => isoDate(x.date) && str(x.referred_to))) {
    const d = isoDate(r.date), rep = isoDate(r.report_received); const age = daysBetween(d, today);
    const status = rep ? 'ok' : age > reportDays ? 'no_report' : 'waiting';
    items.push({ direction: 'out', date: d, patient_name: str(r.patient_name), party: str(r.referred_to), specialty: str(r.specialty), first_visit: null, production: null, status, detail: rep ? `Report received ${rep}.` : status === 'no_report' ? `Referred ${age} days ago and no report back from ${str(r.referred_to)}. Ask whether the patient was seen.` : `Referred ${age} day(s) ago.` });
  }
  for (const r of incoming.filter((x) => isoDate(x.date) && str(x.source))) {
    const d = isoDate(r.date), seen = isoDate(r.first_visit), thanks = isoDate(r.thanked); const age = daysBetween(d, today);
    const fromDoctor = DOCTOR.test(str(r.source_type)) || /^dr\.?\s/i.test(str(r.source));
    let status = 'ok', detail = seen ? `First visit ${seen}.` : `Referred ${age} day(s) ago.`;
    if (!seen && age > visitDays) { status = 'no_first_visit'; detail = `Referred in ${age} days ago by ${str(r.source)} and no first visit recorded. Follow up with the patient.`; }
    else if (!seen) status = 'waiting';
    else if (fromDoctor && !thanks) { status = 'thank_you_not_sent'; detail = `Seen ${seen}; no thank-you recorded to ${str(r.source)}.`; }
    items.push({ direction: 'in', date: d, patient_name: str(r.patient_name), party: str(r.source), specialty: str(r.source_type), first_visit: seen, production: num(r.production), status, detail });
  }
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (a.date < b.date ? -1 : 1));
  const srcs = new Map(); for (const i of items.filter((x) => x.direction === 'in')) { const x = srcs.get(i.party) || { source: i.party, referrals: 0, seen: 0, production: 0 }; x.referrals++; if (i.first_visit) x.seen++; x.production = round2(x.production + (i.production || 0)); srcs.set(i.party, x); }
  const outs = new Map(); for (const i of items.filter((x) => x.direction === 'out')) { const x = outs.get(i.party) || { referred_to: i.party, referrals: 0, reports: 0 }; x.referrals++; if (i.status === 'ok') x.reports++; outs.set(i.party, x); }
  return { as_of: today, referrals_out: items.filter((i) => i.direction === 'out').length, referrals_in: items.filter((i) => i.direction === 'in').length, to_follow_up: items.filter((i) => !['ok', 'waiting'].includes(i.status)).length, by_status: tally(items, 'status'), by_source: [...srcs.values()].sort((a, b) => b.production - a.production || b.referrals - a.referrals), by_specialist: [...outs.values()].sort((a, b) => (a.referred_to < b.referred_to ? -1 : 1)), items };
}
