import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, REFUSE, sectionTitle } from 'fairclinic-core';
import { PAYROLL_FIELDS, REVENUE_FIELDS, SETTINGS_SCHEMA, STATUSES, checkPayroll } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  payroll: fileArg('Payroll register under --root (payroll provider export): employee, role, period start and end, regular hours, overtime hours, gross pay'),
  revenue: fileArg('Collections per pay period under --root (practice system report): period start, collections, production'),
  settings: fileArg('Optional settings JSON: payroll_pct_max, overtime_hours_max (your own targets)'),
};
const run = (a, ctx) => checkPayroll(ctx.records(a.payroll, 'payroll'), a.revenue ? ctx.records(a.revenue, 'revenue') : [], { settings: a.settings ? ctx.readJson(a.settings, 'payroll_settings') : {} });
const summary = (o) => `${o.periods} pay period(s), ${o.employees} employee(s): payroll ${o.gross_pay} against ${o.collections} collected (${o.payroll_pct}%), ${o.overtime_hours} overtime hours. ${o.to_review} to review: ${o.by_status.payroll_pct_high || 0} period(s) over your payroll target, ${o.by_status.no_revenue || 0} with no collections figure, ${o.by_status.overtime || 0} employee-period(s) with high overtime.`;

export const manifest = clinicAgent({
  pkg, prefix: 'payroll', title: 'Fairclinic Payroll Production',
  description: pkg.description,
  args, required: ['payroll'], statuses: STATUSES,
  configSchemas: { payroll_settings: SETTINGS_SCHEMA },
  sources: { payroll: { label: 'Payroll register', args: ['payroll'], fields: PAYROLL_FIELDS }, revenue: { label: 'Collections per period', args: ['revenue'], fields: REVENUE_FIELDS } },
  run, summary,
  check: { title: 'Compare payroll with collections', description: 'Each pay period with hours, overtime, gross pay, collections, payroll as a percent of collections and collections per paid hour, plus employees with high overtime, with a status: payroll_pct_high, no_revenue, overtime or ok. Totals by role.' },
  report: {
    title: T9('Payroll against collections', 'Lohnkosten gegen Einnahmen', 'Masse salariale et encaissements', 'Nómina frente a cobros', 'Folha de pagamento versus recebimentos', 'Costo del personale e incassi', '人件費と入金', '工资与收款', '인건비와 수납'),
    base: 'payroll-production',
    rows: (o) => o.items.map((i) => ({ status: i.status, kind: i.kind, period_start: i.period_start, employee: i.employee, role: i.role, hours: i.hours, overtime_hours: i.overtime_hours, gross_pay: i.gross_pay, collections: i.collections, payroll_pct: i.payroll_pct, collections_per_hour: i.collections_per_hour, reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'period_start', 'employee', 'hours', 'overtime_hours', 'gross_pay', 'collections', 'payroll_pct', 'reasons'],
    sections: (o) => [{ title: sectionTitle('by_role'), rows: o.by_role, columns: ['role', 'employees', 'hours', 'gross_pay'] }],
    limits: [CLINIC_LIMITS.files, 'Targets are your own. This is arithmetic on payroll and collections; it is not a wage-and-hour review, and overtime rules are for your payroll provider or adviser.', CLINIC_LIMITS.arithmetic, CLINIC_LIMITS.advice],
  },
  refused: [{ name: 'payroll_change', category: 'binding_send', description: 'Never changes pay, hours or schedules and never runs payroll.' }, REFUSE.pay(), { name: 'staff_action', category: 'binding_send', description: 'Never messages, disciplines or reports a member of staff.' }],
  prompt: {
    title: 'Compare payroll with collections', description: 'Walks the host model through payroll against collections.',
    text: 'You are helping a clinic owner with fairclinic-payroll-production. Rules: it never changes pay, hours or schedules and never runs payroll; it is not a wage-and-hour review. 1. Call payroll_check. Lead with periods over the payroll target and periods missing a collections figure, then high overtime, presented neutrally. 2. Call payroll_write_report.',
  },
});
