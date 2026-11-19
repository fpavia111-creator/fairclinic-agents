// Fairclinic Estimate Variance: treatment estimates (low to high) against the final invoice.
import { fld, str, num, round2, isoDate, daysBetween, tally } from 'fairclinic-core';

export const ESTIMATE_FIELDS = Object.freeze({
  estimate_id: fld(['Estimate', 'Estimate #', 'Estimate ID', 'Treatment Plan'], { required: true, translate: false }),
  client_name: fld(['Client', 'Owner', 'Client Name']),
  patient_name: fld(['Patient', 'Pet', 'Animal', 'Patient Name']),
  date: fld(['Date', 'Estimate Date', 'Created']),
  low: fld(['Low', 'Low Estimate', 'Estimate Low', 'Min'], { type: 'money', translate: false }),
  high: fld(['High', 'High Estimate', 'Estimate High', 'Max', 'Estimate Total'], { type: 'money', required: true, translate: false }),
  approved: fld(['Approved', 'Accepted', 'Status', 'Client Approved'], { translate: false }),
});
export const INVOICE_FIELDS = Object.freeze({
  invoice_number: fld(['Invoice', 'Invoice #', 'Invoice Number'], { translate: 'invoice' }),
  estimate_id: fld(['Estimate', 'Estimate #', 'Estimate ID', 'Linked Estimate'], { required: true, translate: false }),
  total: fld(['Total', 'Invoice Total', 'Amount', 'Total (incl tax)'], { type: 'money', required: true, translate: 'amount' }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    over_pct: { type: 'number', minimum: 0, maximum: 200, description: 'An invoice more than this percent above the high estimate is flagged (default 10)' },
    under_pct: { type: 'number', minimum: 0, maximum: 100, description: 'An invoice more than this percent below the low estimate is flagged (default 20)' },
    stale_days: { type: 'integer', minimum: 1, maximum: 365, description: 'An approved estimate with no invoice after this many days is flagged (default 30)' },
  },
});

export const STATUSES = ['invoiced_without_approval', 'over_high', 'under_low', 'not_invoiced', 'ok', 'open'];
const YES = /^(y|yes|true|1|approved|accepted|signed)$/i, NO = /^(n|no|false|0|declined|rejected|refused)$/i;

export function checkEstimates(estimates, invoices, { settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10);
  const over = settings.over_pct ?? 10, under = settings.under_pct ?? 20, stale = settings.stale_days || 30;
  const inv = new Map(); for (const i of invoices) { const k = str(i.estimate_id); if (!k) continue; const x = inv.get(k) || { total: 0, numbers: new Set() }; x.total = round2(x.total + (num(i.total) || 0)); if (str(i.invoice_number)) x.numbers.add(str(i.invoice_number)); inv.set(k, x); }
  // Each invoice number once, at most 10 shown (an export with one row per invoice line repeats them; bench, 19 Nov 2026).
  const numbersOf = (x) => { const a = [...x.numbers]; return a.length > 10 ? `${a.slice(0, 10).join(' ')} and ${a.length - 10} more` : a.join(' '); };
  const items = estimates.filter((e) => str(e.estimate_id)).map((e) => {
    const id = str(e.estimate_id); const high = num(e.high); const low = num(e.low) ?? high; const x = inv.get(id); const date = isoDate(e.date);
    const ok = YES.test(str(e.approved)), no = NO.test(str(e.approved));
    let status = 'ok', detail = 'Invoiced within the estimate.'; let variance = null;
    if (x) {
      variance = high ? round2(((x.total - high) / high) * 100) : null;
      if (no) { status = 'invoiced_without_approval'; detail = `The estimate is marked ${str(e.approved).toLowerCase()} and ${x.total} was invoiced against it. Check the client agreed to the work.`; }
      else if (high !== null && x.total > high * (1 + over / 100)) { status = 'over_high'; detail = `Invoiced ${x.total}, ${variance}% above the high estimate of ${high}. Check the client approved the increase before the work, as your policy requires.`; }
      else if (low !== null && x.total < low * (1 - under / 100)) { status = 'under_low'; detail = `Invoiced ${x.total}, ${round2(((low - x.total) / low) * 100)}% below the low estimate of ${low}. Check nothing done was left off the invoice.`; }
    } else if (ok && date && daysBetween(date, today) > stale) { status = 'not_invoiced'; detail = `Approved on ${date} (${daysBetween(date, today)} days ago) for ${low} to ${high}, and no invoice is linked to it.`; }
    else { status = 'open'; detail = 'No invoice linked yet.'; }
    return { estimate_id: id, client_name: str(e.client_name), patient_name: str(e.patient_name), date, low, high, approved: str(e.approved), invoiced: x ? x.total : null, invoice_numbers: x ? numbersOf(x) : '', variance_pct: variance, status, detail };
  });
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (b.variance_pct ?? 0) - (a.variance_pct ?? 0) || (a.estimate_id < b.estimate_id ? -1 : 1));
  const t = tally(items, 'status');
  return { as_of: today, estimates: items.length, invoiced: items.filter((i) => i.invoiced !== null).length, to_review: items.filter((i) => !['ok', 'open'].includes(i.status)).length, above_estimate: round2(items.filter((i) => i.status === 'over_high').reduce((s, i) => s + (i.invoiced - i.high), 0)), by_status: t, items };
}
