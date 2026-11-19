import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, REFUSE, sectionTitle } from 'fairclinic-core';
import { CASE_FIELDS, INVOICE_FIELDS, SETTINGS_SCHEMA, STATUSES, checkLabs } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  cases: fileArg('Lab case log under --root (practice-management lab case tracker or a spreadsheet): case, patient, lab, type, sent, due, returned, seat appointment, seated, billed'),
  invoices: fileArg('Optional lab invoice lines under --root (lab statement or accounts payable export): invoice, lab, case, date, amount, remake'),
  settings: fileArg('Optional settings JSON: seat_buffer_days, invoice_wait_days'),
  as_of: AS_OF_ARG,
};
const run = (a, ctx) => checkLabs(ctx.records(a.cases, 'cases'), a.invoices ? ctx.records(a.invoices, 'invoices') : [], { settings: a.settings ? ctx.readJson(a.settings, 'lab_settings') : {}, asOf: a.as_of });
const summary = (o) => `${o.cases} case(s), ${o.invoices} invoice line(s) for ${o.invoiced}. ${o.to_work} to work: ${o.by_status.not_back_for_seat || 0} not back for the seat appointment, ${o.by_status.overdue_from_lab || 0} overdue from the lab, ${o.by_status.seated_not_billed || 0} seated and not billed, ${o.by_status.remake_charged || 0} remake(s) charged (${o.remakes_charged}), ${o.by_status.duplicate_invoice || 0} duplicate(s) (${o.duplicates}), ${o.by_status.invoice_no_case || 0} invoice(s) not in the log, ${o.by_status.case_not_returned || 0} invoiced before return, ${o.by_status.no_invoice || 0} with no invoice yet.`;

export const manifest = clinicAgent({
  pkg, prefix: 'labs', title: 'Fairclinic Lab Cases',
  description: pkg.description,
  args, required: ['cases'], statuses: STATUSES,
  configSchemas: { lab_settings: SETTINGS_SCHEMA },
  sources: { cases: { label: 'Lab case log', args: ['cases'], fields: CASE_FIELDS }, invoices: { label: 'Lab invoices', args: ['invoices'], fields: INVOICE_FIELDS } },
  run, summary,
  check: { title: 'Track lab cases and invoices', description: 'Every lab case and every invoice line with a problem, with a status: not_back_for_seat, overdue_from_lab, seated_not_billed, remake_charged, duplicate_invoice, invoice_no_case, case_not_returned, no_invoice, late_return or ok.' },
  report: {
    title: T9('Lab cases and invoices', 'Laborfälle und Laborrechnungen', 'Travaux de laboratoire et factures', 'Casos de laboratorio y facturas', 'Casos de laboratório e faturas', 'Lavori di laboratorio e fatture', '技工物と技工所の請求書', '技工病例与技工所发票', '기공 케이스와 청구서'),
    base: 'labs-worklist',
    rows: (o) => o.items.filter((i) => i.status !== 'ok').map((i) => ({ status: i.status, kind: i.kind, case_id: i.case_id, invoice_number: i.invoice_number, patient_name: i.patient_name, lab: i.lab, case_type: i.case_type, due_date: i.due_date, returned_date: i.returned_date, seat_date: i.seat_date, amount: i.amount, reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'case_id', 'invoice_number', 'lab', 'seat_date', 'amount', 'reasons'],
    sections: (o) => [{ title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] }],
    limits: [CLINIC_LIMITS.files, 'Remake terms differ by lab; the agent only points at remakes that were charged.', CLINIC_LIMITS.phi, CLINIC_LIMITS.baa, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.pay(), REFUSE.pms_write('appointments or procedures'), { name: 'lab_order', category: 'binding_send', description: 'Never orders, cancels or changes a lab case.' }],
  prompt: {
    title: 'Track lab cases', description: 'Walks the host model through the lab case log.',
    text: 'You are helping a dental office with fairclinic-lab-cases. Rules: it never pays a lab, never orders or changes a case and never moves appointments; patient names are pseudonyms. 1. Call labs_check (with invoices if you have them). Lead with cases not back for a seat appointment in the next days, then overdue cases, then seated work that was not billed, then invoice problems. 2. Call labs_write_report.',
  },
});
