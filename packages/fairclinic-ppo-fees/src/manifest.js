import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, REFUSE, sectionTitle } from 'fairclinic-core';
import { FEE_FIELDS, SCHEDULE_FIELDS, PAID_FIELDS, SETTINGS_SCHEMA, STATUSES, checkFees } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  fees: fileArg('Your office fee schedule under --root (practice-management fee schedule export): code, description, office fee'),
  schedules: fileArg('PPO fee schedules under --root, one row per plan and code: plan, code, allowed amount'),
  plan: { type: 'string', maxLength: 120, description: 'Plan name for a schedules file with no plan column (a payer\'s published schedule, one plan per file)' },
  paid: fileArg('Optional lines the PPOs allowed under --root (ERA or insurance payment detail export): plan, code, allowed amount'),
  settings: fileArg('Optional settings JSON: tolerance, deep_discount_pct'),
};
const schedulesOf = (a, ctx) => {
  const rows = ctx.records(a.schedules, 'schedules');
  if (a.plan) return rows.map((r) => (String(r.plan ?? '').trim() ? r : { ...r, plan: a.plan }));
  if (rows.some((r) => !String(r.plan ?? '').trim())) throw new Error(`${a.schedules} has rows with no plan: name the plan with the plan argument (a payer's published schedule has one plan per file)`);
  return rows;
};
const run = (a, ctx) => checkFees(ctx.records(a.fees, 'fees'), schedulesOf(a, ctx), a.paid ? ctx.records(a.paid, 'paid') : [], { settings: a.settings ? ctx.readJson(a.settings, 'fee_settings') : {} });
const summary = (o) => `${o.codes_checked} plan and code pair(s) across ${o.plans} plan(s), ${o.needs_review} to review: ${o.paid_below_schedule} allowed below the plan's own fee (${o.underpaid_amount}), ${o.fee_below_allowed} office fee(s) below the plan fee (about ${o.left_by_low_fees} left), ${o.not_in_schedule} code(s) missing from a schedule, ${o.no_office_fee} with no office fee, ${o.deep_discount} deep discount(s).${o.not_offered ? ` ${o.not_offered} code(s) on the schedules have no office fee and were not allowed on any line (listed as not_offered).` : ''}`;

export const manifest = clinicAgent({
  pkg, prefix: 'fees', title: 'Fairclinic PPO Fees',
  description: pkg.description,
  args, required: ['fees', 'schedules'], statuses: STATUSES,
  configSchemas: { fee_settings: SETTINGS_SCHEMA },
  sources: {
    fees: { label: 'Office fee schedule', args: ['fees'], fields: FEE_FIELDS },
    schedules: { label: 'PPO fee schedules', args: ['schedules'], fields: SCHEDULE_FIELDS },
    paid: { label: 'Lines the PPOs allowed', args: ['paid'], fields: PAID_FIELDS },
  },
  run, summary,
  check: { title: 'Compare office fees with PPO fees', description: 'Every plan and code with the office fee, the plan\'s allowed amount, what the plan actually allowed and the write-off percent, and a status: paid_below_schedule, fee_below_allowed, not_in_schedule, no_office_fee, deep_discount or ok. Average write-off per plan.' },
  reads: [{
    name: 'fees_by_plan', title: 'Write-off percent by plan', description: 'Average write-off percent per plan (office fee against the plan\'s allowed amount), highest first.',
    properties: args, required: ['fees', 'schedules'],
    run: (a, ctx) => { const o = run(a, ctx); return { summary: o.by_plan.map((p) => `${p.plan}: ${p.avg_writeoff_pct}% over ${p.codes} code(s)`).join('; ') || 'No plan has codes with an office fee.', by_plan: o.by_plan }; },
  }],
  report: {
    title: T9('PPO fee check', 'Prüfung der PPO-Honorare', 'Contrôle des barèmes PPO', 'Revisión de tarifas PPO', 'Conferência das tabelas PPO', 'Verifica delle tariffe PPO', 'PPO料金表の確認', 'PPO 收费表核对', 'PPO 수가 점검'),
    base: 'fees-ppo-check',
    rows: (o) => o.items.filter((i) => i.status !== 'ok').map((i) => ({ status: i.status, plan: i.plan, code: i.code, description: i.description, office_fee: i.office_fee, plan_allowed: i.plan_allowed, avg_allowed_paid: i.avg_allowed_paid, lines_paid: i.lines_paid, writeoff_pct: i.writeoff_pct, reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'plan', 'code', 'office_fee', 'plan_allowed', 'avg_allowed_paid', 'writeoff_pct', 'reasons'],
    sections: (o) => [{ title: sectionTitle('by_plan'), rows: o.by_plan, columns: ['plan', 'codes', 'avg_writeoff_pct'] }],
    limits: [CLINIC_LIMITS.files, 'Plan fees are the schedules you supply; plans change them, so use the current version. "About ... left" assumes the plan pays the lower of your fee and its own, which most PPO contracts say; read yours.', 'It does not tell you what to charge. Fee setting is your decision.', CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.pms_write('the fee schedule in the practice-management system'), REFUSE.insurer_submit('a PPO'), { name: 'contract_sign', category: 'binding_send', description: 'Never signs, joins, leaves or renegotiates a PPO contract.' }],
  prompt: {
    title: 'Check PPO fees', description: 'Walks the host model through a PPO fee check.',
    text: 'You are helping a dental office manager with fairclinic-ppo-fees. Rules: it never changes fees in the practice system and never contacts or signs anything with a PPO; it does not say what to charge. 1. Call fees_check. Lead with lines allowed below the plan\'s own fee (money to ask for), then office fees below a plan fee, then codes missing from a schedule. 2. Use fees_by_plan for write-off percent by plan. 3. Call fees_write_report for the list.',
  },
});
