import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, REFUSE, sectionTitle } from 'fairclinic-core';
import { LINE_FIELDS, PRODUCTION_FIELDS, SETTINGS_SCHEMA, STATUSES, checkSupplies } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  invoices: fileArg('Supplier invoice lines under --root (supplier order history or accounts payable export): supplier, invoice, date, item, category, quantity, unit price, amount'),
  production: fileArg('Optional production by month under --root (month, production) for supplies as a percent of production'),
  settings: fileArg('Optional settings JSON: target_pct, price_increase_pct, spike_pct'),
};
const run = (a, ctx) => checkSupplies(ctx.records(a.invoices, 'invoices'), a.production ? ctx.records(a.production, 'production') : [], { settings: a.settings ? ctx.readJson(a.settings, 'supply_settings') : {} });
const summary = (o) => `${o.lines} supply line(s) over ${o.months} month(s): ${o.supplies}${o.supply_pct === null ? '' : `, ${o.supply_pct}% of production`}. ${o.to_review} to review: ${o.by_finding.duplicate_line || 0} repeated line(s), ${o.by_finding.price_increase || 0} price increase(s), ${o.by_finding.over_target || 0} month(s) over target, ${o.by_finding.category_spike || 0} category spike(s).`;

export const manifest = clinicAgent({
  pkg, prefix: 'supplies', title: 'Fairclinic Supply Costs',
  description: pkg.description,
  args, required: ['invoices'], statuses: STATUSES,
  configSchemas: { supply_settings: SETTINGS_SCHEMA },
  sources: { invoices: { label: 'Supplier invoice lines', args: ['invoices'], fields: LINE_FIELDS }, production: { label: 'Production by month', args: ['production'], fields: PRODUCTION_FIELDS } },
  run, summary,
  check: { title: 'Review supply costs', description: 'Each month with supplies, production and supplies as a percent of production, plus supplier lines with a problem, with a status: duplicate_line, price_increase, over_target, category_spike or ok. Totals by category.' },
  report: {
    title: T9('Supply costs', 'Materialkosten', 'Coûts des fournitures', 'Costos de suministros', 'Custos de materiais', 'Costi dei materiali', '材料費', '耗材成本', '재료비'),
    base: 'supplies-review',
    rows: (o) => o.items.map((i) => ({ status: i.status, kind: i.kind, month: i.month, supplier: i.supplier, invoice_number: i.invoice_number, item: i.item, amount: i.amount, supplies: i.supplies, production: i.production, supply_pct: i.supply_pct, reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'month', 'supplier', 'item', 'amount', 'supplies', 'supply_pct', 'reasons'],
    sections: (o) => [{ title: sectionTitle('by_category_cost'), rows: o.by_category, columns: ['category', 'amount'] }],
    limits: [CLINIC_LIMITS.files, 'The target percent is your setting, not an industry standard. Prices are compared with the last price paid for the same item from the same supplier.', CLINIC_LIMITS.arithmetic, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.pay(), { name: 'order_place', category: 'binding_send', description: 'Never places, changes or cancels a supply order.' }],
  prompt: {
    title: 'Review supply costs', description: 'Walks the host model through supply costs.',
    text: 'You are helping a clinic office manager with fairclinic-supply-costs. Rules: it never pays a supplier and never places or changes an order. 1. Call supplies_check with production if you have it. Lead with repeated lines (possible double billing), then price increases, then months over target and category spikes. 2. Call supplies_write_report.',
  },
});
