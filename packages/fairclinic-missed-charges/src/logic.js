// Fairclinic Missed Charges: what the treatment sheet or medical record says was done, against what was invoiced.
import { fld, str, num, round2, isoDate, tally } from 'fairclinic-core';

export const TREATMENT_FIELDS = Object.freeze({
  visit_id: fld(['Visit', 'Visit ID', 'Consult ID', 'Consult', 'Encounter'], { translate: false }),
  patient_name: fld(['Patient', 'Pet', 'Animal', 'Animal Name', 'Patient Name'], { required: true }),
  client_name: fld(['Client', 'Owner', 'Client Name']),
  date: fld(['Date', 'Treatment Date', 'Visit Date'], { type: 'date', required: true }),
  item: fld(['Item', 'Treatment', 'Service', 'Product', 'Description', 'Product Name'], { required: true }),
  qty: fld(['Qty', 'Quantity', 'Units', 'Dose Count'], { type: 'number', translate: 'qty' }),
  staff: fld(['Staff', 'Done By', 'Performed By', 'Technician'], { translate: false }),
});
export const INVOICE_FIELDS = Object.freeze({
  invoice_number: fld(['Invoice #', 'Invoice', 'Invoice Number', 'Invoice No'], { translate: 'invoice' }),
  visit_id: fld(['Visit', 'Visit ID', 'Consult ID', 'Consult', 'Encounter'], { translate: false }),
  patient_name: fld(['Patient', 'Pet', 'Animal', 'Animal Name', 'Patient Name'], { required: true }),
  date: fld(['Date', 'Invoice Date']),
  item: fld(['Item', 'Product Name', 'Product', 'Description', 'Service'], { required: true }),
  qty: fld(['Qty', 'Quantity', 'Units'], { type: 'number', translate: 'qty' }),
  amount: fld(['Total (incl tax)', 'Amount', 'Total', 'Line Total', 'Price'], { type: 'money' }),
  note: fld(['Note', 'Comment', 'Discount Reason'], { translate: 'memo' }),
});
export const PRICE_FIELDS = Object.freeze({
  item: fld(['Item', 'Product', 'Product Name', 'Service', 'Description'], { required: true }),
  price: fld(['Price', 'Unit Price', 'Fee', 'Sell Price'], { type: 'money', required: true, translate: 'unit_price' }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    item_aliases: { type: 'object', maxProperties: 500, additionalProperties: { type: 'string', maxLength: 200 }, description: 'Treatment sheet wording -> invoice item name, when the two differ' },
  },
});

export const STATUSES = ['not_invoiced', 'qty_short', 'no_charge', 'invoiced_not_recorded', 'ok'];
const norm = (s) => str(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function checkCharges(treatments, invoices, prices = [], { settings = {} } = {}) {
  const alias = new Map(Object.entries(settings.item_aliases || {}).map(([a, b]) => [norm(a), norm(b)]));
  const item = (s) => alias.get(norm(s)) || norm(s);
  const price = new Map(prices.map((p) => [item(p.item), num(p.price)]));
  const visitKey = (r) => (str(r.visit_id) ? `v:${str(r.visit_id)}` : `p:${norm(r.patient_name)}|${isoDate(r.date)}`);
  const inv = new Map();
  for (const l of invoices) { const k = `${visitKey(l)}|${item(l.item)}`; const x = inv.get(k) || { qty: 0, amount: 0, lines: 0, note: '', invoice_number: str(l.invoice_number), item: str(l.item), patient_name: str(l.patient_name), date: isoDate(l.date), visit_id: str(l.visit_id) }; x.qty += num(l.qty) ?? 1; x.amount = round2(x.amount + (num(l.amount) || 0)); x.lines++; if (str(l.note)) x.note = str(l.note); inv.set(k, x); }
  const seen = new Set(); const items = [];
  const groups = new Map();
  for (const t of treatments) { if (!str(t.item) || !str(t.patient_name)) continue; const k = `${visitKey(t)}|${item(t.item)}`; const g = groups.get(k) || { t, qty: 0 }; g.qty += num(t.qty) ?? 1; groups.set(k, g); }
  for (const [k, { t, qty }] of groups) {
    seen.add(k); const x = inv.get(k); const unit = price.get(item(t.item)) ?? (x && x.qty ? round2(x.amount / x.qty) : null);
    let status = 'ok', detail = 'Invoiced as recorded.', missed = 0;
    if (!x) { status = 'not_invoiced'; missed = unit !== null ? round2(unit * qty) : 0; detail = `${qty} x ${str(t.item)} recorded and not on the invoice${unit !== null ? ` (about ${missed} at ${unit} each)` : ' (no price in the price list)'}.`; }
    else if (x.qty < qty) { status = 'qty_short'; missed = unit !== null ? round2(unit * (qty - x.qty)) : 0; detail = `${qty} recorded, ${x.qty} invoiced${unit !== null ? ` (about ${missed} short)` : ''}.`; }
    else if (x.amount === 0) { status = 'no_charge'; detail = `Invoiced at no charge${x.note ? ` (${x.note})` : ''}${unit !== null ? `; list price ${round2(unit * qty)}` : ''}. Confirm it was meant.`; missed = 0; }
    items.push({ visit_id: str(t.visit_id), invoice_number: x ? x.invoice_number : '', patient_name: str(t.patient_name), client_name: str(t.client_name), date: isoDate(t.date), item: str(t.item), recorded_qty: qty, invoiced_qty: x ? x.qty : 0, missed_value: missed, list_value: unit !== null ? round2(unit * qty) : null, staff: str(t.staff), status, detail });
  }
  for (const [k, x] of inv) if (!seen.has(k) && x.amount > 0) items.push({ visit_id: x.visit_id, invoice_number: x.invoice_number, patient_name: x.patient_name, client_name: '', date: x.date, item: x.item, recorded_qty: 0, invoiced_qty: x.qty, missed_value: 0, list_value: null, staff: '', status: 'invoiced_not_recorded', detail: `${x.qty} x ${x.item} invoiced for ${x.amount} with no matching line on the treatment sheet; check the record is complete.` });
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (a.visit_id < b.visit_id ? -1 : a.visit_id > b.visit_id ? 1 : a.item < b.item ? -1 : 1));
  const t = tally(items, 'status');
  return { visits: new Set(items.map((i) => i.visit_id || `${i.patient_name}|${i.date}`)).size, recorded_lines: groups.size, to_review: items.filter((i) => i.status !== 'ok').length, not_invoiced: t.not_invoiced || 0, qty_short: t.qty_short || 0, no_charge: t.no_charge || 0, invoiced_not_recorded: t.invoiced_not_recorded || 0, missed_value: round2(items.reduce((s, i) => s + i.missed_value, 0)), by_status: t, items };
}
