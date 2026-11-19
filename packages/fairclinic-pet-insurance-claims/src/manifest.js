import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, REFUSE, sectionTitle } from 'fairclinic-core';
import { CLAIM_FIELDS, SETTINGS_SCHEMA, STATUSES, checkPetClaims } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  claims: fileArg('Pet insurance claims under --root (insurer portal export, claims platform export or the practice system\'s claim list): claim, client, pet, insurer, invoice, claimed, created, submitted, status, paid, paid date, direct pay'),
  settings: fileArg('Optional settings JSON: response_days, draft_days'),
  as_of: AS_OF_ARG,
};
const run = (a, ctx) => checkPetClaims(ctx.records(a.claims, 'claims'), { settings: a.settings ? ctx.readJson(a.settings, 'petclaim_settings') : {}, asOf: a.as_of });
const summary = (o) => `${o.claims} claim(s), ${o.open} open for ${o.open_claimed} (${o.direct_pay_open} owed directly to the clinic). ${o.to_review} to work: ${o.by_status.info_requested || 0} information request(s), ${o.by_status.direct_pay_balance || 0} direct payment(s) short (${o.client_balances} left on client accounts), ${o.by_status.not_submitted || 0} drafted and not submitted, ${o.by_status.no_response || 0} with no decision, ${o.by_status.denied || 0} denied.`;

export const manifest = clinicAgent({
  pkg, prefix: 'petclaims', title: 'Fairclinic Pet Insurance Claims',
  description: pkg.description,
  args, required: ['claims'], statuses: STATUSES,
  configSchemas: { petclaim_settings: SETTINGS_SCHEMA },
  sources: { claims: { label: 'Pet insurance claims', args: ['claims'], fields: CLAIM_FIELDS } },
  run, summary,
  check: { title: 'Check pet insurance claims', description: 'Every claim with what was claimed and paid and a status: info_requested, direct_pay_balance, not_submitted, no_response, denied, pending or paid. Open amounts by insurer.' },
  report: {
    title: T9('Pet insurance claims', 'Tierversicherungsfälle', 'Demandes d’assurance animale', 'Reclamaciones de seguro de mascotas', 'Sinistros de seguro pet', 'Pratiche di assicurazione animali', 'ペット保険の請求', '宠物保险理赔', '반려동물 보험 청구'),
    base: 'petclaims-status',
    rows: (o) => o.items.filter((i) => !['paid', 'pending'].includes(i.status)).map((i) => ({ status: i.status, claim_id: i.claim_id, client_name: i.client_name, patient_name: i.patient_name, insurer: i.insurer, invoice_number: i.invoice_number, claimed: i.claimed, paid: i.paid, submitted: i.submitted, reason: i.detail })),
    htmlColumns: ['status', 'claim_id', 'insurer', 'claimed', 'paid', 'submitted', 'reason'],
    sections: (o) => [{ title: sectionTitle('by_insurer'), rows: o.by_insurer, columns: ['insurer', 'count', 'amount'] }],
    limits: [CLINIC_LIMITS.files, 'Coverage is between the client and the insurer; the agent never says what a policy covers.', CLINIC_LIMITS.phi, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.insurer_submit('a pet insurer'), REFUSE.message(), { name: 'client_charge', category: 'move_money', description: 'Never charges a client for a balance left after insurance.' }],
  prompt: {
    title: 'Work pet insurance claims', description: 'Walks the host model through pet insurance claims.',
    text: 'You are helping a veterinary front desk with fairclinic-pet-insurance-claims. Rules: it never submits a claim, never contacts an insurer or a client, never charges a client and never says what a policy covers; pet and client names are pseudonyms. 1. Call petclaims_check. Lead with information requests (records to send), then direct payments that came in short, then drafts not submitted and claims with no decision. 2. Call petclaims_write_report.',
  },
});
