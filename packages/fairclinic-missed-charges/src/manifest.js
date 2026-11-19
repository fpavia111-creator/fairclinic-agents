import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, REFUSE, sectionTitle, exportProfile } from 'fairclinic-core';
import { TREATMENT_FIELDS, INVOICE_FIELDS, PRICE_FIELDS, SETTINGS_SCHEMA, STATUSES, checkCharges } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  treatments: fileArg('Treatment sheet or medical record items under --root (AVImark, Cornerstone, ezyVet, Covetrus Pulse or Shepherd export): visit, patient, client, date, item, quantity'),
  invoices: fileArg('Invoice lines under --root for the same visits: invoice, visit, patient, date, item, quantity, amount'),
  prices: fileArg('Optional price list under --root (item, price) to put a value on what was missed'),
  settings: fileArg('Optional settings JSON: item_aliases (treatment sheet wording -> invoice item)'),
};
const run = (a, ctx) => checkCharges(ctx.records(a.treatments, 'treatments'), ctx.records(a.invoices, 'invoices'), a.prices ? ctx.records(a.prices, 'prices') : [], { settings: a.settings ? ctx.readJson(a.settings, 'charges_settings') : {} });
const summary = (o) => `${o.recorded_lines} recorded line(s) over ${o.visits} visit(s). ${o.to_review} to review: ${o.not_invoiced} not invoiced, ${o.qty_short} invoiced short, ${o.no_charge} at no charge, ${o.invoiced_not_recorded} invoiced but not on the record. About ${o.missed_value} not charged.`;

export const manifest = clinicAgent({
  pkg, prefix: 'charges', title: 'Fairclinic Missed Charges',
  description: pkg.description,
  args, required: ['treatments', 'invoices'], statuses: STATUSES,
  configSchemas: { charges_settings: SETTINGS_SCHEMA },
  sources: {
    treatments: { label: 'Treatment sheet items', args: ['treatments'], fields: TREATMENT_FIELDS },
    invoices: { label: 'Invoice lines', args: ['invoices'], fields: INVOICE_FIELDS, profiles: [exportProfile('ezyvet_invoice_lines', { invoice_number: 'Invoice #', visit_id: 'Consult ID', patient_name: 'Animal Name', date: 'Invoice Date', item: 'Product Name', qty: 'Qty', amount: 'Total (incl tax)' })] },
    prices: { label: 'Price list', args: ['prices'], fields: PRICE_FIELDS },
  },
  run, summary,
  check: { title: 'Find missed charges', description: 'Every line on the treatment sheet matched to the invoice by visit (or patient and date) and item, with a status: not_invoiced, qty_short, no_charge, invoiced_not_recorded or ok, and the value not charged from your price list.' },
  report: {
    title: T9('Missed charges', 'Nicht berechnete Leistungen', 'Actes non facturés', 'Cargos no facturados', 'Cobranças não lançadas', 'Prestazioni non fatturate', '請求漏れ', '漏收费用', '청구 누락'),
    base: 'charges-missed',
    rows: (o) => o.items.filter((i) => i.status !== 'ok').map((i) => ({ status: i.status, visit_id: i.visit_id, invoice_number: i.invoice_number, patient_name: i.patient_name, client_name: i.client_name, date: i.date, item: i.item, recorded_qty: i.recorded_qty, invoiced_qty: i.invoiced_qty, missed_value: i.missed_value, staff: i.staff, reason: i.detail })),
    htmlColumns: ['status', 'visit_id', 'date', 'item', 'recorded_qty', 'invoiced_qty', 'missed_value', 'reason'],
    sections: (o) => [{ title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] }],
    limits: [CLINIC_LIMITS.files, 'Items are matched by name; when the treatment sheet and the invoice word an item differently, name the pair in item_aliases.', 'A missed charge is for a person to add or to waive on purpose; the agent never changes an invoice or charges a client.', CLINIC_LIMITS.phi, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.pms_write('invoices'), { name: 'client_charge', category: 'move_money', description: 'Never charges a client or a card.' }, REFUSE.message()],
  prompt: {
    title: 'Find missed charges', description: 'Walks the host model through missed charges.',
    text: 'You are helping a veterinary practice manager with fairclinic-missed-charges. Rules: it never changes an invoice or charges a client; pet and client names are pseudonyms. 1. Call charges_check with the price list if you have it. Lead with items not invoiced and quantities short, by value; then no-charge lines to confirm; then invoiced items missing from the record. 2. Call charges_write_report for the person who corrects invoices.',
  },
});
