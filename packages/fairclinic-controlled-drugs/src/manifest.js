import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, REFUSE, sectionTitle, exportProfile } from 'fairclinic-core';
import { LOG_FIELDS, COUNT_FIELDS, SETTINGS_SCHEMA, STATUSES, checkDrugs } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  log: fileArg('Controlled drug log under --root (AVImark, Cornerstone, ezyVet, Covetrus Pulse or Shepherd controlled substance log, or a logging system export): date, drug, schedule, type (opening, received, administered, dispensed, wasted, adjustment), quantity, running balance, patient, initials, witness'),
  counts: fileArg('Physical count or on-hand file under --root: drug, counted quantity, count date'),
  settings: fileArg('Optional settings JSON: tolerance, waste_needs_witness (your own protocol)'),
};
const run = (a, ctx) => checkDrugs(ctx.records(a.log, 'log'), ctx.records(a.counts, 'counts'), { settings: a.settings ? ctx.readJson(a.settings, 'drug_settings') : {} });
const summary = (o) => `${o.drugs} drug(s), ${o.entries} log entr(ies). ${o.to_review} item(s) to review: ${o.count_mismatches} count(s) that differ from the log, ${o.by_status.balance_math || 0} arithmetic error(s) in written balances, ${o.by_status.waste_no_witness || 0} waste entr(ies) with no witness, ${o.by_status.no_patient || 0} use(s) with no patient, ${o.by_status.missing_initials || 0} without initials, ${o.by_status.no_count || 0} drug(s) not counted. This reports the log; it is not a compliance finding.`;

export const manifest = clinicAgent({
  pkg, prefix: 'drugs', title: 'Fairclinic Controlled Drugs',
  description: pkg.description,
  args, required: ['log', 'counts'], statuses: STATUSES,
  configSchemas: { drug_settings: SETTINGS_SCHEMA },
  sources: {
    log: { label: 'Controlled drug log', args: ['log'], fields: LOG_FIELDS, profiles: [exportProfile('avimark_controlled_log', { drug: 'Drug Name', date: 'Trans Date', quantity: 'Qty', running_balance: 'Balance', initials: 'Initials', entry_type: 'Transaction', patient_name: 'Patient', witness: 'Witness', schedule: 'Class' })] },
    counts: { label: 'Physical counts', args: ['counts'], fields: COUNT_FIELDS },
  },
  run, summary,
  check: { title: 'Reconcile the controlled drug log', description: 'Per drug: the balance worked out from the log entries against the written balance and the physical count; per entry: arithmetic errors, waste with no witness, use with no patient, no initials. Statuses: count_mismatch, balance_math, waste_no_witness, no_patient, missing_initials, no_count or ok.' },
  report: {
    title: T9('Controlled drug log reconciliation', 'Abgleich des Betäubungsmittelbuchs', 'Rapprochement du registre des stupéfiants', 'Conciliación del registro de sustancias controladas', 'Conciliação do livro de controlados', 'Riconciliazione del registro degli stupefacenti', '管理薬品記録の照合', '管制药品记录核对', '마약류 기록 대사'),
    base: 'drugs-reconciliation',
    rows: (o) => o.items.map((i) => ({ status: i.status, kind: i.kind, drug: i.drug, schedule: i.schedule, date: i.date, entry_type: i.entry_type, quantity: i.quantity, running_balance: i.running_balance, patient_name: i.patient_name, initials: i.initials, detail: i.detail })),
    htmlColumns: ['status', 'drug', 'schedule', 'date', 'entry_type', 'quantity', 'running_balance', 'detail'],
    sections: (o) => [{ title: sectionTitle('by_drug'), rows: o.by_drug, columns: ['drug', 'schedule', 'entries', 'log_balance', 'written_balance', 'counted', 'difference', 'status'] }],
    limits: [CLINIC_LIMITS.files, 'This reports what the log and the count show. It does not decide whether any DEA or state rule is met, and it never files a report or form; your registrant and your written procedures decide what happens next.', 'Quantities are compared in the units the log uses; mixing mL and tablets for one drug will not add up.', CLINIC_LIMITS.phi, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.file_report('the DEA, a state board or the police'), { name: 'log_edit', category: 'binding_send', description: 'Never adds to, edits or corrects a controlled drug log.' }, { name: 'order_place', category: 'binding_send', description: 'Never orders controlled drugs.' }],
  prompt: {
    title: 'Reconcile the controlled drug log', description: 'Walks the host model through the controlled drug reconciliation.',
    text: 'You are helping the person responsible for a veterinary clinic\'s controlled drugs with fairclinic-controlled-drugs. Rules: it reports what the log and the count show; never say the clinic is or is not compliant, never suggest editing the log, and never file or draft a DEA form. 1. Call drugs_check. Lead with counts that differ from the log and arithmetic errors that hide a difference, then waste without a witness and use without a patient. 2. Call drugs_write_report for the registrant.',
  },
});
