import { readFileSync } from 'node:fs';
import { clinicAgent, CLINIC_LIMITS, T9, fileArg, REFUSE, readRemits, REMIT_FIELDS, sectionTitle, findItem, exportProfile } from 'fairclinic-core';
import { POSTING_FIELDS, SETTINGS_SCHEMA, STATUSES, matchRemits } from './logic.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const args = {
  era: fileArg('ERA under --root: an 835 file from the carrier or clearinghouse, or a remittance export (CSV or Excel) with claim, check or EFT number, paid amount and adjustment codes'),
  posted: fileArg('Insurance payments posted in the practice system under --root (Dentrix, Eaglesoft, Open Dental, Curve or Denticon export): claim, check number, payment posted, write-off posted'),
  settings: fileArg('Optional settings JSON: tolerance, contractual_reasons (CO reason codes that are contractual write-offs)'),
};
const run = (a, ctx) => {
  const era = readRemits(ctx, a.era, 'era');
  return matchRemits(era.claims, ctx.records(a.posted, 'posted'), { settings: a.settings ? ctx.readJson(a.settings, 'remit_settings') : {} });
};
const summary = (o) => `${o.era_claims} ERA claim(s), ${o.era_paid} paid; ${o.posted_paid} posted against those checks. ${o.not_posted} not posted (${o.unposted_amount}), ${o.mismatches} posted differently, ${o.denials_written_off} denial(s) written off, ${o.denied} denial(s) to work, ${o.reversals} reversal(s), ${o.not_on_era} posting(s) not on the ERA, ${o.checks_not_tying} check(s) that do not tie.`;

export const manifest = clinicAgent({
  pkg, prefix: 'era', title: 'Fairclinic ERA Posting',
  description: pkg.description,
  args, required: ['era', 'posted'], statuses: STATUSES,
  configSchemas: { remit_settings: SETTINGS_SCHEMA },
  sources: { era: { label: 'ERA or remittance export (835 files are read directly)', args: ['era'], fields: REMIT_FIELDS }, posted: { label: 'Insurance payments posted', args: ['posted'], fields: POSTING_FIELDS, profiles: [exportProfile('open_dental_claims', { claim_id: 'ClaimNum', patient_name: 'PatName', payer: 'CarrierName', paid: 'InsPayAmt', writeoff: 'WriteOff', check_number: 'CheckNum' }, { label: 'Open Dental claim payment query (CSV; database column names)', signature: ['ClaimNum', 'InsPayAmt', 'WriteOff', 'CheckNum'] })] } },
  run, summary,
  check: { title: 'Compare ERAs with postings', description: 'Every ERA claim with what the ERA paid, the contractual write-off and patient portion it shows, and what was posted, with a status: reversal, denial_written_off, denied, not_posted, payment_mismatch, writeoff_mismatch, not_on_era or ok. Check totals: ERA amount against amount posted per check or EFT.' },
  reads: [{
    name: 'era_explain', title: 'Explain one claim', description: 'One claim\'s ERA lines, adjustments and posting, with each finding in plain words.',
    properties: { ...args, claim: { type: 'string', description: 'Claim id from era_check' } }, required: ['era', 'posted', 'claim'],
    run: (a, ctx) => { const o = run(a, ctx); const i = findItem(o.items, 'claim_id', a.claim, ctx, { label: 'claim' }); return { summary: `${i.claim_id} on ${i.check_number}: ${i.status}. ERA paid ${i.era_paid ?? '-'}, posted ${i.posted_paid ?? 'nothing'}. ${i.findings.map((f) => f.detail).join(' ') || 'Posted as the ERA shows.'}`, claim: i }; },
  }],
  report: {
    title: T9('ERA posting check', 'Abgleich der Zahlungsavis mit den Buchungen', 'Contrôle des avis de paiement et des écritures', 'Revisión de avisos de pago frente a lo registrado', 'Conferência dos avisos de pagamento com os lançamentos', 'Verifica degli avvisi di pagamento rispetto alle registrazioni', '支払明細（ERA）と入金記帳の照合', '电子汇款通知与入账核对', 'ERA와 입금 기장 대사'),
    base: 'era-posting',
    rows: (o) => o.items.filter((i) => i.status !== 'ok').map((i) => ({ status: i.status, claim_id: i.claim_id, patient_name: i.patient_name, payer: i.payer, check_number: i.check_number, era_paid: i.era_paid, posted_paid: i.posted_paid, writeoff_expected: i.writeoff_expected, posted_writeoff: i.posted_writeoff, patient_portion: i.patient_portion, posted_by: i.posted_by, reasons: i.findings.map((f) => f.detail).join(' ') })),
    htmlColumns: ['status', 'claim_id', 'check_number', 'era_paid', 'posted_paid', 'writeoff_expected', 'posted_writeoff', 'reasons'],
    sections: (o) => [
      { title: T9('Check totals', 'Summen je Zahlung', 'Totaux par paiement', 'Totales por pago', 'Totais por pagamento', 'Totali per pagamento', '支払ごとの合計', '按付款合计', '지급별 합계'), rows: o.checks, columns: ['check_number', 'payer', 'claims', 'era_amount', 'posted_amount', 'difference', 'status'] },
      { title: sectionTitle('by_status'), rows: Object.entries(o.by_status).map(([status, count]) => ({ status, count })), columns: ['status', 'count'] },
    ],
    limits: [CLINIC_LIMITS.files, 'Contractual write-offs are the CO adjustments with the reason codes in your settings (45, 253 and 131 by default); other CO codes are read as denials or limits.', 'A posting is matched to the ERA by claim id; postings on other checks are left out of the check totals.', CLINIC_LIMITS.phi, CLINIC_LIMITS.baa, CLINIC_LIMITS.advice],
  },
  refused: [REFUSE.pms_write('payments or write-offs in the practice-management system'), REFUSE.insurer_submit('a dental carrier'), REFUSE.refund()],
  prompt: {
    title: 'Check ERA posting', description: 'Walks the host model through an ERA posting check with Fairclinic ERA Posting.',
    text: 'You are helping a dental billing coordinator with fairclinic-era-posting. Rules: Fairclinic ERA Posting never changes postings, never contacts carriers and never refunds; patient names are pseudonyms. 1. Call era_check. Lead with denials written off as contractual and payments not posted, then mismatches, then checks that do not tie. 2. Use era_explain for a claim asked about. 3. Call era_write_report for the posting corrections list; a person makes each correction in the practice system.',
  },
});
