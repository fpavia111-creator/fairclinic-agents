// Fairclinic Supply Costs: supplier invoices against production, price increases, repeated lines and category spikes.
import { fld, str, num, round2, isoDate, pct, tally } from 'fairclinic-core';

export const LINE_FIELDS = Object.freeze({
  supplier: fld(['Supplier', 'Vendor', 'Distributor'], { required: true, translate: 'vendor' }),
  invoice_number: fld(['Invoice', 'Invoice #', 'Invoice Number', 'Order #'], { translate: 'invoice' }),
  date: fld(['Date', 'Invoice Date', 'Order Date'], { type: 'date', required: true }),
  item: fld(['Item', 'Description', 'Product', 'Item Description'], { required: true }),
  category: fld(['Category', 'Product Category', 'Class'], { translate: 'category' }),
  qty: fld(['Qty', 'Quantity', 'Units'], { type: 'number', translate: 'qty' }),
  unit_price: fld(['Unit Price', 'Price', 'Each', 'Unit Cost'], { type: 'money', translate: 'unit_price' }),
  amount: fld(['Amount', 'Extended', 'Line Total', 'Total'], { type: 'money', translate: 'amount' }),
});
export const PRODUCTION_FIELDS = Object.freeze({
  month: fld(['Month', 'Period'], { required: true, translate: false }),
  production: fld(['Production', 'Net Production', 'Gross Production', 'Collections'], { type: 'money', required: true, translate: false }),
});

export const SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    note: { type: 'string', maxLength: 500 },
    target_pct: { type: 'number', minimum: 0.5, maximum: 30, description: 'Supplies above this percent of production are flagged (default 6)' },
    price_increase_pct: { type: 'number', minimum: 1, maximum: 200, description: 'A unit price this much above the last one paid for the same item is flagged (default 10)' },
    spike_pct: { type: 'number', minimum: 110, maximum: 1000, description: 'A category month above this percent of its other months is flagged (default 150)' },
  },
});

export const STATUSES = ['duplicate_line', 'price_increase', 'over_target', 'category_spike', 'ok'];
const monthOf = (v) => { const s = str(v); if (/^\d{4}-\d{2}$/.test(s)) return s; const m = /^(\d{1,2})[/.-](\d{4})$/.exec(s); if (m) return `${m[2]}-${m[1].padStart(2, '0')}`; const d = isoDate(s); return d ? d.slice(0, 7) : null; };

export function checkSupplies(lines, production = [], { settings = {} } = {}) {
  const target = settings.target_pct || 6, inc = settings.price_increase_pct || 10, spike = settings.spike_pct || 150;
  const rows = lines.map((l) => { const qty = num(l.qty) ?? 1; const unit = num(l.unit_price); const amount = num(l.amount) ?? (unit !== null ? qty * unit : 0); return { supplier: str(l.supplier), invoice_number: str(l.invoice_number), date: isoDate(l.date), item: str(l.item), category: str(l.category) || 'Uncategorised', qty, unit_price: unit ?? (qty ? round2(amount / qty) : null), amount: round2(amount) }; }).filter((l) => l.date && l.item);
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : `${a.supplier}|${a.invoice_number}|${a.item}|${a.amount}` < `${b.supplier}|${b.invoice_number}|${b.item}|${b.amount}` ? -1 : 1));
  const items = []; const seen = new Set(); const lastPrice = new Map();
  for (const l of rows) {
    const f = []; const add = (code, detail) => f.push({ code, detail });
    const dk = `${l.supplier}|${l.invoice_number}|${l.item}|${l.qty}|${l.amount}`.toLowerCase();
    if (l.invoice_number && seen.has(dk)) add('duplicate_line', `The same line (${l.qty} x ${l.item} for ${l.amount}) appears twice on ${l.supplier} invoice ${l.invoice_number}.`); else seen.add(dk);
    const pk = `${l.supplier}|${l.item}`.toLowerCase(); const prev = lastPrice.get(pk);
    if (prev && l.unit_price !== null && prev.price > 0 && l.unit_price > prev.price * (1 + inc / 100)) add('price_increase', `${l.item} from ${l.supplier} at ${l.unit_price} each, up ${round2((l.unit_price / prev.price - 1) * 100)}% from ${prev.price} on ${prev.date}.`);
    if (l.unit_price !== null) lastPrice.set(pk, { price: l.unit_price, date: l.date });
    if (f.length) items.push({ kind: 'line', month: l.date.slice(0, 7), supplier: l.supplier, invoice_number: l.invoice_number, item: l.item, category: l.category, amount: l.amount, supplies: null, production: null, supply_pct: null, status: STATUSES.find((s) => f.some((x) => x.code === s)), findings: f });
  }
  const prod = new Map(); for (const p of production) { const m = monthOf(p.month); if (m) prod.set(m, round2((prod.get(m) || 0) + (num(p.production) || 0))); }
  const months = [...new Set(rows.map((l) => l.date.slice(0, 7)))].sort();
  const catMonth = new Map(); for (const l of rows) { const k = `${l.category}|${l.date.slice(0, 7)}`; catMonth.set(k, round2((catMonth.get(k) || 0) + l.amount)); }
  const cats = [...new Set(rows.map((l) => l.category))].sort();
  for (const m of months) {
    const total = round2(rows.filter((l) => l.date.startsWith(m)).reduce((s, l) => s + l.amount, 0)); const p = prod.get(m) ?? null; const sp = p ? pct(total, p) : null;
    const f = []; const add = (code, detail) => f.push({ code, detail });
    if (sp !== null && sp > target) add('over_target', `Supplies were ${sp}% of production (${total} of ${p}); your target is ${target}%.`);
    for (const c of cats) { const here = catMonth.get(`${c}|${m}`) || 0; const others = months.filter((x) => x !== m).map((x) => catMonth.get(`${c}|${x}`) || 0).filter((x) => x > 0); if (!here || !others.length) continue; const avg = others.reduce((s, x) => s + x, 0) / others.length; if (here > avg * spike / 100) add('category_spike', `${c} came to ${here}, ${round2((here / avg) * 100)}% of its other months (average ${round2(avg)}).`); }
    items.push({ kind: 'month', month: m, supplier: '', invoice_number: '', item: '', category: '', amount: null, supplies: total, production: p, supply_pct: sp, status: STATUSES.find((s) => f.some((x) => x.code === s)) || 'ok', findings: f });
  }
  items.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : a.kind === b.kind ? 0 : a.kind === 'month' ? -1 : 1));
  const total = round2(rows.reduce((s, l) => s + l.amount, 0)); const ptotal = round2(months.reduce((s, m) => s + (prod.get(m) || 0), 0));
  const by_category = cats.map((c) => ({ category: c, amount: round2(rows.filter((l) => l.category === c).reduce((s, l) => s + l.amount, 0)) })).sort((a, b) => b.amount - a.amount);
  return { months: months.length, lines: rows.length, supplies: total, production: ptotal || null, supply_pct: ptotal ? pct(total, ptotal) : null, to_review: items.filter((i) => i.status !== 'ok').length, by_status: tally(items, 'status'), by_finding: tally(items, (i) => i.findings.map((f) => f.code)), by_category, items };
}
