// Fairclinic Inventory Expiry: expired and expiring stock by lot, and shrink from opening, received, used and counted.
import { fld, str, num, round2, isoDate, daysBetween, tally } from 'fairclinic-core';

export const STOCK_FIELDS = Object.freeze({
  item: fld(['Item', 'Item Name', 'Product', 'Description', 'Product Name'], { required: true }),
  lot: fld(['Lot', 'Lot Number', 'Lot #', 'Batch'], { translate: 'lot' }),
  expiry: fld(['Expiry', 'Expiration Date', 'Expires', 'Exp Date', 'Best Before'], { type: 'date', translate: 'expiry' }),
  on_hand: fld(['On Hand', 'Quantity On Hand', 'Qty On Hand', 'Qty', 'Quantity'], { type: 'number', required: true, translate: 'system_qty' }),
  unit_cost: fld(['Unit Cost', 'Cost', 'Cost Each', 'Avg Cost'], { type: 'money', translate: 'unit_cost' }),
});
export const COUNT_FIELDS = Object.freeze({
  item: fld(['Item', 'Item Name', 'Product', 'Description'], { required: true }),
  opening: fld(['Opening', 'Start Qty', 'Beginning', 'Opening Qty'], { type: 'number', required: true, translate: false }),
  received: fld(['Received', 'Purchased', 'Qty Received'], { type: 'number', translate: false }),
  used: fld(['Used', 'Sold', 'Dispensed', 'Qty Used', 'Sold/Dispensed'], { type: 'number', translate: false }),
  counted: fld(['Counted', 'Count', 'Physical Count', 'Closing Count'], { type: 'number', required: true, translate: 'counted_qty' }),
  unit_cost: fld(['Unit Cost', 'Cost', 'Cost Each', 'Avg Cost'], { type: 'money', translate: 'unit_cost' }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    expiring_days: { type: 'integer', minimum: 1, maximum: 365, description: 'Stock expiring within this many days is listed (default 60)' },
    count_tolerance: { type: 'number', minimum: 0, maximum: 1000, description: 'Count differences up to this many units are equal (default 0)' },
  },
});

export const STATUSES = ['expired', 'shrink', 'expiring', 'overage', 'no_expiry_date', 'ok'];

export function checkInventory(stock, counts = [], { settings = {}, asOf } = {}) {
  const today = isoDate(asOf) || new Date().toISOString().slice(0, 10);
  const warn = settings.expiring_days || 60, tol = settings.count_tolerance || 0;
  const items = stock.filter((s) => str(s.item)).map((s) => {
    const exp = isoDate(s.expiry); const qty = num(s.on_hand) || 0; const cost = num(s.unit_cost); const value = cost !== null ? round2(qty * cost) : null;
    const days = exp ? daysBetween(today, exp) : null;
    let status = 'ok', detail = exp ? `Expires ${exp}.` : '';
    if (qty > 0 && !exp) { status = 'no_expiry_date'; detail = 'On hand with no expiry date recorded for this lot.'; }
    else if (qty > 0 && days < 0) { status = 'expired'; detail = `${qty} on hand expired on ${exp}${value !== null ? ` (cost ${value})` : ''}. Set it aside under your own procedure and check for a supplier credit.`; }
    else if (qty > 0 && days <= warn) { status = 'expiring'; detail = `${qty} on hand expire in ${days} day(s) (${exp})${value !== null ? `, cost ${value}` : ''}. Use first or ask about a return.`; }
    return { kind: 'lot', item: str(s.item), lot: str(s.lot), expiry: exp, days_left: days, on_hand: qty, unit_cost: cost, value, expected: null, counted: null, difference: null, status, detail };
  });
  for (const c of counts.filter((x) => str(x.item))) {
    const expected = round2((num(c.opening) || 0) + (num(c.received) || 0) - (num(c.used) || 0)); const counted = num(c.counted) || 0; const diff = round2(counted - expected);
    const cost = num(c.unit_cost) ?? (stock.find((s) => str(s.item) === str(c.item)) ? num(stock.find((s) => str(s.item) === str(c.item)).unit_cost) : null);
    const value = cost !== null ? round2(Math.abs(diff) * cost) : null;
    let status = 'ok', detail = 'The count matches opening + received - used.';
    if (diff < -tol) { status = 'shrink'; detail = `Counted ${counted}; opening ${num(c.opening) || 0} + received ${num(c.received) || 0} - used ${num(c.used) || 0} is ${expected}: ${-diff} unit(s) missing${value !== null ? ` (cost ${value})` : ''}. Check for unbilled use, breakage or entry errors.`; }
    else if (diff > tol) { status = 'overage'; detail = `Counted ${counted}, ${diff} more than the ${expected} expected; a receipt or a return may be missing from the records.`; }
    items.push({ kind: 'count', item: str(c.item), lot: '', expiry: null, days_left: null, on_hand: counted, unit_cost: cost, value, expected, counted, difference: diff, status, detail });
  }
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || (a.days_left ?? 1e9) - (b.days_left ?? 1e9) || (a.item < b.item ? -1 : a.item > b.item ? 1 : a.lot < b.lot ? -1 : 1));
  const sum = (st) => round2(items.filter((i) => i.status === st).reduce((s, i) => s + (i.value || 0), 0));
  return { as_of: today, lots: stock.length, counted_items: counts.length, to_review: items.filter((i) => i.status !== 'ok').length, expired_value: sum('expired'), expiring_value: sum('expiring'), shrink_value: sum('shrink'), stock_value: round2(items.filter((i) => i.kind === 'lot').reduce((s, i) => s + (i.value || 0), 0)), by_status: tally(items, 'status'), items };
}
