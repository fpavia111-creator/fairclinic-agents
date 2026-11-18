// Fixtures for agents 11-20 (see make-fixtures.mjs).
export default function (section, { W, buildX12, writer, readme }) {
  const P = (id) => W.patient(id);
  const prov = (id) => W.PROVIDERS.find((p) => p.id === id).name;

  section('clover-of-charges', () => {
    const w = writer('clover-of-charges');
    const appts = []; const charges = [];
    const visit = (id, p, date, who, status, type, charge) => {
      appts.push({ 'Appt ID': id, Patient: W.fullName(P(p)), 'Appt Date': date, Provider: prov(who), Status: status, 'Visit Type': type });
      if (charge) for (const [code, amt] of charge.lines) charges.push({ 'Encounter ID': charge.id || id, 'Patient Name': W.fullName(P(p)), 'Primary Insurance': W.payer(P(p).payer).name, 'Service Date': date, 'Procedure Code': code, Units: '1', Charge: amt, 'Rendering Provider': prov(who), 'Date Billed': charge.billed });
    };
    const em = { 99212: '90.00', 99213: '150.00', 99214: '200.00', 99215: '280.00' };
    const c = (codes, billed, id) => ({ id, billed, lines: codes.map((x) => [x, em[x] || '120.00']) });
    ['99214', '99215', '99214', '99215', '99213'].forEach((code, i) => visit(`V2${i + 1}0`, ['P1', 'P2', 'P5', 'P6', 'P7'][i], `2026-01-${String(20 + i).padStart(2, '0')}`, 'reyes', 'Completed', 'Follow-up', c([code], `2026-01-${String(21 + i).padStart(2, '0')}`)));
    ['99213', '99213', '99212', '99213', '99214'].forEach((code, i) => visit(`V3${i + 1}0`, ['P3', 'P4', 'P8', 'P3', 'P4'][i], `2026-01-${String(20 + i).padStart(2, '0')}`, 'brandt', 'Completed', 'Follow-up', c([code], `2026-01-${String(21 + i).padStart(2, '0')}`)));
    visit('V101', 'P1', '2026-02-09', 'reyes', 'Completed', 'Follow-up', c(['99213'], '2026-02-10'));
    visit('V102', 'P2', '2026-02-09', 'reyes', 'Completed', 'Injection', c(['99214'], '2026-02-10'));
    visit('V103', 'P3', '2026-02-05', 'brandt', 'Checked Out', 'Follow-up', null);
    visit('V104', 'P4', '2026-02-11', 'brandt', 'Completed', 'Follow-up', null);
    visit('V105', 'P5', '2026-02-06', 'moreau', 'No Show', 'Sick visit', c(['99213'], '2026-02-07'));
    visit('V106', 'P6', '2026-02-02', 'reyes', 'Completed', 'Follow-up', c(['99214'], '2026-02-10'));
    visit('V107', 'P7', '2026-02-13', 'reyes', 'Scheduled', 'Follow-up', null);
    visit('V108', 'P1', '2026-02-10', 'reyes', 'Completed', 'Follow-up', c(['99213'], '2026-02-11', 'E-88'));
    charges.push({ 'Encounter ID': 'W900', 'Patient Name': W.fullName(P('P8')), 'Primary Insurance': W.payer('DMP').name, 'Service Date': '2026-02-04', 'Procedure Code': '99213', Units: '1', Charge: '150.00', 'Rendering Provider': prov('brandt'), 'Date Billed': '2026-02-05' });
    w('appointments-2026-02.csv', W.csv(appts));
    w('exports/tebra-charges-2026-02.csv', W.csv(charges));
    w('charge-config.json', { lag_days: 3, em_gap_points: 25, expected: [{ visit_type: 'Injection', codes: ['20610', 'J*'], note: 'Injection visits bill the procedure and usually the drug.' }] });
    w('charge-config-typo.json', { lag_days: 'three' });
    readme('clover-of-charges', 'Clover of Charges', [
      '`appointments-2026-02.csv`: twenty visits. `exports/tebra-charges-2026-02.csv`: the charges in a charge-detail export layout. Planted, as of 2026-02-12: an injection visit billed with only an E/M code (V102); a completed visit with no charge after 7 days (V103) and one from yesterday (V104, still pending); a no-show with a charge (V105); a charge billed 8 days after the visit (V106); a future visit (V107, skipped); a charge matched by patient and date because its encounter number differs (V108 / E-88); a charge with no visit (W900). Ten January visits give two providers different E/M level mixes.',
      '`charge-config.json`: charge lag target, comparison gap and the injection rule. `charge-config-typo.json` gives the lag as a word.',
    ], ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
  });
  section('marjoram-of-registration', () => {
    const w = writer('marjoram-of-registration');
    const us = (d) => (d ? `${d.slice(5, 7)}/${d.slice(8, 10)}/${d.slice(0, 4)}` : '');
    const row = (mrn, first, last, dob, o = {}) => ({ 'Chart #': mrn, 'Last Name': last, 'First Name': first, DOB: o.dobRaw ?? us(dob), Address: o.address || '12 Example Street', City: 'Exampleton', State: o.state || 'AK', Zip: o.zip || '99501', 'Home Phone': o.phone || '907-555-0100', 'Primary Insurance': o.payer || '', 'Member ID': o.member ?? '', Relationship: o.rel || 'Self', 'Subscriber Name': o.sub || '', 'Subscriber DOB': us(o.subDob), 'Termination Date': us(o.end), 'Secondary Insurance': o.sec || '', 'Secondary Member ID': o.secId || '', Guarantor: o.guar || '', 'Last Verified': us(o.verified || '2025-11-01') });
    const p = (id, o = {}) => { const x = P(id); return row(x.mrn, x.first, x.last, x.dob, { payer: W.payer(x.payer).name, member: x.member, address: x.address, zip: x.zip, phone: x.phone, ...o }); };
    w('registrations-2026-02.csv', W.csv([
      p('P1'),
      p('P2', { member: 'SMI55320041' }),
      p('P3', { member: '', zip: '9950' }),
      p('P4'),
      p('P5', { rel: 'Child', sub: 'Astrid Lindqvist' }),
      p('P6', { end: '2026-01-31', sec: 'Sample Mutual Insurance', secId: P('P6').member }),
      p('P7', { sub: 'Mara Ndiaye', phone: '907-555-014', verified: '2024-06-01' }),
      p('P8', { dobRaw: '04/25/2027', state: 'Alaska' }),
      row('M-1101', 'Harlow', 'Pembertin', '1958-03-14', { payer: 'Example Health Plan', member: 'EHP100200301' }),
      row('M-1102', 'Otto', 'Brennan', '1950-02-02', { payer: 'Test Medicare Contractor', member: '7XK2W40HN38' }),
      row('M-1103', 'Selma', 'Varga', '1988-08-08', { payer: 'Self Pay', rel: '' }),
    ]));
    w('registration-config.json', { payers: [{ name: 'Example Health Plan', member_id_pattern: 'EHP\\d{9}' }, { name: 'Sample Mutual Insurance', member_id_pattern: 'SMI\\d{9}' }, { name: 'Demo Medicaid Plan', member_id_pattern: 'DMP\\d{9}' }, { name: 'Test Medicare Contractor', id_format: 'mbi' }], verify_days: 365, minor_age: 18 });
    w('registration-config-typo.json', { payers: [{ name: 'Test Medicare Contractor', id_format: 'MBI number' }] });
    w('registration-config-redos.json', { payers: [{ name: 'Example Health Plan', member_id_pattern: '(a+)+$' }] });
    readme('marjoram-of-registration', 'Marjoram of Registration', [
      '`registrations-2026-02.csv`: eleven charts in a registration-export layout (US dates, first and last name in separate columns). Planted, as of 2026-02-15: a clean chart (M-1001); a member id one digit short (M-1002); no member id and a 4-digit ZIP (M-1003); a Medicare id that is not an MBI (M-1004); a minor with no guarantor and a subscriber with no birth date (M-1005); ended coverage and the same plan as secondary (M-1006); self as subscriber with another name, a short phone and an old verification (M-1007); a birth date in the future and a spelled-out state (M-1008); a likely duplicate of M-1001 (M-1101); a valid made-up MBI (M-1102); a self-pay patient (M-1103).',
      '`registration-config.json`: member id patterns and the MBI rule. `registration-config-typo.json` has an unknown id format; `registration-config-redos.json` a pattern that could run for a very long time (refused).',
    ], ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
  });
  section('dill-of-modifiers', () => {
    const w = writer('dill-of-modifiers');
    const L = (code, date, extra = {}) => ({ code, charge: extra.charge ?? 120, units: 1, date, ...extra });
    const tx = W.body837P([
      { id: 'D1001', patient: 'P1', dx: ['E11.9'], lines: [L('99213', '2026-02-02', { charge: 150 })] },
      { id: 'D1002', patient: 'P2', dx: ['M17.11'], lines: [L('99214', '2026-02-02', { charge: 200 }), L('20610', '2026-02-02')] },
      { id: 'D1003', patient: 'P6', dx: ['M17.12'], lines: [L('99213', '2026-02-03', { mods: ['25'], charge: 150 }), L('20610', '2026-02-03', { mods: ['RT'] })] },
      { id: 'D1004', patient: 'P5', dx: ['M25.511'], lines: [L('20610', '2026-02-03', { mods: ['59', 'XS', 'LT', 'RT'] })] },
      { id: 'D1005', patient: 'P7', dx: ['L98.9'], lines: [L('11102', '2026-02-04', { mods: ['25'], charge: 140 })] },
      { id: 'D1006', patient: 'P3', dx: ['M54.50'], lines: [L('97110', '2026-02-04', { mods: ['59'], units: 2, charge: 80 }), L('97140', '2026-02-04', { charge: 70 })] },
      { id: 'D1007', patient: 'P4', dx: ['D64.9'], lines: [L('85025', '2026-02-05', { mods: ['91'], charge: 25 })] },
      { id: 'D1008', patient: 'P8', dx: ['H61.23'], lines: [L('69210', '2026-02-05', { mods: ['50'], units: 2, charge: 90 })] },
      { id: 'D1009', patient: 'P1', dx: ['M25.511'], lines: [L('73030', '2026-02-06', { mods: ['RT', '26'], charge: 45 })] },
      { id: 'D1010', patient: 'P6', dx: ['J06.9'], lines: [L('99213', '2026-02-06', { mods: ['ZZ'], charge: 150 })] },
    ]);
    w('batch-2026-02-06.837', buildX12([tx], { functional: 'HC', date: '20260206' }));
    w('modifier-config.json', { laterality_codes: ['20610', '73030', '69210'], rules: [{ payer: 'Demo Medicaid Plan', action: 'not_accepted', modifiers: ['59'], note: 'use XE, XS, XP or XU instead' }] });
    w('modifier-config-typo.json', { rules: [{ payer: 'Demo Medicaid Plan', action: 'reject', modifiers: ['59'] }] });
    w('exports/advancedmd-charges.csv', W.csv([
      { 'Visit ID': 'D2001', Patient: W.fullName(P('P2')), 'Primary Carrier': 'Sample Mutual Insurance', 'Date of Service': '02/09/2026', 'Proc Code': '99214', 'Modifier 1': '', 'Modifier 2': '', Units: '1', Charge: '200.00' },
      { 'Visit ID': 'D2001', Patient: W.fullName(P('P2')), 'Primary Carrier': 'Sample Mutual Insurance', 'Date of Service': '02/09/2026', 'Proc Code': '20610', 'Modifier 1': 'RT', 'Modifier 2': '', Units: '1', Charge: '120.00' },
      { 'Visit ID': 'D2002', Patient: W.fullName(P('P6')), 'Primary Carrier': 'Sample Mutual Insurance', 'Date of Service': '02/09/2026', 'Proc Code': '93000', 'Modifier 1': 'TC', 'Modifier 2': '26', Units: '1', Charge: '60.00' },
    ]));
    readme('dill-of-modifiers', 'Dill of Modifiers', [
      '`batch-2026-02-06.837`: ten claims. D1001 and D1003 are clean. Planted: E/M with an injection and no 25, injection with no side (D1002); 59 with XS and LT with RT (D1004); 25 on a skin biopsy (D1005); 59 to a payer that does not take it (D1006); 91 with no first test (D1007); 50 with 2 units (D1008); 26 after RT (D1009); an unknown modifier (D1010).',
      '`modifier-config.json`: codes that need a side and one payer rule. `modifier-config-typo.json` has an unknown action.',
      '`exports/advancedmd-charges.csv`: two visits in a charge-detail export layout with modifier columns (E/M with an injection and no 25; 26 with TC).',
    ], ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
  });
  section('hyssop-of-fees', () => {
    const w = writer('hyssop-of-fees');
    const R = [
      ['99211', '', 'Office visit, established, minimal', 'A', 0.18, 0.55, 0.07, 0.01], ['99213', '', 'Office visit, established, low', 'A', 1.30, 1.24, 0.55, 0.10],
      ['99214', '', 'Office visit, established, moderate', 'A', 1.92, 1.66, 0.79, 0.14], ['99215', '', 'Office visit, established, high', 'A', 2.80, 2.15, 1.15, 0.20],
      ['20610', '', 'Major joint injection or aspiration', 'A', 0.79, 1.10, 0.43, 0.10], ['93000', '', 'Electrocardiogram with report', 'A', 0.17, 0.30, 0.30, 0.02],
      ['93000', '26', 'Electrocardiogram, interpretation only', 'A', 0.17, 0.06, 0.06, 0.01], ['97110', '', 'Therapeutic exercise, 15 minutes', 'A', 0.45, 0.40, 0.40, 0.02],
      ['36415', '', 'Routine venipuncture', 'X', 0, 0, 0, 0], ['99385', '', 'Preventive visit, new, 18-39', 'N', 1.50, 1.30, 0.60, 0.11],
    ];
    const head = ['HCPCS', 'MOD', 'DESCRIPTION', 'STATUS CODE', 'WORK RVU', 'NON-FAC PE RVU', 'FACILITY PE RVU', 'MP RVU', 'CONV FACTOR'];
    w('rvu-illustrative.csv', ['ILLUSTRATIVE RELATIVE VALUE FILE FOR THE FAIRCLINIC FIXTURES (NOT THE CMS FILE; VALUES ARE MADE UP)', 'Layout follows the CMS PPRRVU file; conversion factor column left blank', W.csv(R.map((r) => Object.fromEntries(head.map((h, i) => [h, i < 8 ? String(r[i]) : '']))), head)].join('\n'));
    w('gpci-illustrative.csv', ['ILLUSTRATIVE GPCI FILE FOR THE FAIRCLINIC FIXTURES (NOT THE CMS FILE)', W.csv([
      { 'Medicare Administrative Contractor (MAC)': '02102', State: 'AK', 'Locality Number': '01', 'Locality Name': 'ALASKA', 'PW GPCI': '1.500', 'PE GPCI': '1.100', 'MP GPCI': '0.600' },
      { 'Medicare Administrative Contractor (MAC)': '09999', State: 'EX', 'Locality Number': '99', 'Locality Name': 'REST OF EXAMPLE STATE', 'PW GPCI': '1.000', 'PE GPCI': '0.950', 'MP GPCI': '0.800' },
    ])].join('\n'));
    w('fee-schedule.csv', W.csv([
      { CPT: '99211', Description: 'Office visit, minimal', Fee: '', 'Units Last Year': '40' },
      { CPT: '99213', Description: 'Office visit, low', Fee: '150.00', 'Units Last Year': '1800' },
      { CPT: '99214', Description: 'Office visit, moderate', Fee: '150.00', 'Units Last Year': '600' },
      { CPT: '99215', Description: 'Office visit, high', Fee: '400.00', 'Units Last Year': '90' },
      { CPT: '20610', Description: 'Joint injection, major', Fee: '120.00', 'Units Last Year': '210' },
      { CPT: '93000', Description: 'ECG with report', Fee: '90.00', 'Units Last Year': '300' },
      { CPT: '97110', Description: 'Therapeutic exercise', Fee: '80.00', 'Units Last Year': '900' },
      { CPT: '36415', Description: 'Venipuncture', Fee: '25.00', 'Units Last Year': '1200' },
      { CPT: '99385', Description: 'Preventive visit 18-39', Fee: '260.00', 'Units Last Year': '150' },
      { CPT: 'J3490', Description: 'Unclassified drug', Fee: '30.00', 'Units Last Year': '20' },
    ]));
    w('fee-config.json', { conv_factor: 33.4009, locality: 'Alaska', setting: 'nonfacility', target_percent: 150, ceiling_percent: 400, practice_name: W.PRACTICE.name });
    w('fee-config-typo.json', { conv_factor: 33.4009, setting: 'office' });
    w('exports/pfs-indicators.csv', W.csv(R.slice(0, 4).map((r) => ({ hcpc: r[0], modifier: r[1], proc_stat: r[3], sdesc: r[2], rvu_work: r[4], full_nfac_pe: r[5], full_fac_pe: r[6], rvu_mp: r[7], conv_fact: '33.4009' }))));
    w('exports/pfs-localities.csv', W.csv([{ mac: '02102', locality: '01', locality_name: 'ALASKA', gpci_work: '1.5', gpci_pe: '1.1', gpci_mp: '0.6' }]));
    readme('hyssop-of-fees', 'Hyssop of Fees', [
      '`rvu-illustrative.csv` and `gpci-illustrative.csv`: made-up relative values and GPCIs in the layout of the CMS PPRRVU and GPCI files (title lines above the header). They are not the CMS numbers. `fee-config.json` uses the CY2026 non-qualifying-APM conversion factor 33.4009 from the CMS final rule; check the figure for the year you price.',
      '`fee-schedule.csv`: ten codes. Planted at the Alaska locality: 99214 below the Medicare amount; 99213 and 20610 below the 150% target; 93000 above the 400% ceiling; no fee for 99211; Medicare status X (36415) and N (99385); a code with no RVU (J3490).',
      '`exports/pfs-indicators.csv` and `exports/pfs-localities.csv`: four codes and one locality in the pfs.data.cms.gov layouts, with the conversion factor in the file.',
      'No patient data is used here; `phi-canaries.json` lists fictional patients anyway so the shared leak test runs.',
    ], ['P1', 'P2', 'P3']);
  });
  section('laurel-of-contracts', () => {
    const w = writer('laurel-of-contracts');
    const mc = { 99213: 92, 99214: 130, 99215: 182, 20610: 66, 93000: 16.5, 97110: 30.5 };
    const pf = { 'Example Health Plan': 1.2, 'Sample Mutual Insurance': { 99213: 1.1, 99214: 1.05, 99215: 1.1, 20610: 0.9, 93000: 1.1, 97110: 1.1 }, 'Demo Medicaid Plan': 0.7 };
    const rows = [];
    for (const [payer, f] of Object.entries(pf)) for (const [code, m] of Object.entries(mc)) { if (payer === 'Demo Medicaid Plan' && code === '93000') continue; rows.push({ Payer: payer, CPT: code, 'Contract Rate': (m * (typeof f === 'number' ? f : f[code])).toFixed(2) }); }
    rows.push({ Payer: 'Demo Medicaid Plan', CPT: 'T1015', 'Contract Rate': '145.00' });
    w('payer-fees-2026.csv', W.csv(rows));
    w('medicare-2026-illustrative.csv', W.csv(Object.entries(mc).map(([code, m]) => ({ Code: code, 'Medicare Allowed': m.toFixed(2) }))));
    w('volumes-2025.csv', W.csv(Object.entries({ 99213: 1800, 99214: 600, 99215: 90, 20610: 210, 93000: 300, 97110: 900 }).map(([c, v]) => ({ CPT: c, Units: String(v) }))));
    w('contracts.csv', W.csv([
      { Payer: 'Example Health Plan', 'Effective Date': '04/01/2024', 'End Date': '03/31/2026', 'Auto Renew': 'Yes', 'Notice Days': '90', Escalator: '2', 'Timely Filing': '180', 'Appeal Days': '90' },
      { Payer: 'Sample Mutual Insurance', 'Effective Date': '07/01/2023', 'End Date': '06/30/2026', 'Auto Renew': 'Yes', 'Notice Days': '90', Escalator: '0', 'Timely Filing': '90', 'Appeal Days': '60' },
      { Payer: 'Demo Medicaid Plan', 'Effective Date': '01/01/2023', 'End Date': '12/31/2025', 'Auto Renew': 'No', 'Notice Days': '60', Escalator: '', 'Timely Filing': '90', 'Appeal Days': '60' },
      { Payer: 'Test Medicare Contractor', 'Effective Date': '01/01/2020', 'End Date': '', 'Auto Renew': '', 'Notice Days': '', Escalator: '', 'Timely Filing': '365', 'Appeal Days': '120' },
    ]));
    w('contract-config.json', { floor_percent: 100, warn_days: 120, practice_name: W.PRACTICE.name, payers: [{ name: 'Sample Mutual Insurance', contact: 'Provider Contracting, Sample Mutual Insurance (fictional)' }] });
    w('contract-config-typo.json', { floor_percent: '100%' });
    readme('laurel-of-contracts', 'Laurel of Contracts', [
      '`payer-fees-2026.csv`: three payers\' rates for six codes (made up). `medicare-2026-illustrative.csv`: made-up Medicare amounts. `volumes-2025.csv`: yearly units. Planted: one payer at 120% of Medicare, one at 105-110% with one code under 100% (20610), one at 70%, a code with no Medicare amount (T1015).',
      '`contracts.csv`: four contracts as of 2026-02-15: an auto-renewal whose notice deadline passed, one with 45 days left to give notice, an expired one, and one with no end date.',
      '`contract-config.json`: floor 100% of Medicare, 120-day warning. `contract-config-typo.json` gives the floor as text.',
      'No patient data is used here; `phi-canaries.json` lists fictional patients anyway so the shared leak test runs.',
    ], ['P1', 'P2', 'P3']);
  });
  section('sorrel-of-payers', () => {
    const w = writer('sorrel-of-payers');
    const plan = {
      EHP: { n: 10, lag: [14, 15, 16, 17, 18, 19, 20, 15, 16, 21], deny: { 4: ['CO', '16', ['M51']] } },
      SMI: { n: 8, lag: [25, 32, 38, 40, 29, 35, 41, 33], deny: { 1: ['CO', '197'], 5: ['CO', '97', ['M15']] } },
      DMP: { n: 8, lag: [45, 52, 61, 70, 48, 66, 58, 63], deny: { 0: ['CO', '16', ['N290']], 3: ['CO', '29'], 6: ['CO', '50'] } },
    };
    const pats = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8'];
    const subs = []; const bodies = [];
    for (const [pk, p] of Object.entries(plan)) for (const month of ['01', '02']) {
      const claims = [];
      for (let i = 0; i < p.n; i++) {
        if ((i % 2 === 0) !== (month === '01')) continue;
        const id = `S${pk[0]}${String(i + 1).padStart(2, '0')}`;
        const payDay = month === '01' ? '2026-01-28' : '2026-02-25';
        const sub = new Date(Date.parse(payDay) - p.lag[i] * 86400000).toISOString().slice(0, 10);
        const den = p.deny[i];
        const charge = 150;
        claims.push(den
          ? { id, patient: pats[i % 8], status: '4', charge, paid: 0, lines: [{ code: '99213', charge, paid: 0, date: sub, cas: [[den[0], den[1], charge]], remarks: den[2] || [] }] }
          : { id, patient: pats[i % 8], charge, paid: 100, pr: 20, lines: [{ code: '99213', charge, paid: 100, allowed: 120, date: sub, cas: [['CO', '45', 30], ['PR', '2', 20]] }] });
        subs.push({ 'Claim #': id, Patient: W.fullName(P(pats[i % 8])), 'Primary Payer': W.payer(pk).name, Submitted: `${sub.slice(5, 7)}/${sub.slice(8, 10)}/${sub.slice(0, 4)}`, Charge: '150.00' });
      }
      bodies.push({ month, body: W.body835({ trace: `EFT${pk}${month}`, payer: pk, date: month === '01' ? '2026-01-28' : '2026-02-25', claims }) });
    }
    const rev = W.body835({ trace: 'EFTSMIREV', payer: 'SMI', date: '2026-02-25', claims: [{ id: 'SS02', patient: 'P2', status: '22', charge: -150, paid: 0, lines: [] }] });
    w('era-2026-01.835', buildX12(bodies.filter((b) => b.month === '01').map((b) => b.body), { date: '20260128' }));
    w('era-2026-02.835', buildX12([...bodies.filter((b) => b.month === '02').map((b) => b.body), rev], { date: '20260225' }));
    w('claims-submitted.csv', W.csv(subs));
    w('payer-config.json', { targets: { days_to_pay: 30, denial_rate: 15, paid_percent: 55 }, payers: [{ name: 'Demo Medicaid Plan', days_to_pay: 45 }] });
    w('payer-config-typo.json', { targets: { days_to_pay: 'thirty' } });
    readme('sorrel-of-payers', 'Sorrel of Payers', [
      '`era-2026-01.835` and `era-2026-02.835`: two months of payments from three payers (26 claims). `claims-submitted.csv`: the submission date of each claim. Planted: one payer pays in about two weeks with 10% denials; one in about five weeks with 25% denials and a reversal; one in about two months with 38% denials (enrollment, timely filing, medical necessity).',
      '`payer-config.json`: targets of 30 days, 15% denials and 55% of billed paid, with a looser 45-day target for the Medicaid plan. `payer-config-typo.json` gives days as a word.',
    ], ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
  });
  section('tansy-of-credits', () => {
    const w = writer('tansy-of-credits');
    const us = (d) => (d ? `${d.slice(5, 7)}/${d.slice(8, 10)}/${d.slice(0, 4)}` : '');
    const row = (p, claim, payer, source, amt, credit, identified, debit, reason) => ({ 'Account #': P(p).account, Patient: W.fullName(P(p)), 'Claim #': claim, Payer: payer, 'Payment Source': source, 'Credit Amount': amt, 'Credit Date': us(credit), 'Date Identified': us(identified), 'Open Debit': debit, Reason: reason });
    w('credit-balances-2026-02-15.csv', W.csv([
      row('P4', 'T1001', 'Test Medicare Contractor', 'Test Medicare Contractor', '-85.00', '2025-12-01', '2025-12-10', '0.00', 'Paid twice on two remittances'),
      row('P1', 'T1002', 'Example Health Plan', 'Example Health Plan', '-120.00', '2026-01-20', '2026-01-25', '0.00', 'Paid after secondary already paid'),
      row('P2', 'T1003', 'Sample Mutual Insurance', 'Sample Mutual Insurance', '-60.00', '2026-02-01', '2026-02-05', '0.00', 'Contract rate lower than paid'),
      row('P5', 'T1004', 'Example Health Plan', 'Patient', '-40.00', '2026-01-10', '', '25.00', 'Copay collected twice'),
      row('P7', 'T1005', 'Example Health Plan', 'Patient credit card', '-75.00', '2023-05-01', '', '0.00', 'Prepayment, visit cancelled'),
      row('P8', 'T1006', 'Demo Medicaid Plan', 'Patient', '-3.50', '2026-02-02', '', '0.00', 'Rounding'),
      row('P6', 'T1007', 'Sample Mutual Insurance', 'Patient', '-50.00', '2026-01-28', '', '0.00', 'Deductible met after payment'),
      row('P3', 'T1008', 'Demo Medicaid Plan', 'Demo Medicaid Plan', '-90.00', '2026-02-10', '2026-02-10', '0.00', 'Wrong member'),
    ]));
    w('credit-config.json', { payers: [{ name: 'Test Medicare Contractor', medicare: true }, { name: 'Example Health Plan', refund_days: 30 }, { name: 'Sample Mutual Insurance', refund_days: 60 }], warn_days: 14, small_credit: 5, escheat_days: 1095, practice_name: W.PRACTICE.name });
    w('credit-config-typo.json', { payers: [{ name: 'Example Health Plan', refund_days: 0 }] });
    readme('tansy-of-credits', 'Tansy of Credits', [
      '`credit-balances-2026-02-15.csv`: eight credits in a credit-balance report layout (negative amounts, US dates). Planted, as of 2026-02-15: a Medicare overpayment past 60 days from identification (T1001); a payer credit 10 days from a 30-day deadline (T1002); a payer credit with time left (T1003); a patient credit with an open balance on the account (T1004); a patient credit almost three years old (T1005); a credit under the small-credit level (T1006); a plain patient refund (T1007); a payer with no refund rule (T1008).',
      '`credit-config.json`: refund days per payer, small-credit level and a 3-year unclaimed-property age. `credit-config-typo.json` has 0 refund days.',
    ], ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
  });
  section('borage-of-estimates', () => {
    const w = writer('borage-of-estimates');
    const us = (d) => (d ? `${d.slice(5, 7)}/${d.slice(8, 10)}/${d.slice(0, 4)}` : '');
    const row = (id, p, ins, sched, svc, req, issued, type, codes) => ({ 'Appt ID': id, Patient: W.fullName(P(p)), Insurance: ins, 'Date Scheduled': us(sched), 'Appointment Date': us(svc), 'Estimate Requested': us(req), 'GFE Issued': us(issued), 'Visit Type': type, 'Planned Codes': codes });
    w('self-pay-schedule.csv', W.csv([
      row('G1', 'P1', 'Self Pay', '2026-02-02', '2026-02-20', '', '2026-02-04', 'Joint injection', '99213 20610'),
      row('G2', 'P2', 'Self Pay', '2026-02-10', '2026-02-27', '', '', 'New patient', '99204'),
      row('G3', 'P3', 'Uninsured', '2026-02-13', '2026-02-19', '', '', 'Follow-up', '99213'),
      row('G4', 'P4', 'Self Pay', '2026-02-16', '2026-02-18', '', '', 'Follow-up', '99213'),
      row('G5', 'P5', 'Example Health Plan', '2026-02-02', '2026-02-26', '', '', 'Follow-up', '99213'),
      row('G6', 'P6', 'Self Pay', '2026-01-20', '2026-02-03', '', '2026-01-27', 'ECG', '93000'),
      row('G7', 'P7', '', '', '', '2026-02-11', '', 'Price request', '99214 93000'),
    ]));
    w('estimates-vs-bills.csv', W.csv([
      { 'GFE ID': 'E-501', Patient: W.fullName(P('P8')), Provider: 'Example Family Medicine (fictional)', Estimate: '800.00', 'Billed Charges': '1250.00' },
      { 'GFE ID': 'E-501', Patient: W.fullName(P('P8')), Provider: 'Example Imaging Center (fictional)', Estimate: '300.00', 'Billed Charges': '650.00' },
      { 'GFE ID': 'E-502', Patient: W.fullName(P('P1')), Provider: 'Example Family Medicine (fictional)', Estimate: '500.00', 'Billed Charges': '480.00' },
    ]));
    w('self-pay-prices.csv', W.csv([
      { CPT: '99204', Description: 'New patient visit, moderate', 'Self-Pay Price': '210.00' },
      { CPT: '99213', Description: 'Established visit, low', 'Self-Pay Price': '110.00' },
      { CPT: '99214', Description: 'Established visit, moderate', 'Self-Pay Price': '160.00' },
      { CPT: '20610', Description: 'Joint injection, major', 'Self-Pay Price': '95.00' },
      { CPT: '93000', Description: 'ECG with report', 'Self-Pay Price': '45.00' },
    ]));
    w('estimate-config.json', { holidays: ['2026-02-16'], threshold: 400, practice_name: W.PRACTICE.name });
    w('estimate-config-typo.json', { holidays: ['Presidents Day'] });
    readme('borage-of-estimates', 'Borage of Estimates', [
      '`self-pay-schedule.csv`: seven self-pay visits and requests (US dates). Planted, as of 2026-02-17 with 2026-02-16 as an office holiday: on time (G1); missing past its 3-business-day due date (G2); due with one business day of notice (G3); booked too close to need one (G4); insured (G5); issued late (G6); a price request with no visit (G7).',
      '`estimates-vs-bills.csv`: one estimate billed 450 over for one provider (dispute threshold reached), 350 over for another, and one within the estimate. `self-pay-prices.csv`: five self-pay prices.',
      '`estimate-config.json`: one office holiday and the 400-dollar threshold. `estimate-config-typo.json` gives a holiday as a name.',
    ], ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
  });
  section('aloe-of-statements', () => {
    const w = writer('aloe-of-statements');
    const us = (d) => (d ? `${d.slice(5, 7)}/${d.slice(8, 10)}/${d.slice(0, 4)}` : '');
    const row = (p, bal, o = {}) => ({ 'Acct #': P(p).account, Guarantor: W.fullName(P(p)), 'Patient Balance': bal, 'Insurance Pending': o.ins || '0.00', 'Statements Sent': String(o.sent ?? 0), 'Last Statement': us(o.last), 'Last Payment': us(o.paid), 'Payment Plan': o.plan || 'No', 'Address Status': o.addr || 'OK', Flags: o.flags || '', 'Oldest DOS': us(o.dos || '2025-12-01') });
    const extra = (acct, name, bal, o = {}) => ({ ...row('P1', bal, o), 'Acct #': acct, Guarantor: name });
    w('patient-balances-2026-02-20.csv', W.csv([
      row('P1', '120.00', { dos: '2026-01-05' }),
      row('P2', '85.00', { sent: 1, last: '2026-01-15' }),
      row('P3', '240.00', { sent: 2, last: '2026-01-10' }),
      row('P4', '310.00', { sent: 3, last: '2026-01-02' }),
      row('P5', '60.00', { ins: '150.00' }),
      row('P6', '400.00', { plan: 'Yes' }),
      row('P7', '95.00', { addr: 'Returned mail' }),
      row('P8', '3.00'),
      extra('A-2001', 'Ilse Marchetti', '180.00', { flags: 'Patient deceased - estate contact pending' }),
      extra('A-2002', 'Bram Okonkwo', '75.00', { flags: 'Disputes charge for 01/12 visit' }),
      extra('A-2003', 'Noor Vasquez', '220.00', { sent: 1, last: '2026-01-18', paid: '2026-02-12' }),
      extra('A-2004', 'Tomas Reinholt', '130.00', { sent: 1, last: '2026-02-10' }),
      extra('A-2005', 'Lena Ashworth', '90.00', { flags: 'Auto accident - PIP claim open' }),
    ]));
    w('statement-config.json', { min_balance: 5, cycle_days: 28, recent_payment_days: 14, collections_days: 30, practice_name: W.PRACTICE.name, pay_by: 'Pay online at the patient portal (fictional), call 907-555-0100, or mail a check to 1 Example Plaza, Exampleton AK 99501.', assistance_text: 'If paying is hard, ask us about financial assistance and payment plans. (Fictional practice text.)' });
    w('statement-config-typo.json', { cycle_days: 2 });
    readme('aloe-of-statements', 'Aloe of Statements', [
      '`patient-balances-2026-02-20.csv`: thirteen accounts (US dates; guarantor names are fictional). Planted, for a run on 2026-02-20: a first statement (P1), a second (P2), a final notice (P3), collections review after a final notice 49 days ago (P4); holds for insurance still pending (P5), a payment plan (P6), returned mail (P7), a 3-dollar balance (P8), an estate (A-2001), a dispute (A-2002), a payment 8 days ago (A-2003), a statement 10 days ago (A-2004); and an auto accident (PIP) flag that only a learned hold word catches (A-2005). Workers compensation is a built-in hold.',
      '`statement-config.json`: run rules, how to pay and the assistance sentence. `statement-config-typo.json` sets a 2-day cycle (refused).',
    ], ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
  });
  section('savory-of-plans', () => {
    const w = writer('savory-of-plans');
    const us = (d) => `${d.slice(5, 7)}/${d.slice(8, 10)}/${d.slice(0, 4)}`;
    const plan = (id, p, start, orig, monthly, day) => ({ 'Plan ID': id, Account: P(p).account, Guarantor: W.fullName(P(p)), 'Start Date': us(start), 'Original Balance': orig, 'Monthly Payment': monthly, 'Due Day': String(day), Autopay: 'No' });
    w('payment-plans.csv', W.csv([
      plan('PL1', 'P1', '2025-11-01', '600.00', '100.00', 1),
      plan('PL2', 'P2', '2025-10-15', '900.00', '150.00', 15),
      plan('PL3', 'P3', '2025-09-05', '1200.00', '100.00', 5),
      plan('PL4', 'P4', '2025-08-01', '300.00', '50.00', 1),
      plan('PL5', 'P6', '2026-01-10', '2400.00', '20.00', 10),
      plan('PL6', 'P7', '2025-12-01', '500.00', '100.00', 1),
    ]));
    const pay = []; const add = (id, dates, amt) => dates.forEach((d) => pay.push({ 'Plan ID': id, 'Payment Date': us(d), Amount: amt }));
    add('PL1', ['2025-11-01', '2025-12-01', '2026-01-02', '2026-02-01'], '100.00');
    add('PL2', ['2025-10-15', '2025-11-14', '2025-12-15'], '150.00');
    add('PL3', ['2025-09-05', '2025-10-06'], '100.00');
    add('PL4', ['2025-08-01', '2025-09-01', '2025-10-01', '2025-11-01', '2025-12-01', '2026-01-01'], '50.00');
    add('PL5', ['2026-01-10', '2026-02-10'], '20.00');
    add('PL6', ['2025-12-01', '2026-01-01', '2026-01-20', '2026-02-01'], '100.00');
    w('plan-payments.csv', W.csv(pay));
    w('plan-config.json', { grace_days: 10, default_after_missed: 2, min_payment: 25, tiers: [{ up_to: 500, max_months: 6 }, { up_to: 2000, max_months: 12 }, { up_to: 5000, max_months: 24 }], practice_name: W.PRACTICE.name });
    w('plan-config-typo.json', { tiers: [{ up_to: 500 }] });
    readme('savory-of-plans', 'Savory of Plans', [
      '`payment-plans.csv` and `plan-payments.csv`: six plans and their payments (US dates). Planted, as of 2026-02-20 with a 10-day grace period: current (PL1); one missed (PL2); four missed, for default review (PL3); paid off (PL4); 20 a month on 2400, below the minimum and over the 24-month limit (PL5); ahead by one payment (PL6).',
      '`plan-config.json`: grace days, default rule, minimum payment and term tiers. `plan-config-typo.json` has a tier with no term.',
    ], ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']);
  });
}
