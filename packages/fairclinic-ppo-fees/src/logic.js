// Fairclinic PPO Fees: the office fee schedule against each PPO's allowed amounts and what the PPO actually allowed.
import { fld, str, num, round2, payerKey, tally } from 'fairclinic-core';

export const FEE_FIELDS = Object.freeze({
  code: fld(['Code', 'CDT', 'CDT Code', 'Procedure', 'Proc Code', 'ProcCode'], { required: true, translate: false }),
  description: fld(['Description', 'Procedure Description', 'Descript']),
  office_fee: fld(['Office Fee', 'Fee', 'UCR', 'Standard Fee', 'Amount'], { type: 'money', required: true, translate: 'charge' }),
});
export const SCHEDULE_FIELDS = Object.freeze({
  // A payer's published schedule has one plan per file and no plan column: the plan argument names it.
  // Proc and Office Fees are the Montana Medicaid dental schedule's own names (tested on the public file, 19 Nov 2026).
  plan: fld(['Plan', 'PPO', 'Carrier', 'Fee Schedule', 'Payer'], { translate: 'payer' }),
  code: fld(['Code', 'CDT', 'CDT Code', 'Procedure', 'Proc Code', 'Proc', 'Procedure Code'], { required: true, translate: false }),
  allowed: fld(['Allowed', 'Allowed Amount', 'PPO Fee', 'Max Allowable', 'Maximum Allowable', 'Contracted Fee', 'Fee', 'Fees', 'Office Fees', 'Max Fee', 'Fee Amount'], { type: 'money', required: true, translate: 'allowed' }),
});
export const PAID_FIELDS = Object.freeze({
  plan: fld(['Plan', 'PPO', 'Carrier', 'Payer'], { required: true, translate: 'payer' }),
  code: fld(['Code', 'CDT', 'CDT Code', 'Procedure', 'Proc Code'], { required: true, translate: false }),
  allowed: fld(['Allowed', 'Allowed Amount', 'Allowed Paid', 'Ins Allowed'], { type: 'money', required: true, translate: 'allowed' }),
  date_of_service: fld(['Date of Service', 'DOS', 'Service Date', 'Date'], { type: 'date' }),
  patient_name: fld(['Patient', 'Patient Name']),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    tolerance: { type: 'number', minimum: 0, maximum: 10, description: 'Differences up to this amount are equal (default 0.5)' },
    deep_discount_pct: { type: 'number', minimum: 1, maximum: 99, description: 'Flag codes where the PPO allows less than the office fee by more than this percent (default 45)' },
  },
});

// not_offered: a code on a plan's schedule with no office fee and no allowed line: listed, not counted as to review
// (a payer's full schedule lists hundreds of codes a practice never bills; found on the Montana Medicaid schedule, 19 Nov 2026).
export const STATUSES = ['paid_below_schedule', 'fee_below_allowed', 'not_in_schedule', 'no_office_fee', 'deep_discount', 'not_offered', 'ok'];

export function checkFees(fees, schedules, paid = [], { settings = {} } = {}) {
  const tol = settings.tolerance ?? 0.5, deep = settings.deep_discount_pct || 45;
  const code = (v) => str(v).toUpperCase();
  const office = new Map(); for (const f of fees) if (code(f.code)) office.set(code(f.code), { fee: num(f.office_fee), description: str(f.description) });
  const sched = new Map(); const planName = new Map();
  for (const s of schedules) { const p = payerKey(s.plan), c = code(s.code); if (!p || !c) continue; planName.set(p, planName.get(p) || str(s.plan)); sched.set(`${p}|${c}`, num(s.allowed)); }
  const lines = new Map();
  for (const l of paid) { const p = payerKey(l.plan), c = code(l.code); if (!p || !c) continue; planName.set(p, planName.get(p) || str(l.plan)); const k = `${p}|${c}`; const x = lines.get(k) || []; x.push(num(l.allowed)); lines.set(k, x); }
  const keys = [...new Set([...sched.keys(), ...lines.keys()])].sort();
  const items = keys.map((k) => {
    const [p, c] = k.split('|'); const o = office.get(c); const allowed = sched.has(k) ? sched.get(k) : null; const paidAllowed = (lines.get(k) || []).filter((x) => x !== null);
    const fee = o ? o.fee : null; const n = paidAllowed.length;
    const f = []; const add = (code2, detail, amount = null) => f.push({ code: code2, detail, amount });
    if (allowed === null && n) add('not_in_schedule', `${n} line(s) allowed by this plan, but ${c} is not in its fee schedule file; add it or ask the plan for the contracted fee.`);
    if (allowed !== null && fee === null && n) add('no_office_fee', `${c} has a plan fee of ${allowed} and no office fee in your fee schedule; the plan allowed ${n} line(s) of it.`);
    // Plans usually allow the lower of the office fee and their own fee, so a line capped at your fee is not underpaid.
    const expected = allowed !== null && fee !== null ? Math.min(fee, allowed) : allowed;
    if (expected !== null && n) { const under = paidAllowed.filter((x) => x < expected - tol); if (under.length) add('paid_below_schedule', `${under.length} of ${n} line(s) allowed below the plan's own fee of ${expected} (lowest ${Math.min(...under)}); ${round2(under.reduce((s, x) => s + (expected - x), 0))} in total.`, round2(under.reduce((s, x) => s + (expected - x), 0))); }
    if (allowed !== null && fee !== null && fee < allowed - tol) { const est = round2((allowed - fee) * n); add('fee_below_allowed', `Your office fee ${fee} is below the plan's allowed ${allowed}; plans usually pay the lower of the two${n ? `, so about ${est} was left on ${n} line(s)` : ''}.`, n ? est : null); }
    const writeoffPct = allowed !== null && fee ? round2(((fee - allowed) / fee) * 100) : null;
    if (writeoffPct !== null && writeoffPct > deep) add('deep_discount', `The plan allows ${allowed} against your ${fee}: a ${writeoffPct}% write-off on every ${c}.`);
    const status = STATUSES.find((s) => f.some((x) => x.code === s)) || (allowed !== null && fee === null ? 'not_offered' : 'ok');
    return { plan: planName.get(p), code: c, description: o ? o.description : '', office_fee: fee, plan_allowed: allowed, lines_paid: n, avg_allowed_paid: n ? round2(paidAllowed.reduce((s, x) => s + x, 0) / n) : null, writeoff_pct: writeoffPct, status, findings: f };
  });
  const byPlan = new Map();
  for (const i of items.filter((x) => x.writeoff_pct !== null)) { const x = byPlan.get(i.plan) || { plan: i.plan, codes: 0, sum: 0 }; x.codes++; x.sum += i.writeoff_pct; byPlan.set(i.plan, x); }
  const amount = (c) => round2(items.flatMap((i) => i.findings).filter((x) => x.code === c).reduce((s, x) => s + (x.amount || 0), 0));
  const t = tally(items, (i) => i.findings.map((x) => x.code));
  return {
    plans: byPlan.size, codes_checked: items.length, needs_review: items.filter((i) => !['ok', 'not_offered'].includes(i.status)).length, not_offered: items.filter((i) => i.status === 'not_offered').length,
    paid_below_schedule: t.paid_below_schedule || 0, underpaid_amount: amount('paid_below_schedule'),
    fee_below_allowed: t.fee_below_allowed || 0, left_by_low_fees: amount('fee_below_allowed'),
    not_in_schedule: t.not_in_schedule || 0, no_office_fee: t.no_office_fee || 0, deep_discount: t.deep_discount || 0,
    by_plan: [...byPlan.values()].map((x) => ({ plan: x.plan, codes: x.codes, avg_writeoff_pct: round2(x.sum / x.codes) })).sort((a, b) => b.avg_writeoff_pct - a.avg_writeoff_pct),
    items,
  };
}
