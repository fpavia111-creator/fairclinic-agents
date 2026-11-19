import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, REFUSE, sectionTitle } from 'fairclinic-core';
import { LAB_FIELDS, CHARGE_FIELDS, SETTINGS_SCHEMA, STATUSES, checkSendouts } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  lab: fileArg('Reference lab invoice or statement detail under --root: accession, date, pet, test, lab cost'),
  charges: fileArg('Client invoice lines under --root (AVImark, Cornerstone, ezyVet, Covetrus Pulse or Shepherd export): pet, date, item, amount, client'),
  settings: fileArg('Optional settings JSON: test_map (lab test name -> your item name), min_markup, match_days'),
};
const run = (a, ctx) => checkSendouts(ctx.records(a.lab, 'lab'), ctx.records(a.charges, 'charges'), { settings: a.settings ? ctx.readJson(a.settings, 'sendout_settings') : {} });
const summary = (o) => `${o.tests} send-out test(s), lab cost ${o.lab_cost}. ${o.to_review} to review: ${o.by_status.not_charged || 0} not charged to the client (lab cost ${o.cost_not_charged}), ${o.by_status.charged_below_cost || 0} charged below cost, ${o.by_status.low_markup || 0} under your markup rule, ${o.by_status.charged_not_sent || 0} charged with no test on the lab invoice.`;

export const manifest = clinicAgent({
  pkg, prefix: 'sendouts', title: 'Fairclinic Reference Labs',
  description: pkg.description,
  args, required: ['lab', 'charges'], statuses: STATUSES,
  configSchemas: { sendout_settings: SETTINGS_SCHEMA },
  sources: { lab: { label: 'Reference lab invoice detail', args: ['lab'], fields: LAB_FIELDS }, charges: { label: 'Client invoice lines', args: ['charges'], fields: CHARGE_FIELDS } },
  run, summary,
  check: { title: 'Match send-out tests to client charges', description: 'Every test on the lab invoice matched to a client charge for the same pet within a few days, with a status: not_charged, charged_below_cost, low_markup, charged_not_sent or ok.' },
  report: {
    title: T9('Reference lab send-outs', 'Fremdlaboruntersuchungen', 'Analyses envoyées au laboratoire', 'Pruebas enviadas a laboratorio externo', 'Exames enviados ao laboratório', 'Esami inviati al laboratorio esterno', '外部検査の請求照合', '外送检验核对', '외부 검사 대조'),
    base: 'sendouts-match',
    rows: (o) => o.items.filter((i) => i.status !== 'ok').map((i) => ({ status: i.status, accession: i.accession, date: i.date, patient_name: i.patient_name, client_name: i.client_name, test: i.test, lab_cost: i.lab_cost, charged: i.charged, reason: i.detail })),
    htmlColumns: ['status', 'accession', 'date', 'test', 'lab_cost', 'charged', 'reason'],
    sections: (o) => [{ title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] }],
    limits: [CLINIC_LIMITS.files, 'Tests and charges are matched by pet name, date and item name; name lab tests that your invoice words differently in test_map. The markup rule is your own.', CLINIC_LIMITS.phi, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.pms_write('invoices'), { name: 'client_charge', category: 'move_money', description: 'Never charges a client.' }, REFUSE.pay()],
  prompt: {
    title: 'Match send-out tests', description: 'Walks the host model through reference lab send-outs.',
    text: 'You are helping a veterinary practice manager with fairclinic-reference-labs. Rules: it never changes an invoice, never charges a client and never pays the lab; pet and client names are pseudonyms. 1. Call sendouts_check. Lead with tests not charged, then charges below cost and under the markup rule, then charges with no test on the lab invoice. 2. Call sendouts_write_report.',
  },
});
