// Fairclinic Wellness Plans: veterinary wellness plan billing for one month and plan use against what the plan includes.
import { fld, str, num, round2, isoDate, tally } from 'fairclinic-core';

export const ENROLLMENT_FIELDS = Object.freeze({
  client_name: fld(['Client', 'Client Name', 'Owner', 'Customer'], { required: true }),
  patient_name: fld(['Patient', 'Pet', 'Animal', 'Patient Name'], { required: true }),
  plan: fld(['Plan', 'Wellness Plan', 'Plan Name'], { required: true, translate: false }),
  monthly_fee: fld(['Monthly Fee', 'Fee', 'Price', 'Monthly'], { type: 'money', translate: false }),
  start_date: fld(['Start Date', 'Enrolled', 'Start'], { type: 'date', translate: 'start_date' }),
  status: fld(['Status', 'Plan Status'], { translate: false }),
  cancel_date: fld(['Cancel Date', 'Cancelled', 'End Date'], { type: 'date', translate: false }),
});
export const PAYMENT_FIELDS = Object.freeze({
  client_name: fld(['Client', 'Customer', 'Customer Name', 'Client Name', 'Owner'], { required: true }),
  date: fld(['Date', 'Payment Date', 'Charge Date', 'Created'], { type: 'date', required: true }),
  amount: fld(['Amount', 'Charged', 'Gross'], { type: 'money', required: true }),
  status: fld(['Status', 'Result'], { translate: false }),
});
export const USAGE_FIELDS = Object.freeze({
  patient_name: fld(['Patient', 'Pet', 'Animal', 'Patient Name'], { required: true }),
  date: fld(['Date', 'Visit Date', 'Date of Service'], { type: 'date', required: true }),
  service: fld(['Service', 'Item', 'Plan Service', 'Benefit'], { required: true, translate: false }),
  qty: fld(['Qty', 'Quantity', 'Count'], { type: 'number', translate: 'qty' }),
});

const PLAN = { type: 'object', additionalProperties: false, required: ['included'], properties: { monthly_fee: { type: 'number', minimum: 0, maximum: 10000 }, included: { type: 'object', maxProperties: 50, additionalProperties: { type: 'integer', minimum: 0, maximum: 100 } } } };
export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false, required: ['plans'],
  properties: {
    note: { type: 'string', maxLength: 500 },
    plans: { type: 'object', maxProperties: 50, additionalProperties: PLAN, description: 'Each plan: monthly_fee and the services it includes per plan year, e.g. {"Adult Dog": {"monthly_fee": 35, "included": {"exam": 2}}}' },
    service_prices: { type: 'object', maxProperties: 200, additionalProperties: { type: 'number', minimum: 0, maximum: 100000 }, description: 'Your list price per service, to value plan use' },
    tolerance: { type: 'number', minimum: 0, maximum: 5, description: 'Amount differences up to this are equal (default 0.01)' },
  },
});

export const STATUSES = ['early_cancel_balance', 'failed_not_retried', 'missed_payment', 'wrong_amount', 'over_used', 'ok'];
const OK_PAY = /^(succeeded|success|paid|approved|settled|captured|complete|completed|)$/i;
const key = (s) => str(s).toLowerCase().replace(/\s+/g, ' ');
const monthsBetween = (a, b) => { const x = new Date(`${a}T00:00:00Z`), y = new Date(`${b}T00:00:00Z`); return (y.getUTCFullYear() - x.getUTCFullYear()) * 12 + (y.getUTCMonth() - x.getUTCMonth()) + (y.getUTCDate() >= x.getUTCDate() ? 1 : 0); };

export function checkWellness(enrollments, payments, usage = [], { month, settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10);
  const m = /^\d{4}-\d{2}$/.test(String(month || '')) ? month : today.slice(0, 7);
  const mStart = `${m}-01`, mEnd = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).toISOString().slice(0, 10);
  const plans = Object.fromEntries(Object.entries(settings.plans || {}).map(([k, v]) => [key(k), v]));
  const prices = Object.fromEntries(Object.entries(settings.service_prices || {}).map(([k, v]) => [key(k), v]));
  const tol = settings.tolerance ?? 0.01;
  const pays = new Map(); for (const p of payments) { const k = key(p.client_name); const d = isoDate(p.date); if (k && d) (pays.get(k) || pays.set(k, []).get(k)).push({ date: d, amount: round2(num(p.amount) || 0), ok: OK_PAY.test(str(p.status)) }); }
  const used = new Map(); for (const u of usage) { const k = key(u.patient_name); const d = isoDate(u.date); if (!k || !d) continue; (used.get(k) || used.set(k, []).get(k)).push({ date: d, service: key(u.service), qty: num(u.qty) ?? 1 }); }
  const items = enrollments.filter((e) => str(e.patient_name)).map((e) => {
    const plan = plans[key(e.plan)] || null; const fee = num(e.monthly_fee) ?? (plan && plan.monthly_fee !== undefined ? plan.monthly_fee : null);
    const start = isoDate(e.start_date), cancel = isoDate(e.cancel_date);
    const end = cancel || today; const yearStart = start;
    const f = []; const add = (code, detail) => f.push({ code, detail });
    const inMonth = (pays.get(key(e.client_name)) || []).filter((p) => p.date >= mStart && p.date <= mEnd);
    const good = inMonth.filter((p) => p.ok), failed = inMonth.filter((p) => !p.ok);
    const activeInMonth = start && start <= mEnd && !(cancel && cancel < mStart);
    if (activeInMonth && !good.length && failed.length) add('failed_not_retried', `The ${m} charge failed on ${failed.map((p) => p.date).join(', ')} and was not collected later in the month.`);
    else if (activeInMonth && !good.length && !(cancel && cancel <= mEnd)) add('missed_payment', `No ${m} charge${fee !== null ? ` for ${fee}` : ''} in the payment file.`);
    if (fee !== null) for (const p of good) if (Math.abs(p.amount - fee) > tol) add('wrong_amount', `Charged ${p.amount} on ${p.date}; the plan fee is ${fee}.`);
    const counts = {}; for (const u of (used.get(key(e.patient_name)) || []).filter((x) => !yearStart || (x.date >= yearStart && x.date <= end))) counts[u.service] = (counts[u.service] || 0) + u.qty;
    let usedValue = 0;
    for (const [svc, n] of Object.entries(counts)) {
      const inc = plan ? (plan.included[Object.keys(plan.included).find((k) => key(k) === svc)] ?? 0) : null;
      const price = prices[svc] ?? null; usedValue += (price || 0) * Math.min(n, inc ?? n);
      if (inc !== null && n > inc) add('over_used', `${n} x ${svc} used; the plan includes ${inc}${price !== null ? `. The extra ${n - inc} would be ${round2(price * (n - inc))} at list price` : ''}. Check whether it was charged.`);
    }
    const months = start ? monthsBetween(start, end) : null; const feesDue = fee !== null && months !== null ? round2(fee * months) : null;
    if (cancel && feesDue !== null && round2(usedValue) > feesDue + tol) add('early_cancel_balance', `Cancelled ${cancel} after ${months} month(s): plan services used are worth ${round2(usedValue)} at list price against ${feesDue} in plan fees, a difference of ${round2(usedValue - feesDue)}. Check what your plan agreement says about cancelling early.`);
    if (!plan) add('ok', '');
    return { client_name: str(e.client_name), patient_name: str(e.patient_name), plan: str(e.plan), plan_known: !!plan, monthly_fee: fee, start_date: start, cancel_date: cancel, months_enrolled: months, fees_due: feesDue, used_value: round2(usedValue), collected_in_month: round2(good.reduce((s, p) => s + p.amount, 0)), status: STATUSES.find((s) => s !== 'ok' && f.some((x) => x.code === s)) || 'ok', findings: f.filter((x) => x.code !== 'ok') };
  });
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (a.patient_name < b.patient_name ? -1 : 1));
  return { month: m, as_of: today, enrollments: items.length, unknown_plans: items.filter((i) => !i.plan_known).length, collected: round2(items.reduce((s, i) => s + i.collected_in_month, 0)), to_review: items.filter((i) => i.status !== 'ok').length, by_status: tally(items, 'status'), by_finding: tally(items, (i) => i.findings.map((f) => f.code)), items };
}
