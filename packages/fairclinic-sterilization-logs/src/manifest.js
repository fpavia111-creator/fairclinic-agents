import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, REFUSE, sectionTitle } from 'fairclinic-core';
import { CYCLE_FIELDS, SPORE_FIELDS, SETTINGS_SCHEMA, STATUSES, checkSterilization } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  cycles: fileArg('Sterilizer cycle log under --root (digital log export or the spreadsheet you keep): date, sterilizer, cycle number, result, initials'),
  spores: fileArg('Optional spore (biological indicator) test log under --root: date, sterilizer, result'),
  settings: fileArg('Optional settings JSON: spore_interval_days (your own schedule), retest_days'),
  as_of: AS_OF_ARG,
};
const run = (a, ctx) => checkSterilization(ctx.records(a.cycles, 'cycles'), a.spores ? ctx.records(a.spores, 'spores') : [], { settings: a.settings ? ctx.readJson(a.settings, 'sterilization_settings') : {}, asOf: a.as_of });
const summary = (o) => `${o.sterilizers} sterilizer(s), ${o.cycles} cycle(s), ${o.spore_tests} spore test(s). ${o.open_items} open item(s) in the logs: ${o.by_status.positive_no_followup || 0} positive spore test(s) with no retest logged, ${o.by_status.failed_no_rerun || 0} failed cycle(s) with no rerun logged, ${o.by_status.spore_gap || 0} gap(s) between spore tests, ${o.by_status.cycle_number_gap || 0} gap(s) in cycle numbers, ${o.by_status.missing_entry || 0} incomplete entr(ies). This is a log completeness check, not a compliance finding.`;

export const manifest = clinicAgent({
  pkg, prefix: 'sterilization', title: 'Fairclinic Sterilization Logs',
  description: pkg.description,
  args, required: ['cycles'], statuses: STATUSES,
  configSchemas: { sterilization_settings: SETTINGS_SCHEMA },
  sources: { cycles: { label: 'Sterilizer cycle log', args: ['cycles'], fields: CYCLE_FIELDS }, spores: { label: 'Spore test log', args: ['spores'], fields: SPORE_FIELDS } },
  run, summary,
  check: { title: 'Check the sterilization logs', description: 'Open items in the logs: positive_no_followup, failed_no_rerun, spore_gap, cycle_number_gap and missing_entry, each with the sterilizer, date and what the log does not show; a summary per sterilizer. It does not decide whether any rule is met.' },
  report: {
    title: T9('Sterilization log check', 'Prüfung der Sterilisationsprotokolle', 'Contrôle des registres de stérilisation', 'Revisión de registros de esterilización', 'Verificação dos registros de esterilização', 'Verifica dei registri di sterilizzazione', '滅菌記録の確認', '灭菌记录检查', '멸균 기록 점검'),
    base: 'sterilization-log-check',
    rows: (o) => o.items.map((i) => ({ status: i.status, sterilizer: i.sterilizer, date: i.date, ref: i.ref, detail: i.detail })),
    htmlColumns: ['status', 'sterilizer', 'date', 'ref', 'detail'],
    sections: (o) => [{ title: sectionTitle('by_device'), rows: o.by_sterilizer, columns: ['sterilizer', 'cycles', 'failed_cycles', 'spore_tests', 'positive_tests', 'last_spore_test', 'open_items'] }],
    limits: [CLINIC_LIMITS.files, 'This shows what the logs do and do not contain. It does not decide whether any law, rule or standard is met, and the spore interval is your own setting.', 'It does not tell anyone what to do with a load or a sterilizer; follow your written protocol and the manufacturer\'s instructions.', CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.file_report('a regulator, board or inspector'), { name: 'log_edit', category: 'binding_send', description: 'Never adds to, edits or back-fills a sterilization log.' }],
  prompt: {
    title: 'Check sterilization logs', description: 'Walks the host model through the sterilization log check.',
    text: 'You are helping a clinic manager with fairclinic-sterilization-logs. Rules: it only reports what the logs show and do not show; never say the clinic is or is not compliant, never tell anyone what to do with a load, and never suggest back-filling a log. 1. Call sterilization_check. Lead with positive spore tests without a logged retest and failed cycles without a logged rerun, then gaps. 2. Call sterilization_write_report for the person responsible for infection control.',
  },
});
