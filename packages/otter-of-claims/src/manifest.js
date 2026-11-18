import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, AS_OF_ARG, REFUSE, exportProfile, sectionTitle, findItem } from 'fairclinic-core';
import { CLAIM_FIELDS, SETTINGS_SCHEMA, ageClaims, inquiryText } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  claims: fileArg('Outstanding dental insurance claims under --root (Dentrix, Eaglesoft, Open Dental, Curve or Denticon export as CSV or Excel): claim, patient, carrier, service date, date sent, amount, status'),
  settings: fileArg('Optional settings JSON: follow_up_days, recontact_days, unsent_days, filing_days by carrier, default_filing_days, warn_before_days'),
  as_of: AS_OF_ARG,
};
const run = (a, ctx) => ageClaims(ctx.records(a.claims, 'claims'), { settings: a.settings ? ctx.readJson(a.settings, 'claims_settings') : {}, asOf: a.as_of });
const summary = (o) => `${o.open} open claim(s), ${o.outstanding} outstanding (${o.over_60} over 60 days): ${o.to_follow_up} to follow up, ${o.denied} denied, ${o.filing_risk} near or past the filing limit, ${o.unsent} not sent, ${o.duplicates} possible duplicate(s), ${o.secondary_not_sent} secondary claim(s) not sent.`;
const STATUSES = ['denied', 'filing_risk', 'unsent', 'duplicate', 'follow_up', 'waiting', 'secondary_not_sent', 'closed'];

export const manifest = clinicAgent({
  pkg, prefix: 'otter', title: 'Otter of Claims',
  description: pkg.description,
  args, required: ['claims'], statuses: STATUSES,
  configSchemas: { claims_settings: SETTINGS_SCHEMA },
  sources: { claims: { label: 'Outstanding dental claims', args: ['claims'], fields: CLAIM_FIELDS, profiles: [
    exportProfile('dentrix_outstanding_claims', { claim_id: 'Claim #', patient_name: 'Patient Name', payer: 'Carrier Name', date_of_service: 'Service Date', date_sent: 'Date Sent', billed: 'Claim Amount', expected: 'Est. Insurance', status: 'Status' }),
    exportProfile('open_dental_claims', { claim_id: 'ClaimNum', patient_name: 'PatName', payer: 'CarrierName', date_of_service: 'DateService', date_sent: 'DateSent', billed: 'ClaimFee', expected: 'InsPayEst', paid: 'InsPayAmt', status: 'ClaimStatus', claim_type: 'ClaimType' }, { note: 'Open Dental claim status letters: U unsent, H hold, W waiting to send, S sent, R received. Otter reads R as closed and U, H and W as not sent.' }),
  ] } },
  run, summary,
  check: { title: 'Age open dental claims', description: 'Every open dental insurance claim with its age from the date sent, aging bucket, outstanding amount, filing-limit date, next follow-up date and status: denied, filing_risk, unsent, duplicate, follow_up, waiting, secondary_not_sent or closed. Totals by bucket and carrier.' },
  reads: [{
    name: 'otter_explain', title: 'Explain one claim', description: 'One claim with its dates, amounts, filing-limit date and every finding in plain words.',
    properties: { ...args, claim: { type: 'string', description: 'Claim id from otter_check' } }, required: ['claims', 'claim'],
    run: (a, ctx) => { const o = run(a, ctx); const i = findItem(o.items, 'claim_id', a.claim, ctx, { label: 'claim' }); return { summary: `${i.claim_id} (${i.payer}, sent ${i.date_sent || 'not yet'}): ${i.status}, ${i.outstanding} outstanding. ${i.findings.map((f) => f.detail).join(' ') || 'Nothing to do yet.'}`, claim: i }; },
  }],
  report: {
    title: T9('Open dental claims', 'Offene zahnärztliche Versicherungsfälle', 'Demandes dentaires en attente', 'Reclamaciones dentales pendientes', 'Guias odontológicas em aberto', 'Pratiche odontoiatriche aperte', '未決の歯科保険請求', '未结牙科保险理赔', '미결 치과 보험 청구'),
    base: 'otter-open-claims',
    rows: (o) => o.items.filter((i) => i.status !== 'closed').map((i) => ({ status: i.status, claim_id: i.claim_id, patient_name: i.patient_name, payer: i.payer, claim_type: i.claim_type, provider: i.provider, date_of_service: i.date_of_service, date_sent: i.date_sent, age_days: i.age_days, bucket: i.bucket, outstanding: i.outstanding, file_by: i.file_by, next_follow_up: i.next_follow_up, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'claim_id', 'payer', 'date_sent', 'age_days', 'outstanding', 'file_by', 'reasons'],
    sections: (o) => [
      { title: sectionTitle('by_bucket'), rows: Object.entries(o.by_bucket).map(([bucket, v]) => ({ bucket, ...v })), columns: ['bucket', 'count', 'amount'] },
      { title: sectionTitle('by_payer'), rows: o.by_payer, columns: ['payer', 'count', 'amount'] },
    ],
    limits: [CLINIC_LIMITS.files, 'Filing limits are the days you set per carrier (365 by default); check each carrier\'s contract.', 'Outstanding is the insurance estimate (or the fee when there is none) less what was paid.', CLINIC_LIMITS.phi, CLINIC_LIMITS.baa, CLINIC_LIMITS.advice],
  },
  drafts: {
    noun: 'status_inquiry', verb: 'send', category: 'binding_send',
    title: 'Draft a claim status inquiry for one carrier',
    description: 'Write drafts/status_inquiry-<hash>.md: one carrier\'s open claims older than the follow-up age, as a status inquiry. Marked DRAFT. Sending (fax, portal message or letter) is done by one named person after otter_request_send.',
    required: ['claims', 'payer'],
    args: { ...args, payer: { type: 'string', description: 'Carrier name as it appears in the claims file' }, from: { type: 'string', description: 'Your name' }, practice: { type: 'string', description: 'Practice name and billing NPI' } },
    build: (a, ctx) => {
      const o = run(a, ctx);
      const d = inquiryText(o.items, { payer: a.payer, from: a.from, practice: a.practice });
      if (!d.rows.length) throw new Error(`no open claims for carrier "${a.payer}" older than the follow-up age`);
      return { id: d.rows[0].payer, text: d.text, amount: d.total, extra: { claims: d.rows.length } };
    },
  },
  refused: [REFUSE.insurer_submit('a dental carrier'), REFUSE.pms_write('claim status in the practice-management system'), REFUSE.message()],
  prompt: {
    title: 'Work the open dental claims', description: 'Walks the host model through the open-claims list with Otter.',
    text: 'You are helping a dental billing coordinator with otter-of-claims. Rules: Otter never sends claims, never changes the practice system and never contacts a carrier; patient names are pseudonyms. 1. Call otter_check. Lead with denied claims and anything near the filing limit, then unsent claims, then follow-ups by carrier. 2. Use otter_explain for any claim asked about. 3. Call otter_write_report for the team\'s list. 4. Offer otter_draft_status_inquiry per carrier; otter_request_send waits for one named person.',
  },
});
