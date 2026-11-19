// Fairclinic Boarding and Grooming: reservations (nights, days, add-ons) against what was invoiced.
import { fld, str, num, round2, isoDate, daysBetween, tally } from 'fairclinic-core';

export const RESERVATION_FIELDS = Object.freeze({
  reservation_id: fld(['Reservation', 'Reservation ID', 'Booking', 'Booking ID', 'Res #'], { required: true, translate: false }),
  client_name: fld(['Client', 'Owner', 'Client Name']),
  patient_name: fld(['Patient', 'Pet', 'Animal', 'Patient Name']),
  service: fld(['Service', 'Type', 'Reservation Type'], { required: true, translate: false }),
  check_in: fld(['Check In', 'Check-in', 'Start', 'Arrival'], { type: 'date', required: true, translate: false }),
  check_out: fld(['Check Out', 'Check-out', 'End', 'Departure'], { type: 'date', translate: false }),
  add_ons: fld(['Add-ons', 'Add Ons', 'Extras', 'Requested Services'], { translate: false }),
  status: fld(['Status', 'Reservation Status'], { translate: false }),
});
export const INVOICE_FIELDS = Object.freeze({
  invoice_number: fld(['Invoice Number', 'Invoice #', 'Invoice'], { translate: 'invoice' }),
  reservation_id: fld(['Reservation', 'Reservation ID', 'Booking', 'Res #'], { required: true, translate: false }),
  patient_name: fld(['Patient', 'Pet', 'Animal']),
  item: fld(['Item', 'Product', 'Service', 'Description'], { required: true }),
  qty: fld(['Qty', 'Quantity', 'Units', 'Nights'], { type: 'number', translate: 'qty' }),
  amount: fld(['Amount', 'Total', 'Line Total'], { type: 'money' }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    prices: { type: 'object', maxProperties: 200, additionalProperties: { type: 'number', minimum: 0, maximum: 100000 }, description: 'List price per item or service name, to value what was not invoiced' },
  },
});

export const STATUSES = ['not_invoiced', 'nights_short', 'addon_not_invoiced', 'ok', 'cancelled'];
const norm = (s) => str(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const CANCELLED = /^(cancel+ed|no show|no-show|void|deleted)$/i;
const unitWord = (svc) => (/board|kennel|lodg/.test(norm(svc)) ? 'board' : /daycare|day care/.test(norm(svc)) ? 'daycare' : /groom/.test(norm(svc)) ? 'groom' : norm(svc));

export function checkBoarding(reservations, invoices, { settings = {} } = {}) {
  const prices = Object.fromEntries(Object.entries(settings.prices || {}).map(([k, v]) => [norm(k), v]));
  const priceOf = (name) => { const n = norm(name); if (prices[n] !== undefined) return prices[n]; const k = Object.keys(prices).find((p) => p.includes(n) || n.includes(p)); return k ? prices[k] : null; };
  const lines = new Map(); for (const l of invoices) { const k = str(l.reservation_id); if (k) (lines.get(k) || lines.set(k, []).get(k)).push({ item: norm(l.item), name: str(l.item), qty: num(l.qty) ?? 1, amount: num(l.amount) || 0 }); }
  const items = reservations.filter((r) => str(r.reservation_id)).map((r) => {
    const id = str(r.reservation_id); const inv = lines.get(id) || []; const svc = str(r.service); const word = unitWord(svc);
    const cin = isoDate(r.check_in), cout = isoDate(r.check_out);
    const expected = word === 'board' ? Math.max(1, daysBetween(cin, cout || cin)) : word === 'daycare' ? Math.max(1, daysBetween(cin, cout || cin) + 1) : 1;
    const f = []; const add = (code, detail, value) => f.push({ code, detail, value: value ?? 0 });
    if (CANCELLED.test(str(r.status))) return { reservation_id: id, client_name: str(r.client_name), patient_name: str(r.patient_name), service: svc, check_in: cin, check_out: cout, expected_units: 0, invoiced_units: 0, missed_value: 0, status: 'cancelled', findings: [] };
    const main = inv.filter((l) => l.item.includes(word));
    const units = main.reduce((s, l) => s + l.qty, 0);
    const unitPrice = priceOf(main[0] ? main[0].name : svc);
    if (!inv.length) add('not_invoiced', `${svc} ${cin}${cout && cout !== cin ? ` to ${cout}` : ''} has no invoice lines.`, unitPrice !== null ? round2(unitPrice * expected) : 0);
    else if (units < expected) add('nights_short', `${expected} ${word === 'board' ? 'night(s)' : 'unit(s)'} from ${cin} to ${cout}; ${units} invoiced.`, unitPrice !== null ? round2(unitPrice * (expected - units)) : 0);
    for (const a of str(r.add_ons).split(/[;|,]/).map((x) => x.trim()).filter(Boolean)) {
      if (!inv.some((l) => l.item.includes(norm(a)) || norm(a).includes(l.item))) { const p = priceOf(a); add('addon_not_invoiced', `Add-on ${a} was booked and is not on the invoice${p !== null ? ` (${p})` : ''}.`, p ?? 0); }
    }
    return { reservation_id: id, client_name: str(r.client_name), patient_name: str(r.patient_name), service: svc, check_in: cin, check_out: cout, expected_units: expected, invoiced_units: units, missed_value: round2(f.reduce((s, x) => s + x.value, 0)), status: STATUSES.find((s) => f.some((x) => x.code === s)) || 'ok', findings: f.map(({ value: _v, ...x }) => x) };
  });
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (a.reservation_id < b.reservation_id ? -1 : 1));
  return { reservations: items.length, cancelled: items.filter((i) => i.status === 'cancelled').length, to_review: items.filter((i) => !['ok', 'cancelled'].includes(i.status)).length, missed_value: round2(items.reduce((s, i) => s + i.missed_value, 0)), by_status: tally(items, 'status'), by_finding: tally(items, (i) => i.findings.map((x) => x.code)), items };
}
