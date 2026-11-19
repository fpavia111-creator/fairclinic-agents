import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, REFUSE, sectionTitle, exportProfile } from 'fairclinic-core';
import { PRODUCTION_FIELDS, SETTINGS_SCHEMA, STATUSES, checkProduction } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  production: fileArg('Production and collections by provider and month under --root (Dentrix, Eaglesoft, Open Dental, Curve or Denticon provider report): provider, month, gross production, adjustments, collections'),
  settings: fileArg('Optional settings JSON: collection_target_pct, adjustment_max_pct, drop_pct'),
};
const run = (a, ctx) => checkProduction(ctx.records(a.production, 'production'), { settings: a.settings ? ctx.readJson(a.settings, 'production_settings') : {} });
const summary = (o) => `${o.providers} provider(s) over ${o.months} month(s): gross ${o.gross_production}, adjustments ${o.adjustments}, net ${o.net_production}, collected ${o.collections} (${o.collection_pct}% of net). ${o.to_review} provider-month(s) to review: ${o.by_status.production_drop || 0} drop(s), ${o.by_status.low_collections || 0} low collection month(s), ${o.by_status.high_adjustments || 0} with high adjustments, ${o.by_status.missing_month || 0} missing month(s).`;

export const manifest = clinicAgent({
  pkg, prefix: 'production', title: 'Fairclinic Provider Production',
  description: pkg.description,
  args, required: ['production'], statuses: STATUSES,
  configSchemas: { production_settings: SETTINGS_SCHEMA },
  sources: { production: { label: 'Production and collections by provider', args: ['production'], fields: PRODUCTION_FIELDS, profiles: [exportProfile('denticon_production', { provider: 'Provider Name', month: 'Period', gross_production: 'Gross Prod', adjustments: 'Adjustments', collections: 'Total Collections' })] } },
  run, summary,
  check: { title: 'Review provider production', description: 'Every provider and month with gross production, adjustments, net production, collections, collection percent of net and adjustment percent of gross, and a status: missing_month, production_drop, low_collections, high_adjustments or ok. Totals per provider.' },
  reads: [{
    name: 'production_by_provider', title: 'Totals by provider', description: 'Per provider over the whole file: months, gross and net production, adjustments, collections and collection percent.',
    properties: args, required: ['production'],
    run: (a, ctx) => { const o = run(a, ctx); return { summary: o.by_provider.map((p) => `${p.provider}: net ${p.net_production}, collected ${p.collections} (${p.collection_pct}%)`).join('; '), by_provider: o.by_provider }; },
  }],
  report: {
    title: T9('Provider production and collections', 'Leistung und Einnahmen je Behandler', 'Production et encaissements par praticien', 'Producción y cobros por profesional', 'Produção e recebimentos por profissional', 'Produzione e incassi per professionista', '担当者別の売上と入金', '按医生的产值与收款', '제공자별 매출과 수납'),
    base: 'production-by-provider',
    rows: (o) => o.items.map((i) => ({ status: i.status, provider: i.provider, month: i.month, gross_production: i.gross_production, adjustments: i.adjustments, net_production: i.net_production, collections: i.collections, collection_pct: i.collection_pct, adjustment_pct: i.adjustment_pct, reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'provider', 'month', 'gross_production', 'net_production', 'collections', 'collection_pct', 'reasons'],
    sections: (o) => [{ title: sectionTitle('by_provider'), rows: o.by_provider, columns: ['provider', 'months', 'gross_production', 'adjustments', 'net_production', 'collections', 'collection_pct'] }],
    limits: [CLINIC_LIMITS.files, 'Collections in a month pay for work from earlier months, so one month\'s percent moves around; read the totals over several months.', CLINIC_LIMITS.rules, 'Not a measure of anyone\'s clinical work or a pay calculation.', CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.pms_write('production or provider records'), { name: 'payroll_change', category: 'binding_send', description: 'Never changes pay, bonuses or provider compensation.' }],
  prompt: {
    title: 'Review provider production', description: 'Walks the host model through production and collections by provider.',
    text: 'You are helping a dental office manager with fairclinic-provider-production. Rules: it changes nothing and is not a pay calculation or a judgment of anyone\'s clinical work. 1. Call production_check. Lead with missing months (the export may be incomplete), then drops, low collections and high adjustments. 2. Use production_by_provider for totals. 3. Call production_write_report.',
  },
});
