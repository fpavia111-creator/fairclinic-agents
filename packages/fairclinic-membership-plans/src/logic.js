// Fairclinic Membership Plans: in-house membership (savings) plan billing for one month, against the roster.
import { fld, str, num, round2, isoDate, daysBetween, tally } from 'fairclinic-core';

export const MEMBER_FIELDS = Object.freeze({
  patient_name: fld(['Member', 'Patient', 'Patient Name', 'Member Name', 'Name'], { required: true }),
  plan: fld(['Plan', 'Membership', 'Plan Name', 'Membership Plan'], { translate: false }),
  fee: fld(['Fee', 'Plan Fee', 'Price', 'Amount', 'Monthly Fee'], { type: 'money', required: true, translate: false }),
  billing: fld(['Billing', 'Frequency', 'Billing Cycle', 'Interval'], { translate: false }),
  start_date: fld(['Start Date', 'Joined', 'Enrolled', 'Start'], { type: 'date', translate: 'start_date' }),
  status: fld(['Status', 'Membership Status'], { translate: false }),
  cancel_date: fld(['Cancel Date', 'Cancelled', 'End Date', 'Canceled'], { type: 'date', translate: false }),
  renewal_date: fld(['Renewal Date', 'Renews', 'Next Renewal', 'Expires'], { type: 'date', translate: false }),
});
export const PAYMENT_FIELDS = Object.freeze({
  patient_name: fld(['Member', 'Customer', 'Customer Name', 'Patient', 'Name', 'Description'], { required: true }),
  date: fld(['Date', 'Payment Date', 'Created', 'Charge Date'], { type: 'date', required: true }),
  amount: fld(['Amount', 'Charged', 'Payment Amount', 'Gross'], { type: 'money', required: true }),
  status: fld(['Status', 'Result', 'Payment Status'], { translate: false }),
});
export const VISIT_FIELDS = Object.freeze({
  patient_name: fld(['Patient', 'Patient Name', 'Member'], { required: true }),
  date: fld(['Date', 'Visit Date', 'Date of Service'], { type: 'date', required: true }),
  code: fld(['Code', 'Procedure', 'CDT'], { translate: false }),
  discount: fld(['Discount', 'Member Discount', 'Plan Discount'], { type: 'money', translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    renewal_warn_days: { type: 'integer', minimum: 1, maximum: 90, description: 'Flag annual renewals within this many days (default 30)' },
    tolerance: { type: 'number', minimum: 0, maximum: 5, description: 'Amount differences up to this are equal (default 0.01)' },
  },
});

export const STATUSES = ['billed_after_cancel', 'used_after_lapse', 'failed_not_retried', 'missed_payment', 'wrong_amount', 'annual_lapsed', 'not_in_roster', 'renewal_due', 'ok'];
const OK_PAY = /^(succeeded|success|paid|approved|settled|captured|complete|completed|)$/i;
const key = (s) => str(s).toLowerCase().replace(/\s+/g, ' ');

export function checkMemberships(members, payments, visits = [], { month, settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10);
  const m = /^\d{4}-\d{2}$/.test(String(month || '')) ? month : today.slice(0, 7);
  const mStart = `${m}-01`; const mEnd = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const warn = settings.renewal_warn_days || 30, tol = settings.tolerance ?? 0.01;
  const pays = new Map(); for (const p of payments) { const k = key(p.patient_name); if (!k || !isoDate(p.date)) continue; (pays.get(k) || pays.set(k, []).get(k)).push({ date: isoDate(p.date), amount: round2(num(p.amount) || 0), ok: OK_PAY.test(str(p.status)) }); }
  const vis = new Map(); for (const v of visits) { const k = key(v.patient_name); if (!k || !isoDate(v.date)) continue; (vis.get(k) || vis.set(k, []).get(k)).push({ date: isoDate(v.date), code: str(v.code), discount: num(v.discount) }); }
  const roster = new Set();
  const items = members.filter((r) => str(r.patient_name)).map((r) => {
    const k = key(r.patient_name); roster.add(k);
    const fee = round2(num(r.fee) || 0); const annual = /^(annual|yearly|year|12 months|a)$/i.test(str(r.billing));
    const start = isoDate(r.start_date); const cancel = isoDate(r.cancel_date); const renew = isoDate(r.renewal_date);
    const cancelled = !!cancel || /^(cancel+ed|inactive|ended|lapsed)$/i.test(str(r.status));
    const inMonth = (pays.get(k) || []).filter((p) => p.date >= mStart && p.date <= mEnd);
    const good = inMonth.filter((p) => p.ok); const failed = inMonth.filter((p) => !p.ok);
    const f = []; const add = (code, detail) => f.push({ code, detail });
    if (cancel) for (const p of good.filter((x) => x.date > cancel)) add('billed_after_cancel', `Charged ${p.amount} on ${p.date}, after the membership ended on ${cancel}. A person decides about a refund.`);
    const lapsedOn = cancel || (annual && renew && renew < today && !(pays.get(k) || []).some((p) => p.ok && p.date >= renew) ? renew : null);
    if (lapsedOn) for (const v of (vis.get(k) || []).filter((x) => x.date > lapsedOn)) add('used_after_lapse', `A visit on ${v.date}${v.code ? ` (${v.code})` : ''}${v.discount ? ` with a ${v.discount} member discount` : ''}, after the membership ended on ${lapsedOn}.`);
    if (annual && renew && renew < today && lapsedOn === renew) add('annual_lapsed', `The annual renewal on ${renew} has no payment.`);
    if (annual && renew && renew >= today && daysBetween(today, renew) <= warn) add('renewal_due', `Renews in ${daysBetween(today, renew)} day(s) (${renew}) for ${fee}.`);
    const activeAllMonth = !annual && start && start <= mEnd && !(cancel && cancel < mStart);
    if (activeAllMonth && !good.length && failed.length) add('failed_not_retried', `The ${m} charge failed on ${failed.map((p) => p.date).join(', ')} and was not collected later in the month.`);
    else if (activeAllMonth && !good.length && !(cancel && cancel <= mEnd)) add('missed_payment', `No ${m} charge for ${fee} in the payment file.`);
    if (!annual) for (const p of good.filter((x) => !cancel || x.date <= cancel)) if (Math.abs(p.amount - fee) > tol) add('wrong_amount', `Charged ${p.amount} on ${p.date}; the plan fee is ${fee}.`);
    return { patient_name: str(r.patient_name), plan: str(r.plan), billing: annual ? 'annual' : 'monthly', fee, start_date: start, cancel_date: cancel, renewal_date: renew, collected: round2(good.reduce((s, p) => s + p.amount, 0)), status: STATUSES.find((s) => f.some((x) => x.code === s)) || (cancelled ? 'ok' : 'ok'), findings: f };
  });
  for (const [k, ps] of pays) {
    if (roster.has(k)) continue; const inMonth = ps.filter((p) => p.ok && p.date >= mStart && p.date <= mEnd); if (!inMonth.length) continue;
    const name = str((payments.find((p) => key(p.patient_name) === k) || {}).patient_name);
    items.push({ patient_name: name, plan: '', billing: '', fee: null, start_date: null, cancel_date: null, renewal_date: null, collected: round2(inMonth.reduce((s, p) => s + p.amount, 0)), status: 'not_in_roster', findings: [{ code: 'not_in_roster', detail: `Charged ${inMonth.map((p) => p.amount).join(', ')} in ${m} but not on the membership roster.` }] });
  }
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (a.patient_name < b.patient_name ? -1 : 1));
  const expected = round2(items.filter((i) => i.billing === 'monthly' && i.start_date && i.start_date <= mEnd && !(i.cancel_date && i.cancel_date < mStart)).reduce((s, i) => s + i.fee, 0));
  const t = tally(items, 'status');
  return { month: m, as_of: today, members: items.filter((i) => i.status !== 'not_in_roster').length, expected_monthly: expected, collected: round2(items.reduce((s, i) => s + i.collected, 0)), to_review: items.filter((i) => i.status !== 'ok').length, by_status: t, by_finding: tally(items, (i) => i.findings.map((f) => f.code)), items };
}
