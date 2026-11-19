import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, REFUSE, sectionTitle } from 'fairclinic-core';
import { PRICE_FIELDS, SALES_FIELDS, SETTINGS_SCHEMA, STATUSES, checkPharmacy } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  prices: fileArg('Pharmacy price list under --root (AVImark, Cornerstone, ezyVet, Covetrus Pulse or Shepherd item list): item, Rx or OTC, cost, previous cost, price, previous price, dispensing fee'),
  sales: fileArg('Optional quantities sold under --root (item, quantity) to put a figure on margin gaps'),
  settings: fileArg('Optional settings JSON: target_margin_pct, cost_rise_pct, rx_needs_fee'),
};
const run = (a, ctx) => checkPharmacy(ctx.records(a.prices, 'prices'), a.sales ? ctx.records(a.sales, 'sales') : [], { settings: a.settings ? ctx.readJson(a.settings, 'pharmacy_settings') : {} });
const summary = (o) => `${o.items_checked} item(s), average margin ${o.average_margin_pct}% of price. ${o.to_review} to review: ${o.by_finding.below_cost || 0} priced below cost, ${o.by_finding.cost_rise_not_passed || 0} cost rise(s) not passed on, ${o.by_finding.low_margin || 0} under the target margin, ${o.by_finding.no_dispensing_fee || 0} prescription item(s) with no dispensing fee. Gap to target on the quantities sold: ${o.gap_to_target}.`;

export const manifest = clinicAgent({
  pkg, prefix: 'pharmacy', title: 'Fairclinic Pharmacy Margins',
  description: pkg.description,
  args, required: ['prices'], statuses: STATUSES,
  configSchemas: { pharmacy_settings: SETTINGS_SCHEMA },
  sources: { prices: { label: 'Pharmacy price list', args: ['prices'], fields: PRICE_FIELDS }, sales: { label: 'Quantities sold', args: ['sales'], fields: SALES_FIELDS } },
  run, summary,
  check: { title: 'Check pharmacy margins', description: 'Every item with cost, price, margin as a percent of price and, with sales, the gap to your target, with a status: below_cost, cost_rise_not_passed, low_margin, no_dispensing_fee or ok.' },
  report: {
    title: T9('Pharmacy margins', 'Margen der Praxisapotheke', 'Marges de la pharmacie', 'Márgenes de farmacia', 'Margens da farmácia', 'Margini della farmacia', '院内薬局の利益率', '药房毛利', '약국 마진'),
    base: 'pharmacy-margins',
    rows: (o) => o.items.filter((i) => i.status !== 'ok').map((i) => ({ status: i.status, item: i.item, item_type: i.item_type, cost: i.cost, previous_cost: i.previous_cost, price: i.price, margin_pct: i.margin_pct, dispensing_fee: i.dispensing_fee, sold: i.sold, gap_to_target: i.gap_to_target, reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'item', 'cost', 'price', 'margin_pct', 'sold', 'gap_to_target', 'reasons'],
    sections: (o) => [{ title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] }],
    limits: [CLINIC_LIMITS.files, 'The target margin is your setting. Pricing is your decision; the agent changes no price.', CLINIC_LIMITS.arithmetic, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.pms_write('prices'), { name: 'order_place', category: 'binding_send', description: 'Never places or changes an order.' }],
  prompt: {
    title: 'Check pharmacy margins', description: 'Walks the host model through pharmacy margins.',
    text: 'You are helping a veterinary practice manager with fairclinic-pharmacy-margins. Rules: it never changes a price or an order; pricing is the practice\'s decision. 1. Call pharmacy_check (with sales if you have them). Lead with items below cost and cost rises not passed on, then margins under target by gap, then prescription items with no dispensing fee. 2. Call pharmacy_write_report.',
  },
});
