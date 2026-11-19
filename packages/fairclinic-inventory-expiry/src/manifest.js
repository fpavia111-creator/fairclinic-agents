import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, REFUSE, sectionTitle, exportProfile } from 'fairclinic-core';
import { STOCK_FIELDS, COUNT_FIELDS, SETTINGS_SCHEMA, STATUSES, checkInventory } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  stock: fileArg('Stock on hand by lot under --root (Covetrus Pulse, AVImark, Cornerstone, ezyVet, Shepherd or a dental supply tracker): item, lot, expiry, quantity on hand, unit cost'),
  counts: fileArg('Optional count sheet under --root for shrink: item, opening, received, used (sold or dispensed), counted, unit cost'),
  settings: fileArg('Optional settings JSON: expiring_days, count_tolerance'),
  as_of: AS_OF_ARG,
};
const run = (a, ctx) => checkInventory(ctx.records(a.stock, 'stock'), a.counts ? ctx.records(a.counts, 'counts') : [], { settings: a.settings ? ctx.readJson(a.settings, 'inventory_settings') : {}, asOf: a.as_of });
const summary = (o) => `${o.lots} lot(s) worth ${o.stock_value} at cost. ${o.to_review} to review: ${o.by_status.expired || 0} expired lot(s) (${o.expired_value}), ${o.by_status.expiring || 0} expiring soon (${o.expiring_value}), ${o.by_status.no_expiry_date || 0} without an expiry date, ${o.by_status.shrink || 0} item(s) with shrink (${o.shrink_value}), ${o.by_status.overage || 0} with more counted than expected.`;

export const manifest = clinicAgent({
  pkg, prefix: 'inventory', title: 'Fairclinic Inventory Expiry',
  description: pkg.description,
  args, required: ['stock'], statuses: STATUSES,
  configSchemas: { inventory_settings: SETTINGS_SCHEMA },
  sources: { stock: { label: 'Stock on hand by lot', args: ['stock'], fields: STOCK_FIELDS, profiles: [exportProfile('covetrus_pulse_inventory', { item: 'Item Name', lot: 'Lot Number', expiry: 'Expiration Date', on_hand: 'Quantity On Hand', unit_cost: 'Unit Cost' })] }, counts: { label: 'Count sheet', args: ['counts'], fields: COUNT_FIELDS } },
  run, summary,
  check: { title: 'Check expiry and shrink', description: 'Every lot with days to expiry and value at cost, and every counted item with expected against counted, with a status: expired, shrink, expiring, overage, no_expiry_date or ok.' },
  report: {
    title: T9('Inventory expiry and shrink', 'Ablaufdaten und Schwund im Lager', 'Péremptions et démarque du stock', 'Caducidad y merma del inventario', 'Validade e perdas do estoque', 'Scadenze e ammanchi di magazzino', '在庫の期限切れと減耗', '库存过期与损耗', '재고 유효기간과 손실'),
    base: 'inventory-expiry',
    rows: (o) => o.items.filter((i) => i.status !== 'ok').map((i) => ({ status: i.status, kind: i.kind, item: i.item, lot: i.lot, expiry: i.expiry, days_left: i.days_left, on_hand: i.on_hand, expected: i.expected, difference: i.difference, value: i.value, reason: i.detail })),
    htmlColumns: ['status', 'item', 'lot', 'expiry', 'on_hand', 'difference', 'value', 'reason'],
    sections: (o) => [{ title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] }],
    limits: [CLINIC_LIMITS.files, 'Values are at the cost in your file. What to do with expired stock (and with expired controlled drugs in particular) follows your own procedure and the rules that apply to you; the agent does not decide it.', CLINIC_LIMITS.advice],
  },
  refused: [{ name: 'stock_dispose', category: 'binding_send', description: 'Never disposes of, returns or writes off stock.' }, REFUSE.pms_write('inventory quantities'), { name: 'order_place', category: 'binding_send', description: 'Never places or changes an order.' }],
  prompt: {
    title: 'Check inventory expiry and shrink', description: 'Walks the host model through expiry and shrink.',
    text: 'You are helping a clinic inventory manager with fairclinic-inventory-expiry. Rules: it never disposes of, returns or writes off stock and never changes quantities or orders. 1. Call inventory_check (with the count sheet for shrink). Lead with expired stock still on hand, then shrink by value, then stock expiring soon. 2. Call inventory_write_report.',
  },
});
