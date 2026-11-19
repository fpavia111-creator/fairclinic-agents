// Fairclinic Payroll Production: payroll hours and pay against what the clinic collected, per pay period.
import { fld, str, num, round2, isoDate, pct, tally } from 'fairclinic-core';

export const PAYROLL_FIELDS = Object.freeze({
  employee: fld(['Employee', 'Name', 'Staff', 'Employee Name'], { required: true, translate: 'employee' }),
  role: fld(['Role', 'Position', 'Job Title', 'Department'], { translate: 'role' }),
  period_start: fld(['Period Start', 'Pay Period Start', 'Start'], { type: 'date', required: true, translate: false }),
  period_end: fld(['Period End', 'Pay Period End', 'End', 'Pay Date'], { type: 'date', translate: false }),
  regular_hours: fld(['Regular Hours', 'Reg Hours', 'Hours', 'Regular'], { type: 'number', translate: false }),
  overtime_hours: fld(['Overtime Hours', 'OT Hours', 'Overtime', 'OT'], { type: 'number', translate: false }),
  gross_pay: fld(['Gross Pay', 'Gross', 'Total Pay', 'Earnings'], { type: 'money', required: true, translate: false }),
});
export const REVENUE_FIELDS = Object.freeze({
  period_start: fld(['Period Start', 'Start', 'From'], { type: 'date', required: true, translate: false }),
  collections: fld(['Collections', 'Collected', 'Receipts', 'Revenue'], { type: 'money', required: true, translate: false }),
  production: fld(['Production', 'Gross Production', 'Charges'], { type: 'money', translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    payroll_pct_max: { type: 'number', minimum: 1, maximum: 100, description: 'Payroll above this percent of collections in a period is flagged (default 32; your own target)' },
    overtime_hours_max: { type: 'number', minimum: 0, maximum: 100, description: 'An employee with more overtime than this in a period is listed (default 8)' },
  },
});

export const STATUSES = ['payroll_pct_high', 'no_revenue', 'overtime', 'ok'];

export function checkPayroll(payroll, revenue = [], { settings = {} } = {}) {
  const maxPct = settings.payroll_pct_max || 32, otMax = settings.overtime_hours_max ?? 8;
  const rev = new Map(); for (const r of revenue) { const d = isoDate(r.period_start); if (d) { const x = rev.get(d) || { collections: 0, production: 0 }; x.collections = round2(x.collections + (num(r.collections) || 0)); x.production = round2(x.production + (num(r.production) || 0)); rev.set(d, x); } }
  const rows = payroll.filter((p) => str(p.employee) && isoDate(p.period_start));
  const periods = [...new Set(rows.map((p) => isoDate(p.period_start)))].sort();
  const items = [];
  for (const d of periods) {
    const mine = rows.filter((p) => isoDate(p.period_start) === d);
    const reg = round2(mine.reduce((s, p) => s + (num(p.regular_hours) || 0), 0)), ot = round2(mine.reduce((s, p) => s + (num(p.overtime_hours) || 0), 0)), pay = round2(mine.reduce((s, p) => s + (num(p.gross_pay) || 0), 0));
    const r = rev.get(d); const coll = r ? r.collections : null; const pp = coll ? pct(pay, coll) : null;
    const f = []; const add = (code, detail) => f.push({ code, detail });
    if (!r) add('no_revenue', `No collections figure for the period starting ${d}; payroll percent cannot be worked out.`);
    else if (pp > maxPct) add('payroll_pct_high', `Payroll ${pay} is ${pp}% of collections (${coll}); your target is ${maxPct}%.`);
    items.push({ kind: 'period', period_start: d, period_end: isoDate(mine[0].period_end), employee: '', role: '', hours: round2(reg + ot), overtime_hours: ot, gross_pay: pay, collections: coll, payroll_pct: pp, collections_per_hour: coll && reg + ot ? round2(coll / (reg + ot)) : null, status: STATUSES.find((s) => f.some((x) => x.code === s)) || 'ok', findings: f });
    for (const p of mine) {
      const o = num(p.overtime_hours) || 0;
      if (o > otMax) items.push({ kind: 'employee', period_start: d, period_end: isoDate(p.period_end), employee: str(p.employee), role: str(p.role), hours: round2((num(p.regular_hours) || 0) + o), overtime_hours: o, gross_pay: round2(num(p.gross_pay) || 0), collections: null, payroll_pct: null, collections_per_hour: null, status: 'overtime', findings: [{ code: 'overtime', detail: `${o} overtime hours in the period starting ${d}; your flag is ${otMax}. Check cover and scheduling.` }] });
    }
  }
  items.sort((a, b) => (a.period_start < b.period_start ? -1 : a.period_start > b.period_start ? 1 : a.kind === b.kind ? (a.employee < b.employee ? -1 : 1) : a.kind === 'period' ? -1 : 1));
  const by_role = Object.values(rows.reduce((m, p) => { const k = str(p.role) || '(none)'; const x = m[k] || { role: k, employees: new Set(), hours: 0, gross_pay: 0 }; x.employees.add(str(p.employee)); x.hours = round2(x.hours + (num(p.regular_hours) || 0) + (num(p.overtime_hours) || 0)); x.gross_pay = round2(x.gross_pay + (num(p.gross_pay) || 0)); m[k] = x; return m; }, {})).map((x) => ({ ...x, employees: x.employees.size })).sort((a, b) => b.gross_pay - a.gross_pay);
  const pay = round2(rows.reduce((s, p) => s + (num(p.gross_pay) || 0), 0)); const coll = round2(periods.reduce((s, d) => s + ((rev.get(d) || {}).collections || 0), 0));
  return { periods: periods.length, employees: new Set(rows.map((p) => str(p.employee))).size, gross_pay: pay, collections: coll, payroll_pct: coll ? pct(pay, coll) : null, overtime_hours: round2(rows.reduce((s, p) => s + (num(p.overtime_hours) || 0), 0)), to_review: items.filter((i) => i.status !== 'ok').length, by_status: tally(items, 'status'), by_role, items };
}
