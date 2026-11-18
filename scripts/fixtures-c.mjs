// Fixtures for agents 21-30 (see make-fixtures.mjs).
export default function (section, { W, buildX12, writer, readme }) {
  const P = (id) => W.patient(id);
  const us = (d) => (d ? `${d.slice(5, 7)}/${d.slice(8, 10)}/${d.slice(0, 4)}` : '');

  section('lavender-of-credentialing', () => {
    const w = writer('lavender-of-credentialing');
    const pr = (id) => W.PROVIDERS.find((p) => p.id === id);
    const row = (id, o) => ({ Provider: pr(id).name, NPI: o.npi ?? pr(id).npi, Taxonomy: pr(id).taxonomy, 'License State': 'AK', 'License Expiration': us(o.lic), 'DEA Expiration': us(o.dea), 'Board Certification Expiration': us(o.board), 'Malpractice Expiration': us(o.mal), 'CAQH Attestation Date': us(o.caqh) });
    w('provider-roster.csv', W.csv([
      row('reyes', { lic: '2027-12-31', dea: '2026-04-30', board: '2030-12-31', mal: '2027-01-01', caqh: '2026-01-15' }),
      row('brandt', { lic: '2026-02-28', dea: '2027-06-30', board: '2028-12-31', mal: '2027-01-01', caqh: '2025-09-01' }),
      row('moreau', { lic: '2027-08-31', dea: '', board: '', mal: '', caqh: '2025-12-20' }),
      row('vance', { npi: '1990000056', lic: '2028-03-31', dea: '2028-03-31', board: '2031-12-31', mal: '2026-12-31', caqh: '2026-02-01' }),
    ]));
    const en = (id, payer, status, sub, eff, reval) => ({ Provider: pr(id).name, NPI: pr(id).npi, Payer: payer, Status: status, 'Date Submitted': us(sub), 'Effective Date': us(eff), 'Revalidation Due': us(reval) });
    w('payer-enrollments.csv', W.csv([
      en('reyes', 'Test Medicare Contractor', 'Enrolled', '2021-03-01', '2021-04-01', '2026-04-30'),
      en('reyes', 'Example Health Plan', 'Enrolled', '2023-01-10', '2023-03-01', '2027-03-01'),
      en('brandt', 'Sample Mutual Insurance', 'Pending', '2025-12-15', '', ''),
      en('brandt', 'Demo Medicaid Plan', 'Denied', '2025-11-01', '', ''),
      en('moreau', 'Example Health Plan', 'Approved', '2026-01-05', '2026-03-01', ''),
      en('moreau', 'Test Medicare Contractor', 'Not started', '', '', ''),
      en('vance', 'Demo Medicaid Plan', 'Enrolled', '2022-01-01', '2022-02-01', '2026-07-01'),
    ]));
    w('credentialing-config.json', { warn_days: 90, caqh_days: 120, pending_followup_days: 30, required_docs: ['license_expires', 'malpractice_expires'] });
    w('credentialing-config-typo.json', { required_docs: ['license'] });
    w('payer-enrollments-statuses.csv', "Provider,NPI,Payer,Status,Date Submitted,Effective Date,Revalidation Due\nAlma Reyes MD (fictional),1990000014,Example Health Plan,Not submitted,,,\nAlma Reyes MD (fictional),1990000014,Sample Mutual Insurance,Terminated,01/10/2023,03/01/2023,\nFelix Brandt DO (fictional),1990000022,Demo Medicaid Plan,Not enrolled,,,\nFelix Brandt DO (fictional),1990000022,Test Medicare Contractor,In process,01/20/2026,,\n");
    readme('lavender-of-credentialing', 'Lavender of Credentialing', [
      '`provider-roster.csv`: four fictional providers. Planted, as of 2026-02-15: a DEA registration 74 days from expiry (Reyes); a license expiring in 13 days and a CAQH attestation overdue (Brandt); no malpractice date (Moreau); an NPI with a wrong check digit (Vance).',
      '`payer-enrollments.csv`: seven enrollments: a Medicare revalidation in 74 days, one pending 62 days, one denied, one approved but not effective until 2026-03-01, one not started, and a Medicaid revalidation in 136 days that only a learned 150-day lead time flags.',
      '`credentialing-config.json`: warning and follow-up days. `credentialing-config-typo.json` names an unknown document.',
      '`payer-enrollments-statuses.csv`: four enrollments with everyday status words (Not submitted, Terminated, Not enrolled, In process), as staff type them.',
      'Provider names are not patient data. No patient data is used; `phi-canaries.json` lists fictional patients anyway so the shared leak test runs.',
    ], ['P1', 'P2', 'P3']);
  });

  section('nettle-of-audits', () => {
    const w = writer('nettle-of-audits');
    const pr = (id) => W.PROVIDERS.find((p) => p.id === id).name;
    const name = (pid) => `${P(pid).last}, ${P(pid).first}`;
    const ins = (pid) => W.payer(P(pid).payer).name;
    const FEE = { 99212: 75, 99213: 110, 99214: 165, 99215: 230, 99203: 140, 99204: 210, 36415: 12, 81002: 9, 93000: 45, 20610: 120, 69210: 65, 11102: 130, J1100: 18 };
    const pats = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    const plan = {
      reyes: ['99213', '99214', '99213', '99215', '99214', '99212', '99213', '99214', '99204', '99213', '99214', '93000', '99215', '36415'],
      brandt: ['99214', '99215', '99214', '99214', '99213', '99215', '20610', '99214', '99203', '99214', '99215', '99213'],
      moreau: ['99213', '99212', '99213', '81002', '99214', '99213'],
    };
    const rows = []; let n = 0;
    for (const [prov, codes] of Object.entries(plan)) codes.forEach((code, i) => {
      const pid = pats[n % 8]; const day = String(5 + ((i * 3) % 23)).padStart(2, '0'); const month = i % 2 ? '02' : '01';
      rows.push({ 'Claim ID': `N${2001 + n}`, Patient: name(pid), 'Rendering Provider': pr(prov), 'Primary Insurance': ins(pid), 'Date of Service': `${month}/${day}/2026`, CPT: code, Modifiers: code === '99214' && i === 3 ? '25' : '', 'Dx 1': ['I10', 'E11.9', 'J06.9', 'M54.50', 'Z00.00'][i % 5], Charge: FEE[code].toFixed(2) });
      n++;
    });
    w('charges-2026-q1.csv', W.csv(rows));
    const A = (claim, pid, prov, dos, billed, audited, o = {}) => ({ 'Claim ID': claim, Patient: name(pid), Provider: pr(prov), 'Date of Service': dos, 'Billed CPT': billed, 'Billed Modifiers': o.bm || '', 'Billed Dx': o.bd || rows.find((r) => r['Claim ID'] === claim)['Dx 1'], 'Billed Amount': FEE[billed].toFixed(2), 'Auditor CPT': audited, 'Audited Modifiers': o.am || '', 'Audited Dx': o.ad || '', 'Supported Amount': o.amt ?? (FEE[audited] ? FEE[audited].toFixed(2) : '0.00'), Paid: o.paid ?? 'Y', Comments: o.note || '' });
    w('audit-results-2026-q1.csv', W.csv([
      A('N2001', 'P1', 'reyes', '01/05/2026', '99213', '99213'),
      A('N2002', 'P2', 'reyes', '02/08/2026', '99214', '99214'),
      A('N2003', 'P3', 'reyes', '01/11/2026', '99213', '99213'),
      A('N2004', 'P4', 'reyes', '02/14/2026', '99215', '99214', { note: 'MDM moderate, not high (fictional)' }),
      A('N2005', 'P5', 'reyes', '01/17/2026', '99214', '99214'),
      A('N2006', 'P6', 'reyes', '02/20/2026', '99212', '99212'),
      A('N2007', 'P7', 'reyes', '01/23/2026', '99213', '99213'),
      A('N2008', 'P8', 'reyes', '02/26/2026', '99214', '99214'),
      A('N2009', 'P1', 'reyes', '01/06/2026', '99204', '99204'),
      A('N2010', 'P2', 'reyes', '02/09/2026', '99213', '99213'),
      A('N2011', 'P3', 'reyes', '01/12/2026', '99214', '99214', { ad: 'I10 E11.65', note: 'Hyperglycemia documented (fictional)' }),
      A('N2015', 'P7', 'brandt', '01/05/2026', '99214', '99213', { note: 'Two stable chronic illnesses would be moderate; one documented (fictional)' }),
      A('N2016', 'P8', 'brandt', '02/08/2026', '99215', '99214'),
      A('N2017', 'P1', 'brandt', '01/11/2026', '99214', '99214'),
      A('N2018', 'P2', 'brandt', '02/14/2026', '99214', '99214', { bm: '25', am: 'none', note: 'No separate procedure that day (fictional)' }),
      A('N2019', 'P3', 'brandt', '01/17/2026', '99213', '99213'),
      A('N2020', 'P4', 'brandt', '02/20/2026', '99215', '99213', { paid: 'N' }),
      A('N2021', 'P5', 'brandt', '01/23/2026', '20610', 'none', { note: 'No procedure note in the record (fictional)' }),
      A('N2022', 'P6', 'brandt', '02/26/2026', '99214', '99214'),
      A('N2023', 'P7', 'brandt', '01/06/2026', '99203', '99213', { note: 'Established patient: seen 2025 (fictional)' }),
      A('N2024', 'P8', 'brandt', '02/09/2026', '99214', '99214'),
      A('N2027', 'P3', 'moreau', '01/05/2026', '99213', '99214', { note: 'Documentation supports moderate MDM (fictional)' }),
      A('N2028', 'P4', 'moreau', '02/08/2026', '99212', '99212'),
      A('N2029', 'P5', 'moreau', '01/11/2026', '99213', '99213'),
      A('N2031', 'P7', 'moreau', '01/17/2026', '99214', '99214'),
    ]));
    w('audit-config.json', { accuracy_target: 90, min_lines: 10, probe_size: 10, per_provider: 5, focus_codes: ['99215'] });
    w('audit-config-typo.json', { accuracy_target: 190 });
    readme('nettle-of-audits', 'Nettle of Audits', [
      '`charges-2026-q1.csv`: 32 fictional charge lines in January and February 2026 for three providers (14, 12 and 6 lines), in a charge export layout.',
      '`audit-results-2026-q1.csv`: a filled-in worksheet of 25 audited lines. Planted: Reyes 10 of 11 agree, one level 5 supported at level 4, one diagnosis added (accuracy 81.82%); Brandt 4 of 10 agree (40%), three E/M levels higher than supported (one unpaid), modifier 25 removed, a joint injection with no procedure note, a new-patient code for an established patient; Moreau 4 lines (too few to judge), one level lower than supported.',
      '`audit-config.json`: 90% target, 5 random lines per provider plus every 99215. `audit-config-typo.json` has a target over 100.',
      'Every patient, claim and amount is invented.',
    ], ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
  });

  section('angelica-of-prices', () => {
    const w = writer('angelica-of-prices');
    const ATTEST3 = 'To the best of its knowledge and belief, this hospital has included all applicable standard charge information in accordance with the requirements of 45 CFR 180.50, and the information encoded is true, accurate, and complete as of the date in the file. This hospital has included all payer-specific negotiated charges in dollars that can be expressed as a dollar amount. For payer-specific negotiated charges that cannot be expressed as a dollar amount in the machine-readable file or not knowable in advance, the hospital attests that the payer-specific negotiated charge is based on a contractual algorithm, percentage or formula that precludes the provision of a dollar amount and has provided all necessary information available to the hospital for the public to be able to derive the dollar amount, including, but not limited to, the specific fee schedule or components referenced in such percentage, algorithm or formula.';
    const ATTEST2 = 'To the best of its knowledge and belief, the hospital has included all applicable standard charge information in accordance with the requirements of 45 CFR 180.50, and the information encoded is true, accurate, and complete as of the date indicated.';
    const q = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const line = (cells) => cells.map(q).join(',');
    const COLS3 = ['description', 'code|1', 'code|1|type', 'code|2', 'code|2|type', 'modifiers', 'setting', 'drug_unit_of_measurement', 'drug_type_of_measurement', 'standard_charge|gross', 'standard_charge|discounted_cash', 'payer_name', 'plan_name', 'standard_charge|negotiated_dollar', 'standard_charge|negotiated_percentage', 'standard_charge|negotiated_algorithm', 'median_amount', '10th_percentile', '90th_percentile', 'count', 'standard_charge|methodology', 'standard_charge|min', 'standard_charge|max', 'additional_generic_notes'];
    const R = (o) => COLS3.map((c) => o[c] ?? '');
    const H = 'Example Community Hospital (fictional)';
    const rows3 = [
      { description: 'Office visit, established patient, level 3', 'code|1': '99213', 'code|1|type': 'CPT', 'code|2': '0510', 'code|2|type': 'RC', setting: 'outpatient', 'standard_charge|gross': '180.00', 'standard_charge|discounted_cash': '126.00', payer_name: 'Example Health Plan', plan_name: 'PPO', 'standard_charge|negotiated_dollar': '110.00', 'standard_charge|methodology': 'fee schedule', 'standard_charge|min': '92.00', 'standard_charge|max': '140.00' },
      { description: 'Office visit, established patient, level 3', 'code|1': '99213', 'code|1|type': 'CPT', 'code|2': '0510', 'code|2|type': 'RC', setting: 'outpatient', 'standard_charge|gross': '180.00', 'standard_charge|discounted_cash': '126.00', payer_name: 'Sample Mutual Insurance', plan_name: 'HMO', 'standard_charge|negotiated_percentage': '55', median_amount: '90.00', '10th_percentile': '85.00', '90th_percentile': '93.00', count: '1 through 10', 'standard_charge|methodology': 'percent of total billed charges', 'standard_charge|min': '92.00', 'standard_charge|max': '140.00' },
      { description: 'CT head or brain without contrast', 'code|1': '70450', 'code|1|type': 'CPT', setting: 'outpatient', 'standard_charge|gross': '1450.00', 'standard_charge|discounted_cash': '1015.00', payer_name: 'Example Health Plan', plan_name: 'PPO', 'standard_charge|negotiated_dollar': '610.00', 'standard_charge|methodology': 'fee schedule', 'standard_charge|min': '455.00', 'standard_charge|max': '702.00' },
      { description: 'CT head or brain without contrast', 'code|1': '70450', 'code|1|type': 'CPT', setting: 'outpatient', 'standard_charge|gross': '1450.00', 'standard_charge|discounted_cash': '1015.00', payer_name: 'Demo Medicaid Plan', plan_name: 'Medicaid Managed Care', 'standard_charge|negotiated_dollar': '$455.00', 'standard_charge|methodology': 'fee schedule', 'standard_charge|min': '455.00', 'standard_charge|max': '702.00' },
      { description: 'Complete blood count (CBC) with differential', 'code|1': '85025', 'code|1|type': 'CPT', setting: 'outpatient', 'standard_charge|gross': '42.00', 'standard_charge|discounted_cash': '29.40', payer_name: 'Sample Mutual Insurance', plan_name: 'HMO', 'standard_charge|negotiated_algorithm': 'Lesser of 120% of the Medicare fee schedule or billed charges', 'standard_charge|methodology': 'other' },
      { description: 'Ondansetron injection, 1 mg', 'code|1': 'J2405', 'code|1|type': 'HCPCS', 'code|2': '0409-4755-03', 'code|2|type': 'NDC', setting: 'both', 'standard_charge|gross': '35.00', 'standard_charge|discounted_cash': '24.50' },
      { description: 'Knee arthroscopy with meniscectomy', 'code|1': '29881', 'code|1|type': 'CPT', setting: 'Outpatient surgery', 'standard_charge|gross': '9800.00', 'standard_charge|discounted_cash': '6860.00', payer_name: 'Example Health Plan', plan_name: 'PPO', 'standard_charge|negotiated_dollar': '4200.00', 'standard_charge|methodology': 'Fee Schedule' },
      { description: 'Vaginal delivery without complicating diagnoses', 'code|1': '807', 'code|1|type': 'MS-DRG', setting: 'inpatient', 'standard_charge|gross': '14200.00', 'standard_charge|discounted_cash': '9940.00', payer_name: 'Sample Mutual Insurance', plan_name: 'HMO', 'standard_charge|negotiated_dollar': '8100.00', 'standard_charge|methodology': 'case rate', 'standard_charge|min': '7600.00', 'standard_charge|max': '8800.00' },
      { description: 'Office visit, established patient, level 3', 'code|1': '99213', 'code|1|type': 'CPT', 'code|2': '0510', 'code|2|type': 'RC', setting: 'outpatient', 'standard_charge|gross': '180.00', 'standard_charge|discounted_cash': '126.00', payer_name: 'Example Health Plan', plan_name: 'PPO', 'standard_charge|negotiated_dollar': '110.00', 'standard_charge|methodology': 'fee schedule', 'standard_charge|min': '92.00', 'standard_charge|max': '140.00' },
      { description: 'Electrocardiogram, 12-lead, with interpretation', 'code|1': '93000', 'code|1|type': 'CPT', setting: 'outpatient', 'standard_charge|gross': '95.00', 'standard_charge|discounted_cash': '66.50', payer_name: 'Example Health Plan', plan_name: 'PPO' },
      { description: 'Comprehensive metabolic panel', 'code|1': '80053', 'code|1|type': 'CPT', setting: 'outpatient', 'standard_charge|gross': '55.00', 'standard_charge|discounted_cash': '38.50', payer_name: 'Sample Mutual Insurance', plan_name: 'HMO', 'standard_charge|negotiated_percentage': '70', median_amount: '38.00', '10th_percentile': '30.00', '90th_percentile': '52.00', count: '1,204', 'standard_charge|methodology': 'percent of total billed charges' },
      { description: 'Venipuncture', 'code|1': '36415', 'code|1|type': 'CPT4', setting: 'outpatient', 'standard_charge|gross': '18.00', 'standard_charge|discounted_cash': '12.60' },
      { description: 'Urinalysis, non-automated, without microscopy', 'code|1': '81002', 'code|1|type': 'CPT', setting: 'outpatient', 'standard_charge|gross': '10.00', 'standard_charge|discounted_cash': '12.00' },
    ];
    w('standard-charges-v3.csv', [
      line(['hospital_name', 'last_updated_on', 'version', 'location_name', 'hospital_address', 'license_number|AK', 'type_2_npi', ATTEST3, 'attester_name']),
      line([H, '2026-01-02', '3.0.0', 'Example Community Hospital Main Campus', '1 Example Plaza, Exampleton, AK 99501', 'AK-H-0001', '2990000012|2990000013', 'true', 'Dana Example (fictional)']),
      line(COLS3), ...rows3.map((r) => line(R(r))),
    ].join('\n') + '\n');
    const COLS2 = ['description', 'code|1', 'code|1|type', 'modifiers', 'setting', 'drug_unit_of_measurement', 'drug_type_of_measurement', 'standard_charge|gross', 'standard_charge|discounted_cash', 'payer_name', 'plan_name', 'standard_charge|negotiated_dollar', 'standard_charge|negotiated_percentage', 'standard_charge|negotiated_algorithm', 'estimated_amount', 'standard_charge|methodology', 'standard_charge|min', 'standard_charge|max', 'additional_generic_notes'];
    w('standard-charges-v2.csv', [
      line(['hospital_name', 'last_updated_on', 'version', 'hospital_location', 'hospital_address', 'license_number|[state]', ATTEST2]),
      line([H, '2025-06-30', '2.2.0', 'Example Community Hospital Main Campus', '1 Example Plaza, Exampleton, AK 99501', 'AK-H-0001', 'true']),
      line(COLS2),
      line(COLS2.map((c) => ({ description: 'Office visit, established patient, level 3', 'code|1': '99213', 'code|1|type': 'CPT', setting: 'outpatient', 'standard_charge|gross': '175.00', 'standard_charge|discounted_cash': '122.50', payer_name: 'Example Health Plan', plan_name: 'PPO', 'standard_charge|negotiated_dollar': '108.00', 'standard_charge|methodology': 'fee schedule', 'standard_charge|min': '90.00', 'standard_charge|max': '138.00' })[c] ?? '')),
    ].join('\n') + '\n');
    w('chargemaster.csv', W.csv([
      ['99213', 'Office visit est level 3', '180.00', '0510'], ['70450', 'CT head w/o contrast', '1450.00', '0350'], ['85025', 'CBC w/ diff', '42.00', '0300'], ['J2405', 'Ondansetron inj 1 mg', '35.00', '0636'], ['29881', 'Knee scope meniscectomy', '9800.00', '0360'],
      ['93000', 'ECG 12-lead', '95.00', '0730'], ['80053', 'Comprehensive metabolic panel', '60.00', '0301'], ['36415', 'Venipuncture', '18.00', '0300'], ['81002', 'Urinalysis non-auto', '10.00', '0300'], ['71046', 'Chest x-ray 2 views', '310.00', '0320'],
    ].map(([code, d, price, rc]) => ({ 'CDM Code': code, 'Charge Description': d, 'Standard Charge': price, 'Rev Code': rc }))));
    const ehp = [88, 92, 92, 95, 96, 98, 100, 100, 101, 104, 104, 106, 110, 115];
    const pts = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    const month = (i) => `2025-${String(4 + (i % 9)).padStart(2, '0')}-${String(10 + (i % 15)).padStart(2, '0')}`;
    const C = (id, i, code, charge, allowed, { explicit = i % 2 === 0, status = '1', paid } = {}) => {
      const pr = Math.min(20, allowed); const pd = paid ?? allowed - pr;
      return { id, patient: pts[i % 8], status, charge, paid: pd, pr, lines: [{ code, charge, paid: pd, date: month(i), ...(explicit ? { allowed } : {}), cas: [['CO', '45', charge - allowed], ...(pr ? [['PR', '2', pr]] : [])] }] };
    };
    const eraEhp = W.body835({ trace: 'EFT20260215H', payer: 'EHP', date: '2026-02-15', claims: [
      ...ehp.map((a, i) => C(`H${3001 + i}`, i, '99213', 180, a)),
      { id: 'H3015', patient: 'P3', charge: 180, paid: 0, pr: 0, lines: [{ code: '99213', charge: 180, paid: 0, date: '2025-09-12', cas: [['CO', '197', 180]] }] },
      { id: 'H3001', patient: 'P1', status: '22', charge: -180, paid: -68, pr: -20, lines: [{ code: '99213', charge: -180, paid: -68, date: '2025-04-10', cas: [['CO', '45', -92], ['PR', '2', -20]] }] },
      ...[600, 615, 640].map((a, i) => C(`H${3020 + i}`, i + 3, '70450', 1450, a)),
    ] });
    const eraSmi = W.body835({ trace: 'EFT20260220S', payer: 'SMI', date: '2026-02-20', claims: [
      ...[80, 85, 90, 93].map((a, i) => C(`H${3040 + i}`, i + 1, '99213', 180, a)),
      { id: 'H3050', patient: 'P6', charge: 180, paid: 77, pr: 20, lines: [{ code: '99213', charge: 180, paid: 77, date: '2025-03-15', allowed: 97, cas: [['CO', '45', 83], ['PR', '2', 20]] }] },
    ] });
    w('era-2025-2026.835', buildX12([eraEhp, eraSmi]));
    w('price-config.json', { max_age_days: 365, required_codes: [{ code: '70450', note: 'CMS shoppable: CT head' }, { code: '99213' }, { code: '74177', note: 'CMS shoppable: CT abdomen and pelvis with contrast' }], plans: [{ payer: 'Example Health Plan', plan_name: 'PPO' }, { payer: 'Sample Mutual Insurance', plan_name: 'HMO' }] });
    w('price-config-typo.json', { max_age_days: 900 });
    readme('angelica-of-prices', 'Angelica of Prices', [
      '`standard-charges-v3.csv`: a CMS tall CSV, template v3.0, for a fictional hospital (13 data rows). Planted: a type 2 NPI with a bad check digit; a dollar amount written "$455.00"; an algorithm with methodology "other" and no note or count; an NDC with no drug unit or type; a setting "Outpatient surgery"; a dollar amount with no min or max; a duplicate row; a payer and plan named with no negotiated charge; a count written "1,204"; a code type "CPT4"; a cash price above the gross charge. It does not list 74177 from the required list.',
      '`standard-charges-v2.csv`: the same hospital on template v2.2, dated 2025-06-30, with license_number|[state] left as a placeholder.',
      '`chargemaster.csv`: ten items; 80053 is 60.00 (the file says 55.00) and 71046 is missing from the file.',
      '`era-2025-2026.835`: two 835 payments for the allowed-amount table: 14 paid 99213 lines for one payer (count 14, median 100, 10th 92, 90th 110), 4 for another (count "1 through 10"), three CT heads, one $0 denial, one reversal and one line before the period.',
      '`price-config.json`: required codes and plan names. `price-config-typo.json` has an age limit over 400 days.',
      'The 835 patients are fictional; Angelica never needs them and they are masked anyway.',
    ], ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
  });

  section('anise-of-dental', () => {
    const w = writer('anise-of-dental');
    const d8 = (iso) => iso.replace(/-/g, '');
    const DPAY = { name: 'EXAMPLE DENTAL PLAN', id: '99911' };
    // 837D (005010X224A2) body: SV3 for the procedure and oral cavity area, TOO for tooth and surfaces.
    const body837D = (claims) => {
      const segs = [['BHT', '0019', '00', 'D0001', '20260211', '1200', 'CH'], ['NM1', '41', '2', 'EXAMPLE FAMILY DENTAL', '', '', '', '', '46', 'SUB002'], ['NM1', '40', '2', 'EXAMPLE CLEARINGHOUSE', '', '', '', '', '46', 'REC001']];
      let hl = 0; segs.push(['HL', String(++hl), '', '20', '1'], ['NM1', '85', '2', 'EXAMPLE FAMILY DENTAL', '', '', '', '', 'XX', '2990000012'], ['N3', '1 Example Plaza'], ['N4', 'Exampleton', 'AK', '99501'], ['REF', 'EI', '990000001']);
      const parent = hl;
      for (const c of claims) {
        const p = P(c.patient);
        segs.push(['HL', String(++hl), String(parent), '22', '0'], ['SBR', 'P', '18', '', '', '', '', '', '', 'CI'], ['NM1', 'IL', '1', p.last.toUpperCase(), p.first.toUpperCase(), '', '', '', 'MI', p.member], ['N3', p.address], ['N4', p.city, p.state, p.zip], ['DMG', 'D8', d8(p.dob), p.gender], ['NM1', 'PR', '2', DPAY.name, '', '', '', '', 'PI', DPAY.id]);
        segs.push(['CLM', c.id, c.lines.reduce((t, l) => t + l.charge, 0).toFixed(2), '', '', ['11', 'B', '1'], 'Y', 'A', 'Y', 'Y']);
        segs.push(['NM1', '82', '1', 'VANCE', 'RUTH', '', '', '', 'XX', '1990000055']);
        c.lines.forEach((l, i) => {
          segs.push(['LX', String(i + 1)], ['SV3', ['AD', l.code], l.charge.toFixed(2), '', l.quad ? [l.quad] : '', '', '1'], ['DTP', '472', 'D8', d8(c.date)]);
          if (l.tooth) segs.push(['TOO', 'JP', l.tooth, ...(l.surf ? [l.surf.split('')] : [])]);
        });
      }
      return { set: '837', version: '005010X224A2', segments: segs };
    };
    const L = (code, charge, o = {}) => ({ code, charge, ...o });
    w('dental-claims-2026-02.837', buildX12([body837D([
      { id: 'D5001', patient: 'P2', date: '2026-02-03', lines: [L('D0120', 60), L('D1110', 110), L('D0274', 75), L('D2392', 210, { tooth: '30', surf: 'MOD' })] },
      { id: 'D5002', patient: 'P6', date: '2026-02-04', lines: [L('D2331', 190, { tooth: '14', surf: 'MO' }), L('D2740', 1250, { tooth: '19' }), L('D3310', 900, { tooth: '19' })] },
      { id: 'D5003', patient: 'P7', date: '2026-02-05', lines: [L('D4341', 260, { quad: '10' }), L('D4342', 190), L('D1110', 110)] },
      { id: 'D5004', patient: 'P5', date: '2026-02-06', lines: [L('D1351', 55, { tooth: '3' }), L('D1351', 55, { tooth: '3' }), L('D1206', 40), L('D2140', 120, { tooth: 'K', surf: 'O' })] },
      { id: 'D5005', patient: 'P8', date: '2026-02-09', lines: [L('D2391', 160, { tooth: '8', surf: 'O' }), L('D7140', 180, { tooth: '1' }), L('D2392', 210, { tooth: '16', surf: 'MO' })] },
      { id: 'D5006', patient: 'P2', date: '2026-02-10', lines: [L('D0140', 70), L('D2330', 150, { tooth: '9', surf: 'M' })] },
    ])]));
    const H = (pid, date, code, tooth = '', quad = '') => ({ Patient: `${P(pid).last}, ${P(pid).first}`, 'Member ID': P(pid).member, Date: us(date), Code: code, Tooth: tooth, Quadrant: quad });
    w('dental-history.csv', W.csv([
      H('P2', '2025-07-15', 'D0120'), H('P2', '2026-01-10', 'D0120'), H('P2', '2026-01-10', 'D1110'), H('P2', '2026-01-10', 'D0274'),
      H('P6', '2023-06-20', 'D2750', '19'),
      H('P8', '2025-11-03', 'D7140', '16'),
      H('P7', '2024-01-15', 'D4341', '', 'UL'),
    ]));
    w('exports/open-dental-procs.csv', W.csv([
      { ClaimNum: '7001', Patient: `${P('P1').last}, ${P('P1').first}`, Birthdate: P('P1').dob, ProcDate: '2026-02-12', ProcCode: 'D2391', ToothNum: 'A', Surf: 'O', ProcFee: '160.00' },
      { ClaimNum: '7001', Patient: `${P('P1').last}, ${P('P1').first}`, Birthdate: P('P1').dob, ProcDate: '2026-02-12', ProcCode: 'D0140', ToothNum: '', Surf: '', ProcFee: '70.00' },
    ]));
    w('dental-config.json', { primary_tooth_age: 14 });
    w('dental-config-typo.json', { frequency: [{ codes: ['1110'], max: 2, per: 'patient' }] });
    w('exports/open-dental-procs-with-status.csv', "ClaimNum,Patient,Birthdate,ProcDate,ProcCode,ToothNum,Surf,ProcFee,ProcStatus\n7101,\"Pemberton, Harlow\",1958-03-14,2026-02-12,D2391,30,O,160.00,2\n7101,\"Pemberton, Harlow\",1958-03-14,2026-02-12,D2740,19,,1200.00,1\n7101,\"Pemberton, Harlow\",1958-03-14,2026-02-12,D0140,,,70.00,2\n7102,\"Pemberton, Harlow\",1958-03-14,2026-02-12,D7140,3,,190.00,6\n");
    readme('anise-of-dental', 'Anise of Dental', [
      '`dental-claims-2026-02.837`: an 837D (005010X224A2) with six fictional claims. Planted: bitewings already taken this year; a 2-surface code for 3 surfaces; an anterior resin code on a molar; a crown 32 months after the last one on that tooth; an anterior root canal code on a molar; scaling and root planing with no quadrant, and with a cleaning the same day; a sealant billed twice; a posterior resin code with an occlusal surface on a front tooth; a filling on a tooth extracted in November. D5006 is clean.',
      '`dental-history.csv`: seven past procedures for those patients (exams, cleaning, bitewings, a crown, an extraction, root planing in another quadrant).',
      '`exports/open-dental-procs.csv`: two lines in an Open Dental user-query layout (database column names), with a lettered (primary) tooth on an adult.',
      '`exports/open-dental-procs-with-status.csv`: the same layout with ProcStatus: two completed lines (2), a treatment-planned crown (1) and a deleted extraction (6), which are skipped.',
      '`dental-config.json`: primary-tooth age. `dental-config-typo.json` has a code without the D.',
    ], ['P1', 'P2', 'P5', 'P6', 'P7', 'P8']);
  });

  section('cumin-of-dme', () => {
    const w = writer('cumin-of-dme');
    const months = (from, n) => Array.from({ length: n }, (_, i) => { const d = new Date(`${from}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + i); return d.toISOString().slice(0, 10); });
    const H = (pid, dates, code, mods) => dates.map((d, i) => ({ Patient: `${P(pid).last}, ${P(pid).first}`, 'Member ID': P(pid).member, DOS: us(d), HCPCS: code, Modifiers: typeof mods === 'function' ? mods(i + 1) : mods }));
    const k = (m) => (m === 1 ? 'RR KH' : m <= 3 ? 'RR KI' : 'RR KJ');
    w('rental-history.csv', W.csv([
      ...H('P4', months('2025-03-01', 11), 'E0601', k),
      ...H('P7', months('2025-01-01', 13), 'E0260', k),
      ...H('P1', months('2026-01-01', 1), 'E0570', k),
      ...H('P3', months('2023-01-01', 37), 'E1390', 'RR'),
      ...H('P2', months('2025-06-01', 5), 'K0001', k),
    ]));
    const C = (id, pid, dos, code, mods, o = {}) => ({ 'Claim ID': id, Patient: `${P(pid).last}, ${P(pid).first}`, 'Member ID': P(pid).member, DOB: us(P(pid).dob), Payer: W.payer(P(pid).payer).name, DOS: us(dos), HCPCS: code, Modifiers: mods, Units: String(o.units ?? 1), Charge: (o.charge ?? 100).toFixed(2), 'Prior Auth': o.pa || '', 'Order Date': us(o.order || ''), 'Delivery Date': us(o.delivered || '') });
    w('dme-claims-2026-02.csv', W.csv([
      C('M6001', 'P4', '2026-02-01', 'E0601', 'RR KJ', { charge: 95 }),
      C('M6002', 'P7', '2026-02-01', 'E0260', 'RR KJ', { charge: 160 }),
      C('M6003', 'P1', '2026-02-01', 'E0570', 'RR KH', { charge: 22 }),
      C('M6004', 'P3', '2026-02-01', 'E1390', 'RR', { charge: 190 }),
      C('M6005', 'P2', '2026-02-05', 'L1833', 'NU', { charge: 650, order: '2026-02-01', delivered: '2026-02-05' }),
      C('M6006', 'P6', '2026-02-03', 'K0823', 'RR KH', { charge: 520, order: '2026-02-10', delivered: '2026-02-03' }),
      C('M6007', 'P8', '2026-02-02', 'A4253', '', { units: 10, charge: 300 }),
      C('M6008', 'P8', '2026-02-02', 'A4253', '', { units: 2, charge: 60 }),
      C('M6009', 'P5', '2026-02-04', 'E0114', 'NU', { charge: 45, order: '2026-02-01', delivered: '2026-02-04' }),
      C('M6010', 'P2', '2026-02-01', 'K0001', 'RR KH', { charge: 70 }),
      C('M6011', 'P6', '2026-02-03', 'E0143', 'NU', { charge: 120, order: '2026-02-01', delivered: '2026-02-03' }),
    ]));
    w('dme-config.json', { gap_days: 60, items: [{ code: 'E0143', label: 'Walker, folding, wheeled', category: 'purchase' }] });
    w('dme-config-typo.json', { items: [{ code: 'E0601', category: 'caped_rental' }] });
    readme('cumin-of-dme', 'Cumin of DME', [
      '`dme-claims-2026-02.csv`: eleven fictional DME claim lines for February 2026 with order and delivery dates. Planted: a hospital bed in rental month 14 (past the 13-month cap); a nebulizer in month 2 billed with KH; an oxygen concentrator in month 38; a knee orthosis with no RT or LT; a power wheelchair with no prior authorization and an order dated after delivery; test strips over the unit limit and billed twice; a wheelchair restarting after a gap. The CPAP in month 12 (KJ) and the crutches are clean.',
      '`rental-history.csv`: 67 earlier rental months for those patients.',
      '`dme-config.json`: one extra item (a walker) and the 60-day gap. `dme-config-typo.json` has a misspelled category.',
    ], ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
  });

  section('caraway-of-anesthesia', () => {
    const w = writer('caraway-of-anesthesia');
    const VANCE = 'Ruth Vance MD (fictional)'; const OKORO = 'Tobi Okoro CRNA (fictional)'; const ILVES = 'Sam Ilves CRNA (fictional)';
    const t = (d, hm) => `${us(d)} ${hm}`;
    const rows = [];
    const A = (id, kase, pid, prov, code, mods, start, stop, o = {}) => {
      const d0 = o.date || '2026-02-03';
      rows.push({ 'Claim ID': id, 'Case ID': kase, Patient: `${P(pid).last}, ${P(pid).first}`, DOB: us(P(pid).dob), 'Member ID': P(pid).member, Payer: W.payer(P(pid).payer).name, Provider: prov, DOS: us(d0), 'CPT Code': code, Modifiers: mods, 'Start Time': t(d0, start), 'End Time': t(o.endDate || d0, stop), Minutes: String(o.minutes), Units: String(o.units), Charge: (o.charge ?? 900).toFixed(2) });
      for (const q of o.qc || []) rows.push({ 'Claim ID': id, 'Case ID': kase, Patient: `${P(pid).last}, ${P(pid).first}`, DOB: us(P(pid).dob), 'Member ID': P(pid).member, Payer: W.payer(P(pid).payer).name, Provider: prov, DOS: us(d0), 'CPT Code': q, Modifiers: '', 'Start Time': '', 'End Time': '', Minutes: '', Units: '', Charge: '0.00' });
    };
    A('A7001', 'K1', 'P4', VANCE, '00790', 'QK P3', '07:30', '09:15', { minutes: 105, units: 14, qc: ['99100'] });
    A('A7002', 'K1', 'P4', OKORO, '00790', 'QX P3', '07:30', '09:15', { minutes: 105, units: 14, qc: ['99100'] });
    A('A7003', 'K2', 'P7', VANCE, '00740', 'QK P2', '08:00', '09:00', { minutes: 60, units: 9 });
    A('A7004', 'K2', 'P7', ILVES, '00740', 'QX P2', '08:00', '09:00', { minutes: 60, units: 9 });
    A('A7005', 'K3', 'P2', VANCE, '01402', 'QY P2', '10:00', '12:10', { minutes: 130, units: 16 });
    A('A7006', 'K3', 'P2', OKORO, '01402', 'QX P2', '10:00', '12:10', { minutes: 130, units: 16 });
    A('A7007', 'K4', 'P7', VANCE, '00740', 'QY P2', '10:30', '11:00', { minutes: 30, units: 7 });
    A('A7008', 'K4', 'P7', ILVES, '00740', 'QX P2', '10:30', '11:00', { minutes: 30, units: 7 });
    A('A7009', 'K5', 'P5', OKORO, '00142', 'QZ P1', '13:00', '13:45', { minutes: 40, units: 7, qc: ['99100'] });
    A('A7010', 'K6', 'P6', VANCE, '01967', 'AA P2', '14:00', '15:30', { minutes: 90, units: 11 });
    A('A7011', 'K6', 'P6', OKORO, '01967', 'QZ P2', '14:00', '15:30', { minutes: 90, units: 11 });
    A('A7012', 'K7', 'P8', OKORO, '00840', 'QZ P2', '15:00', '16:00', { minutes: 60, units: 10 });
    A('A7013', 'K8', 'P1', VANCE, '00812', 'AA', '16:30', '17:10', { minutes: 40, units: 8 });
    A('A7014', 'K9', 'P3', VANCE, '00840', 'AA P2', '23:30', '00:45', { minutes: 75, units: 11, endDate: '2026-02-04' });
    w('anesthesia-claims-2026-02-03.csv', W.csv(rows));
    w('anesthesia-base-units-illustrative.csv', W.csv([
      ['00142', 4, 'Anesthesia for lens surgery'], ['00740', 5, 'Anesthesia for upper GI endoscopic procedures'], ['00790', 7, 'Anesthesia for intraperitoneal procedures in upper abdomen'],
      ['00812', 3, 'Anesthesia for screening colonoscopy'], ['00840', 6, 'Anesthesia for intraperitoneal procedures in lower abdomen'], ['01402', 7, 'Anesthesia for knee arthroplasty'], ['01967', 5, 'Neuraxial labor analgesia'],
    ].map(([c, b, d]) => ({ 'CPT Code': c, 'Base Unit': String(b), Descriptor: d }))));
    w('anesthesia-config.json', { unit_minutes: 15, rounding: 'tenth', payers: [
      { name: 'Test Medicare Contractor', conversion_factor: 20, rounding: 'tenth' },
      { name: 'Sample Mutual Insurance', conversion_factor: 65, rounding: 'up', ps_qc_units: true },
      { name: 'Example Health Plan', conversion_factor: 58, rounding: 'nearest', ps_qc_units: true },
    ] });
    w('anesthesia-config-typo.json', { rounding: 'ceiling' });
    readme('caraway-of-anesthesia', 'Caraway of Anesthesia', [
      '`anesthesia-claims-2026-02-03.csv`: one fictional operating day, 14 claims for 9 cases (an anesthesiologist and two CRNAs), with qualifying circumstance lines. Planted: QY billed while the anesthesiologist covered two rooms (twice); 99100 on a 13-year-old; reported minutes that do not match the times; AA while a CRNA billed the same case; a CRNA with two overlapping cases; a case with no physical status modifier and units billed above base plus time. Cases K1 and K2 (QK with QX, two rooms) and the case that crosses midnight are clean.',
      '`anesthesia-base-units-illustrative.csv`: base units for the codes used. Illustrative values for testing: load the CMS anesthesia base units file for your year.',
      '`anesthesia-config.json`: per-payer conversion factors (illustrative), rounding and whether physical status and qualifying units are paid. `anesthesia-config-typo.json` has a rounding value that does not exist.',
    ], ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
  });

  section('tarragon-of-labs', () => {
    const w = writer('tarragon-of-labs');
    const CLIA = '02D0999999';
    const L = (code, charge, o = {}) => ({ code, charge, units: o.units ?? 1, date: o.date || '2026-02-10', mods: o.mods || [] });
    const BMP = ['82310', '82374', '82435', '82565', '82947', '84132', '84295', '84520'];
    w('lab-claims-2026-02.837', buildX12([W.body837P([
      { id: 'L8001', patient: 'P1', clia: CLIA, dx: ['E11.9', 'Z00.00'], lines: [L('80053', 48), L('84443', 52), L('36415', 12)] },
      { id: 'L8002', patient: 'P4', dx: ['Z00.00'], lines: [L('83036', 38), L('36415', 12)] },
      { id: 'L8003', patient: 'P2', clia: CLIA, dx: ['J02.9'], lines: [L('87880', 30), L('36415', 24, { units: 2 })] },
      { id: 'L8004', patient: 'P3', clia: CLIA, dx: ['N18.3'], lines: BMP.map((c) => L(c, 9)) },
      { id: 'L8005', patient: 'P7', clia: CLIA, dx: ['E78.5'], lines: [L('80061', 40), L('82465', 12)] },
      { id: 'L8006', patient: 'P6', clia: CLIA, dx: ['D64.9'], lines: [L('85025', 22), L('85025', 22)] },
      { id: 'L8007', patient: 'P8', clia: '2D12345', dx: ['R30.0'], lines: [L('81002', 8)] },
      { id: 'L8008', patient: 'P5', clia: CLIA, dx: ['D50.9'], lines: [L('85018', 10, { mods: ['QW'] })] },
    ])]));
    w('lab-history.csv', W.csv([{ Patient: `${P('P4').last}, ${P('P4').first}`, 'Member ID': P('P4').member, DOS: us('2025-12-10'), CPT: '83036' }, { Patient: `${P('P1').last}, ${P('P1').first}`, 'Member ID': P('P1').member, DOS: us('2025-08-01'), CPT: '83036' }]));
    const base = { clia: CLIA, waived_codes: ['87880', '81002', '85018', '82962'], qw_exempt: ['81002'], dx_rules: [{ code: '83036', dx_prefixes: ['E08', 'E09', 'E10', 'E11', 'E13', 'O24', 'R73'], note: 'example rule for testing, not a payer policy' }], frequency: [{ code: '83036', months: 3, max: 1, note: 'example limit for testing' }] };
    w('lab-config.json', { ...base, certificate: 'compliance' });
    w('lab-config-waiver.json', { ...base, certificate: 'waiver' });
    w('lab-config-typo.json', { certificate: 'waived' });
    readme('tarragon-of-labs', 'Tarragon of Labs', [
      '`lab-claims-2026-02.837`: an 837P with eight fictional lab claims. Planted: no CLIA and an HbA1c with only a screening diagnosis, two months after the last one; a waived strep test without QW and venipuncture billed twice; every basic metabolic panel component billed separately; a lipid panel with one of its components; a CBC twice with no 91; a malformed CLIA. L8001 and L8008 are clean.',
      '`lab-history.csv`: two earlier HbA1c tests.',
      '`lab-config.json`: CLIA, waived tests, one example diagnosis rule and one example frequency limit (for testing, not payer policy). `lab-config-waiver.json` is the same lab with a certificate of waiver. `lab-config-typo.json` has a certificate type that does not exist.',
    ], ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
  });
  section('lovage-of-telehealth', () => {
    const w = writer('lovage-of-telehealth');
    const pr = (id) => W.PROVIDERS.find((p) => p.id === id).name;
    const V = (id, pid, prov, code, mods, pos, o = {}) => ({ 'Claim ID': id, Patient: `${P(pid).last}, ${P(pid).first}`, DOB: us(P(pid).dob), 'Member ID': P(pid).member, Payer: W.payer(P(pid).payer).name, Provider: pr(prov), DOS: us(o.date || '2026-02-12'), CPT: code, Modifiers: mods, POS: pos, 'Patient State': o.state ?? 'AK', 'Patient Location': o.loc ?? 'Home', Modality: o.modality ?? 'Video', Consent: o.consent ?? 'Y', Charge: (o.charge ?? 120).toFixed(2) });
    w('telehealth-visits-2026-02.csv', W.csv([
      V('T9001', 'P1', 'reyes', '99213', '95', '10'),
      V('T9002', 'P2', 'reyes', '99214', '95', '02'),
      V('T9003', 'P3', 'brandt', '99442', '', '02', { modality: 'Telephone' }),
      V('T9004', 'P4', 'moreau', '99213', '', '10', { modality: 'Audio only' }),
      V('T9005', 'P6', 'brandt', '98005', '95', '10'),
      V('T9006', 'P7', 'reyes', '99214', '95', '10', { state: 'OR' }),
      V('T9007', 'P8', 'moreau', '98016', '', '02', { loc: 'Community clinic', consent: '', modality: 'Audio only' }),
      V('T9008', 'P5', 'moreau', '99213', '95', '10'),
      V('T9009', 'P5', 'moreau', '99213', '', '11', { loc: 'Office', modality: '', consent: '' }),
      V('T9010', 'P1', 'reyes', 'Q3014', '', '11', { charge: 31 }),
      V('T9011', 'P2', 'reyes', '99213', 'GT', '02', { loc: 'Rural clinic (originating site)' }),
      V('T9012', 'P3', 'brandt', '99213', '', '02', { loc: 'Community clinic' }),
      V('T9013', 'P4', 'reyes', '99214', '95', '10', { state: 'WA' }),
    ]));
    w('telehealth-config.json', {
      payers: [
        { name: 'Sample Mutual Insurance', pos: ['02', '10'], modifier: '95', audio_modifier: '93', audio_allowed: true, telemedicine_codes: false, note: 'example rule for testing, not this or any payer\'s policy' },
        { name: 'Example Health Plan', pos: ['02', '10'], audio_modifier: '93', audio_allowed: true, telemedicine_codes: true, note: 'example rule for testing' },
        { name: 'Demo Medicaid Plan', pos: ['02'], audio_allowed: false, telemedicine_codes: false, note: 'example rule for testing' },
      ],
      providers: [
        { name: pr('reyes'), states: ['AK', 'WA'] },
        { name: pr('brandt'), states: ['AK'] },
        { name: pr('moreau'), states: ['AK', 'OR'] },
      ],
    });
    w('telehealth-config-typo.json', { default_rule: { modifier: '96' } });
    readme('lovage-of-telehealth', 'Lovage of Telehealth', [
      '`telehealth-visits-2026-02.csv`: 13 fictional claim lines (12 telehealth, one in-person). Planted: place of service 02 for a patient at home; the deleted 99442 for a payer that does not cover audio-only; an audio-only visit without 93; 98005 for a payer that does not take the telemedicine codes; a provider not licensed in the patient\'s state; 98016 with no consent recorded; a telehealth visit and an in-person visit by the same provider on the same day; Q3014 for a patient at home; GT where the payer wants 95. T9001, T9012 and T9013 are clean.',
      '`telehealth-config.json`: example rules for three payers (for testing, not any payer\'s policy) and the states each provider is licensed in. Test Medicare Contractor is left out, so its lines use the built-in example rule. `telehealth-config-typo.json` has a modifier that does not exist.',
    ], ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
  });
  section('mallow-of-kpis', () => {
    const w = writer('mallow-of-kpis');
    const pr = (id) => W.PROVIDERS.find((p) => p.id === id).name;
    const add = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
    const FEE = { 99203: 210, 99213: 150, 99214: 220, 99215: 300 };
    // [claim, patient, provider, date of service, code, outcome]; outcome: paid | deny:<reason> | deny16-then-paid | open
    const PLAN = [
      ['K1001', 'P1', 'reyes', '2025-11-04', '99213', 'paid'], ['K1002', 'P5', 'moreau', '2025-11-12', '99214', 'paid'], ['K1003', 'P7', 'reyes', '2025-12-02', '99215', 'paid'],
      ['K1004', 'P1', 'reyes', '2025-12-15', '99213', 'paid'], ['K1005', 'P5', 'moreau', '2026-01-06', '99213', 'paid'], ['K1006', 'P7', 'reyes', '2026-01-13', '99214', 'paid'],
      ['K1007', 'P1', 'moreau', '2026-01-20', '99213', 'paid'], ['K1008', 'P7', 'reyes', '2026-02-05', '99214', 'open'],
      ['K2001', 'P2', 'brandt', '2025-11-05', '99214', 'paid'], ['K2002', 'P6', 'brandt', '2025-11-19', '99203', 'deny:197'], ['K2003', 'P2', 'brandt', '2025-12-03', '99213', 'paid'],
      ['K2004', 'P6', 'brandt', '2025-12-17', '99214', 'deny:197'], ['K2005', 'P2', 'brandt', '2026-01-07', '99213', 'paid'], ['K2006', 'P6', 'brandt', '2026-01-21', '99215', 'paid'],
      ['K3001', 'P3', 'moreau', '2025-11-06', '99213', 'paid'], ['K3002', 'P8', 'moreau', '2025-11-20', '99214', 'deny16-then-paid'], ['K3003', 'P3', 'moreau', '2025-11-28', '99203', 'open'],
      ['K3004', 'P8', 'moreau', '2025-12-04', '99213', 'paid'], ['K3005', 'P3', 'moreau', '2025-12-18', '99213', 'paid'], ['K3006', 'P8', 'moreau', '2026-01-08', '99214', 'open'],
      ['K4001', 'P4', 'reyes', '2025-11-10', '99214', 'paid'], ['K4002', 'P4', 'reyes', '2025-12-08', '99215', 'deny:50'], ['K4003', 'P4', 'reyes', '2025-12-29', '99213', 'paid'], ['K4004', 'P4', 'reyes', '2026-01-02', '99214', 'open'],
    ];
    const LAG = { EHP: 16, SMI: 22, DMP: 45, TMC: 14 };
    const rows = []; const sets = new Map();
    const remit = (pk, date, c) => { const k = `${pk}|${date}`; if (!sets.has(k)) sets.set(k, { payer: pk, date, claims: [] }); sets.get(k).claims.push(c); };
    for (const [id, pid, prov, dos, code, out] of PLAN) {
      const p = P(pid); const pk = p.payer; const charge = FEE[code]; const sent = add(dos, 2);
      rows.push({ 'Claim ID': id, Patient: `${p.last}, ${p.first}`, DOB: us(p.dob), 'Member ID': p.member, Payer: W.payer(pk).name, Provider: pr(prov), DOS: us(dos), 'Date Submitted': us(sent), CPT: code, Charge: charge.toFixed(2) });
      const allowed = Math.round(charge * 0.7); const ptr = pk === 'DMP' ? 0 : pk === 'TMC' ? Math.round(allowed * 0.2) : 20;
      const paidClaim = (st) => ({ id, patient: pid, status: st, charge, paid: allowed - ptr, pr: ptr, cas: [['CO', '45', charge - allowed], ...(ptr ? [['PR', pk === 'TMC' ? '2' : '3', ptr]] : [])] });
      if (out === 'paid') remit(pk, add(sent, LAG[pk]), paidClaim('1'));
      else if (out.startsWith('deny:')) remit(pk, add(sent, LAG[pk]), { id, patient: pid, status: '4', charge, paid: 0, pr: 0, cas: [['CO', out.slice(5), charge]] });
      else if (out === 'deny16-then-paid') { remit(pk, add(sent, LAG[pk]), { id, patient: pid, status: '4', charge, paid: 0, pr: 0, cas: [['CO', '16', charge]] }); remit(pk, add(sent, LAG[pk] + 30), paidClaim('1')); }
    }
    remit('TMC', '2026-01-26', { id: 'K9999', patient: 'P4', status: '1', charge: 150, paid: 84, pr: 21, cas: [['CO', '45', 45], ['PR', '2', 21]] });
    w('claims-2025-11-to-2026-01.csv', W.csv(rows));
    let n = 0;
    w('remits-2025-11-to-2026-02.835', buildX12([...sets.values()].sort((a, b) => a.date.localeCompare(b.date)).map((x) => W.body835({ trace: `EFT${String(++n).padStart(5, '0')}`, payer: x.payer, date: x.date, claims: x.claims }))));
    w('kpi-config.json', { as_of: '2026-02-15', period_days: 90, no_response_days: 30, targets: { denial_rate: 10, first_pass_rate: 85, net_collection_rate: 95, median_days_to_pay: 30, days_in_ar: 40 } });
    w('kpi-config-typo.json', { targets: { denial_rate: 140 } });
    readme('mallow-of-kpis', 'Mallow of KPIs', [
      '`claims-2025-11-to-2026-01.csv`: 24 fictional claims from November 2025 to early February 2026 across four payers, with the date each was submitted.',
      '`remits-2025-11-to-2026-02.835`: the 835 payments for them. Planted: two prior authorization denials and a medical necessity denial; a claim denied for missing information and paid 30 days later; a slow payer (45 days); three claims with no remittance more than 30 days after they were sent; one remittance for a claim that is not in the claims file.',
      '`kpi-config.json`: an as-of date of 2026-02-15 and example targets for testing, not benchmarks. `kpi-config-typo.json` has a denial rate target above 100.',
    ], ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
  });
  section('vervain-of-onboarding', () => {
    const w = writer('vervain-of-onboarding');
    const pr = (id) => W.PROVIDERS.find((p) => p.id === id);
    w('onboarding-setup.json', {
      practice: { name: 'Example Family Medicine (fictional)', billing_npi: '2990000012', tax_id: '99-0000001', taxonomy: '207Q00000X', address: { street: 'PO Box 4410', city: 'Exampleton', state: 'AK', zip: '99501' }, pay_to_address: { street: 'PO Box 4410', city: 'Exampleton', state: 'AK', zip: '99501-4410' } },
      go_live: '2026-03-02', lead_days: 30, group_contracts: ['Example Health Plan'],
    });
    w('onboarding-setup-typo.json', { practice: { address: { state: 'Alaska' } }, go_live: '2026-03-02' });
    w('provider-roster.csv', W.csv([
      { Provider: pr('reyes').name, NPI: pr('reyes').npi, Taxonomy: pr('reyes').taxonomy, 'License State': 'AK' },
      { Provider: pr('brandt').name, NPI: pr('brandt').npi, Taxonomy: '207Q0000X', 'License State': 'AK' },
      { Provider: pr('moreau').name, NPI: '1990000031', Taxonomy: pr('moreau').taxonomy, 'License State': '' },
    ]));
    const E = (payer, prov, o = {}) => ({ Payer: payer, 'Payer ID': o.id ?? '', Provider: prov ? pr(prov).name : '', EDI: o.edi ?? '', ERA: o.era ?? '', EFT: o.eft ?? '', Credentialing: o.cred ?? '', 'Date Submitted': us(o.sub || ''), 'Effective Date': us(o.eff || '') });
    w('payer-enrollments.csv', W.csv([
      E('Example Health Plan', null, { id: '99901', edi: 'Approved', era: 'Approved', eft: 'Approved', cred: 'Approved', eff: '2026-02-01' }),
      E('Sample Mutual Insurance', null, { id: '99902', edi: 'Approved', era: 'Pending', eft: '', sub: '2026-02-10' }),
      E('Sample Mutual Insurance', 'reyes', { cred: 'Approved', eff: '2026-01-15' }),
      E('Sample Mutual Insurance', 'brandt', { cred: 'Pending', sub: '2026-01-20' }),
      E('Demo Medicaid Plan', null, { id: '', edi: 'Pending', era: 'Pending', eft: 'Pending', sub: '2026-02-20' }),
      E('Demo Medicaid Plan', 'reyes', { cred: 'Approved', eff: '2025-12-01' }),
      E('Demo Medicaid Plan', 'brandt', { cred: 'Approved', eff: '2025-12-01' }),
      E('Demo Medicaid Plan', 'moreau', { cred: 'Approved', eff: '2026-03-15' }),
      E('Test Medicare Contractor', null, { id: '99904', edi: 'Approved', era: 'Approved', eft: 'Approved' }),
      E('Test Medicare Contractor', 'reyes', { cred: 'Approved', eff: '2025-10-01' }),
      E('Test Medicare Contractor', 'brandt', { cred: 'Approved', eff: '2025-10-01' }),
      E('Test Medicare Contractor', 'moreau', { cred: 'Approved', eff: '2025-10-01' }),
    ]));
    w('fee-schedule.csv', W.csv([['99203', '210.00'], ['99213', '150.00'], ['99214', '220.00'], ['99215', '300.00'], ['36415', '0.00']].map(([c, f]) => ({ CPT: c, Modifier: '', Fee: f }))));
    const C = (id, pid, prov, code, payerName) => ({ 'Claim ID': id, Patient: `${P(pid).last}, ${P(pid).first}`, DOB: us(P(pid).dob), 'Member ID': P(pid).member, Payer: payerName || W.payer(P(pid).payer).name, Provider: prov, DOS: us('2026-01-21'), CPT: code, Charge: '150.00' });
    w('charges-last-month.csv', W.csv([
      C('V5001', 'P1', pr('reyes').name, '99213'), C('V5002', 'P2', pr('brandt').name, '99214'), C('V5003', 'P4', pr('reyes').name, '99215'),
      C('V5004', 'P6', 'Tobi Okoro CRNA (fictional)', '99213'), C('V5005', 'P7', pr('reyes').name, '92014', 'Sample Vision Plan'), C('V5006', 'P3', pr('moreau').name, '36415'),
    ]));
    readme('vervain-of-onboarding', 'Vervain of Onboarding', [
      '`onboarding-setup.json`: a fictional practice going live on 2026-03-02. Planted: the billing provider address is a PO box with a five-digit ZIP. `onboarding-setup-typo.json` has a state that is not two letters.',
      '`provider-roster.csv`: three fictional providers. Planted: a taxonomy one character short; an NPI with a wrong check digit and no license state.',
      '`payer-enrollments.csv`: four payers. Planted: ERA pending and EFT not started; a provider still pending and one with no credentialing row; an EDI enrollment submitted 10 days before go-live and no payer ID; credentialing effective after go-live. Example Health Plan contracts at group level and is ready; Test Medicare Contractor is ready.',
      '`fee-schedule.csv` and `charges-last-month.csv`: a code billed with no fee, a fee of zero, a payer with no enrollment row and a provider not on the roster.',
    ], ['P1', 'P2', 'P3', 'P4', 'P6', 'P7']);
  });
}
