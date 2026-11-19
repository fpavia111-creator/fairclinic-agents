// Fairclinic Pharmacy Margins: in-house pharmacy prices against cost: below cost, cost rises not passed on,
// margins under your target and prescription items without a dispensing fee.
import { fld, str, num, round2, tally } from 'fairclinic-core';

export const PRICE_FIELDS = Object.freeze({
  item: fld(['Item', 'Item Name', 'Product', 'Description', 'Product Name'], { required: true }),
  item_type: fld(['Type', 'Rx/OTC', 'Category', 'Class'], { translate: false }),
  cost: fld(['Cost', 'Unit Cost', 'Current Cost', 'Cost Each'], { type: 'money', required: true, translate: 'unit_cost' }),
  previous_cost: fld(['Previous Cost', 'Prior Cost', 'Old Cost', 'Last Cost'], { type: 'money', translate: false }),
  price: fld(['Price', 'Unit Price', 'Sell Price', 'Retail Price'], { type: 'money', required: true, translate: 'unit_price' }),
  previous_price: fld(['Previous Price', 'Prior Price', 'Old Price'], { type: 'money', translate: false }),
  dispensing_fee: fld(['Dispensing Fee', 'Rx Fee', 'Dispense Fee'], { type: 'money', translate: false }),
});
export const SALES_FIELDS = Object.freeze({
  item: fld(['Item', 'Item Name', 'Product', 'Description'], { required: true }),
  qty: fld(['Qty', 'Quantity', 'Units Sold', 'Qty Sold'], { type: 'number', required: true, translate: 'qty' }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    target_margin_pct: { type: 'number', minimum: 1, maximum: 95, description: 'Margin on price below this percent is flagged (default 45; your own target)' },
    cost_rise_pct: { type: 'number', minimum: 0.1, maximum: 200, description: 'A cost rise above this percent with an unchanged price is flagged (default 5)' },
    rx_needs_fee: { type: 'boolean', description: 'List prescription items with no dispensing fee (default true)' },
  },
});

export const STATUSES = ['below_cost', 'cost_rise_not_passed', 'low_margin', 'no_dispensing_fee', 'ok'];
const RX = /^(rx|prescription|pom|legend|r)$/i;

export function checkPharmacy(prices, sales = [], { settings = {} } = {}) {
  const target = settings.target_margin_pct || 45, rise = settings.cost_rise_pct || 5, needFee = settings.rx_needs_fee !== false;
  const qty = new Map(); for (const s of sales) { const k = str(s.item).toLowerCase(); if (k) qty.set(k, (qty.get(k) || 0) + (num(s.qty) || 0)); }
  const items = prices.filter((p) => str(p.item)).map((p) => {
    const cost = num(p.cost), price = num(p.price), prevCost = num(p.previous_cost), prevPrice = num(p.previous_price), fee = num(p.dispensing_fee);
    const margin = price ? round2(((price - (cost || 0)) / price) * 100) : null; const sold = qty.get(str(p.item).toLowerCase()) ?? null;
    const f = []; const add = (code, detail) => f.push({ code, detail });
    if (cost !== null && price !== null && price < cost) add('below_cost', `Priced at ${price}, below its cost of ${cost}${sold ? `; ${sold} sold lose ${round2((cost - price) * sold)}` : ''}.`);
    if (cost !== null && prevCost && cost > prevCost * (1 + rise / 100) && price !== null && prevPrice !== null && Math.abs(price - prevPrice) < 0.005) add('cost_rise_not_passed', `Cost went from ${prevCost} to ${cost} (+${round2((cost / prevCost - 1) * 100)}%) and the price stayed at ${price}.`);
    const targetPrice = cost !== null ? cost / (1 - target / 100) : null;
    if (margin !== null && margin >= 0 && margin < target) add('low_margin', `Margin ${margin}% of price; your target is ${target}%. At target the price would be about ${round2(targetPrice)}${sold ? `, ${round2((targetPrice - price) * sold)} more on ${sold} sold` : ''}.`);
    if (needFee && RX.test(str(p.item_type)) && !(fee > 0)) add('no_dispensing_fee', 'A prescription item with no dispensing fee in the price list.');
    const gap = sold && targetPrice !== null && price !== null && price < targetPrice ? round2((targetPrice - price) * sold) : 0;
    return { item: str(p.item), item_type: str(p.item_type), cost, previous_cost: prevCost, price, dispensing_fee: fee, margin_pct: margin, sold, gap_to_target: gap, status: STATUSES.find((s) => f.some((x) => x.code === s)) || 'ok', findings: f };
  });
  items.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || b.gap_to_target - a.gap_to_target || (a.item < b.item ? -1 : 1));
  const priced = items.filter((i) => i.margin_pct !== null);
  return { items_checked: items.length, to_review: items.filter((i) => i.status !== 'ok').length, average_margin_pct: priced.length ? round2(priced.reduce((s, i) => s + i.margin_pct, 0) / priced.length) : null, gap_to_target: round2(items.reduce((s, i) => s + i.gap_to_target, 0)), by_status: tally(items, 'status'), by_finding: tally(items, (i) => i.findings.map((f) => f.code)), items };
}
