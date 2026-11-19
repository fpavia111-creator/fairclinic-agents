import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, REFUSE, sectionTitle } from 'fairclinic-core';
import { ESTIMATE_FIELDS, INVOICE_FIELDS, SETTINGS_SCHEMA, STATUSES, checkEstimates } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  estimates: fileArg('Treatment estimates under --root (AVImark, Cornerstone, ezyVet, Covetrus Pulse or Shepherd estimate export): estimate, client, pet, date, low, high, approved'),
  invoices: fileArg('Invoices under --root with the estimate each one was raised from: invoice, estimate, total'),
  settings: fileArg('Optional settings JSON: over_pct, under_pct, stale_days'),
  as_of: AS_OF_ARG,
};
const run = (a, ctx) => checkEstimates(ctx.records(a.estimates, 'estimates'), ctx.records(a.invoices, 'invoices'), { settings: a.settings ? ctx.readJson(a.settings, 'estimate_settings') : {}, asOf: a.as_of });
const summary = (o) => `${o.estimates} estimate(s), ${o.invoiced} invoiced. ${o.to_review} to review: ${o.by_status.invoiced_without_approval || 0} invoiced without approval, ${o.by_status.over_high || 0} above the high estimate (${o.above_estimate} over in total), ${o.by_status.under_low || 0} well below the low estimate, ${o.by_status.not_invoiced || 0} approved and never invoiced.`;

export const manifest = clinicAgent({
  pkg, prefix: 'estimates', title: 'Fairclinic Estimate Variance',
  description: pkg.description,
  args, required: ['estimates', 'invoices'], statuses: STATUSES,
  configSchemas: { estimate_settings: SETTINGS_SCHEMA },
  sources: { estimates: { label: 'Estimates', args: ['estimates'], fields: ESTIMATE_FIELDS }, invoices: { label: 'Invoices', args: ['invoices'], fields: INVOICE_FIELDS } },
  run, summary,
  check: { title: 'Compare estimates with invoices', description: 'Every estimate with its range, the invoiced total and the variance from the high estimate, with a status: invoiced_without_approval, over_high, under_low, not_invoiced, ok or open.' },
  report: {
    title: T9('Estimate against invoice', 'Kostenvoranschlag gegen Rechnung', 'Devis et facture', 'Presupuesto frente a factura', 'Orçamento versus fatura', 'Preventivo e fattura', '見積と請求の差', '估价与发票差异', '견적 대비 청구'),
    base: 'estimates-variance',
    rows: (o) => o.items.filter((i) => !['ok', 'open'].includes(i.status)).map((i) => ({ status: i.status, estimate_id: i.estimate_id, client_name: i.client_name, patient_name: i.patient_name, date: i.date, low: i.low, high: i.high, approved: i.approved, invoiced: i.invoiced, invoice_numbers: i.invoice_numbers, variance_pct: i.variance_pct, reason: i.detail })),
    htmlColumns: ['status', 'estimate_id', 'low', 'high', 'invoiced', 'variance_pct', 'reason'],
    sections: (o) => [{ title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] }],
    limits: [CLINIC_LIMITS.files, 'The percentages are your settings. Whether a client approved an increase is in your records, not in these files; the agent points at the invoices to check.', CLINIC_LIMITS.phi, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.pms_write('estimates or invoices'), REFUSE.refund(), REFUSE.message()],
  prompt: {
    title: 'Compare estimates and invoices', description: 'Walks the host model through estimate variance.',
    text: 'You are helping a veterinary practice manager with fairclinic-estimate-variance. Rules: it never changes an invoice, never refunds and never contacts a client; pet and client names are pseudonyms. 1. Call estimates_check. Lead with invoices raised on declined estimates and invoices well above the high estimate, then invoices well below the low estimate, then approved estimates never invoiced. 2. Call estimates_write_report.',
  },
});
