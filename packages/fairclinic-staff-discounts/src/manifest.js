import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, REFUSE, sectionTitle } from 'fairclinic-core';
import { DISCOUNT_FIELDS, SETTINGS_SCHEMA, STATUSES, checkDiscounts } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  discounts: fileArg('Discounts and write-offs under --root (AVImark, Cornerstone, ezyVet, Covetrus Pulse or Shepherd discount report): date, invoice, client, type, amount, invoice total, entered by, approved by, reason'),
  settings: fileArg('Optional settings JSON: approval_over, max_pct, staff_accounts (your own policy)'),
};
const run = (a, ctx) => checkDiscounts(ctx.records(a.discounts, 'discounts'), { settings: a.settings ? ctx.readJson(a.settings, 'discount_settings') : {} });
const summary = (o) => `${o.discounts} discount(s) and write-off(s), ${o.total} in total. ${o.to_review} to review against your policy: ${o.by_finding.self_approved || 0} approved by the person who gave them, ${o.by_finding.no_approver || 0} with no approver, ${o.by_finding.staff_discount_non_staff || 0} staff discount(s) on accounts not on the staff list, ${o.by_finding.high_pct || 0} above your percent limit, ${o.by_finding.no_reason || 0} without a reason.`;

export const manifest = clinicAgent({
  pkg, prefix: 'discounts', title: 'Fairclinic Staff Discounts',
  description: pkg.description,
  args, required: ['discounts'], statuses: STATUSES,
  configSchemas: { discount_settings: SETTINGS_SCHEMA },
  sources: { discounts: { label: 'Discounts and write-offs', args: ['discounts'], fields: DISCOUNT_FIELDS } },
  run, summary,
  check: { title: 'Review discounts by staff', description: 'Every discount or write-off against your policy, with a status: self_approved, no_approver, staff_discount_non_staff, high_pct, no_reason or ok; totals by the person who entered them and by type.' },
  reads: [{
    name: 'discounts_by_staff', title: 'Discounts by person', description: 'Per person who entered them: count, amount, share of the total and how many are flagged.',
    properties: args, required: ['discounts'],
    run: (a, ctx) => { const o = run(a, ctx); return { summary: o.by_staff.map((s) => `${s.entered_by}: ${s.count} for ${s.amount} (${s.share_pct}%), ${s.flagged} flagged`).join('; '), by_staff: o.by_staff, by_type: o.by_type }; },
  }],
  report: {
    title: T9('Discounts and write-offs by staff', 'Rabatte und Abschreibungen nach Mitarbeitenden', 'Remises et abandons par membre du personnel', 'Descuentos y cancelaciones por empleado', 'Descontos e baixas por funcionário', 'Sconti e rettifiche per membro del personale', 'スタッフ別の値引きと減額', '按员工的折扣与核销', '직원별 할인과 감액'),
    base: 'discounts-by-staff',
    rows: (o) => o.items.filter((i) => i.status !== 'ok').map((i) => ({ status: i.status, date: i.date, invoice_number: i.invoice_number, client_name: i.client_name, discount_type: i.discount_type, amount: i.amount, share_pct: i.share_pct, entered_by: i.entered_by, approved_by: i.approved_by, reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'date', 'invoice_number', 'discount_type', 'amount', 'share_pct', 'entered_by', 'approved_by', 'reasons'],
    sections: (o) => [{ title: sectionTitle('by_staff'), rows: o.by_staff, columns: ['entered_by', 'count', 'amount', 'share_pct', 'flagged'] }, { title: sectionTitle('by_type'), rows: o.by_type, columns: ['discount_type', 'count', 'amount'] }],
    limits: [CLINIC_LIMITS.files, 'The thresholds are your own policy settings. A flag is a question for a manager, not a finding about anyone.', CLINIC_LIMITS.phi, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.pms_write('invoices or discounts'), { name: 'staff_action', category: 'binding_send', description: 'Never disciplines, messages or reports a member of staff.' }, REFUSE.refund()],
  prompt: {
    title: 'Review discounts by staff', description: 'Walks the host model through discounts and write-offs.',
    text: 'You are helping a veterinary practice owner with fairclinic-staff-discounts. Rules: it changes nothing, contacts no one, and a flag is a question for a manager, never an accusation; client names are pseudonyms. 1. Call discounts_check with your policy settings. Lead with discounts approved by the person who gave them or with no approver, then staff discounts on accounts not on the staff list, then high percentages and missing reasons. 2. Use discounts_by_staff, presented neutrally. 3. Call discounts_write_report.',
  },
});
