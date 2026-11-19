import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, REFUSE, sectionTitle, exportProfile } from 'fairclinic-core';
import { ADJUSTMENT_FIELDS, PRODUCTION_FIELDS, SETTINGS_SCHEMA, STATUSES, checkWriteoffs } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  adjustments: fileArg('Adjustments and write-offs under --root (Dentrix adjustments report, Eaglesoft, Open Dental, Curve or Denticon export): date, patient, type, carrier, amount, entered by, note'),
  production: fileArg('Optional production by carrier under --root (carrier, gross production) for write-off percent'),
  settings: fileArg('Optional settings JSON: in_network (PPO names), large_amount'),
};
const run = (a, ctx) => checkWriteoffs(ctx.records(a.adjustments, 'adjustments'), a.production ? ctx.records(a.production, 'production') : [], { settings: a.settings ? ctx.readJson(a.settings, 'writeoff_settings') : {} });
const summary = (o) => `${o.adjustments} adjustment(s), ${o.total} in total: ${o.contractual} contractual, ${o.discretionary} discretionary. ${o.needs_review} to review: ${o.duplicates} duplicate(s), ${o.out_of_network} contractual write-off(s) for out-of-network carriers, ${o.no_carrier} with no carrier, ${o.no_reason} without a reason, ${o.large} large.`;

export const manifest = clinicAgent({
  pkg, prefix: 'writeoffs', title: 'Fairclinic PPO Write-offs',
  description: pkg.description,
  args, required: ['adjustments'], statuses: STATUSES,
  configSchemas: { writeoff_settings: SETTINGS_SCHEMA },
  sources: {
    adjustments: { label: 'Adjustments and write-offs', args: ['adjustments'], fields: ADJUSTMENT_FIELDS, profiles: [exportProfile('dentrix_adjustments', { type: 'Adjustment Type', patient_name: 'Patient Name', entered_by: 'Entered By', amount: 'Amount', date: 'Date', carrier: 'Carrier', note: 'Note' })] },
    production: { label: 'Production by carrier', args: ['production'], fields: PRODUCTION_FIELDS },
  },
  run, summary,
  check: { title: 'Review write-offs', description: 'Every adjustment as contractual (PPO) or discretionary, with a status: duplicate, out_of_network, no_carrier, no_reason, large or ok. Contractual write-offs by carrier with write-off percent of production; discretionary adjustments by the person who entered them.' },
  reads: [{
    name: 'writeoffs_by_staff', title: 'Discretionary adjustments by person', description: 'Per person who entered them: discretionary adjustments, amount, share of the total and how many have no reason.',
    properties: args, required: ['adjustments'],
    run: (a, ctx) => { const o = run(a, ctx); return { summary: o.by_staff.map((s) => `${s.entered_by}: ${s.count} for ${s.amount} (${s.share_pct}%), ${s.without_reason} without a reason`).join('; ') || 'No discretionary adjustments.', by_staff: o.by_staff }; },
  }],
  report: {
    title: T9('Write-off review', 'Prüfung der Abschreibungen', 'Revue des abandons de créances', 'Revisión de cancelaciones', 'Revisão de baixas', 'Revisione delle rettifiche', '減額・償却の確認', '核销审查', '감액 검토'),
    base: 'writeoffs-review',
    rows: (o) => o.items.filter((i) => i.status !== 'ok').map((i) => ({ status: i.status, date: i.date, patient_name: i.patient_name, type: i.type, carrier: i.carrier, amount: i.amount, entered_by: i.entered_by, note: i.note, reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'date', 'type', 'carrier', 'amount', 'entered_by', 'reasons'],
    sections: (o) => [
      { title: sectionTitle('by_payer'), rows: o.by_carrier, columns: ['carrier', 'count', 'writeoffs', 'production', 'writeoff_pct'] },
      { title: sectionTitle('by_staff'), rows: o.by_staff, columns: ['entered_by', 'count', 'amount', 'share_pct', 'without_reason'] },
    ],
    limits: [CLINIC_LIMITS.files, 'An adjustment is read as contractual when its type says PPO, contractual or insurance write-off; everything else is discretionary. Name your types in the export if they differ.', 'Listing who entered an adjustment is for review, not a finding about anyone.', CLINIC_LIMITS.phi, CLINIC_LIMITS.baa, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.pms_write('adjustments or balances'), REFUSE.refund(), REFUSE.insurer_submit('a carrier')],
  prompt: {
    title: 'Review write-offs', description: 'Walks the host model through a write-off review.',
    text: 'You are helping a dental office manager with fairclinic-ppo-writeoffs. Rules: it never changes or reverses an adjustment and never refunds; a person entered each adjustment and a person reviews it; patient names are pseudonyms. 1. Call writeoffs_check with your in-network list in the settings. Lead with duplicates and contractual write-offs for out-of-network carriers, then adjustments with no reason. 2. Use writeoffs_by_staff for who entered discretionary adjustments; present it neutrally. 3. Call writeoffs_write_report.',
  },
});
