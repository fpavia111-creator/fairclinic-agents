// The fictional practice every Fairclinic fixture is drawn from. Nothing here is real:
// the patients, member ids, payers, payer ids and the practice are invented. The
// NPIs are made-up numbers that pass the check digit; any match with a real
// provider is a coincidence.

export const PRACTICE = { name: 'Example Family Medicine (fictional)', npi: '2990000012', tax_id: '990000001', zip: '99501' };

export const PROVIDERS = [
  { id: 'reyes', name: 'Alma Reyes MD (fictional)', npi: '1990000014', taxonomy: '207Q00000X' },
  { id: 'brandt', name: 'Felix Brandt DO (fictional)', npi: '1990000022', taxonomy: '207Q00000X' },
  { id: 'moreau', name: 'Ines Moreau NP (fictional)', npi: '1990000030', taxonomy: '363LF0000X' },
  { id: 'okoro', name: 'Tobi Okoro CRNA (fictional)', npi: '1990000048', taxonomy: '367500000X' },
  { id: 'vance', name: 'Ruth Vance MD (fictional)', npi: '1990000055', taxonomy: '207L00000X' },
];

export const PAYERS = [
  { key: 'EHP', name: 'Example Health Plan', id: '99901', filing: 'CI' },
  { key: 'SMI', name: 'Sample Mutual Insurance', id: '99902', filing: 'CI' },
  { key: 'DMP', name: 'Demo Medicaid Plan', id: '99903', filing: 'MC' },
  { key: 'TMC', name: 'Test Medicare Contractor', id: '99904', filing: 'MB' },
];
export const payer = (k) => PAYERS.find((p) => p.key === k);

export const PATIENTS = [
  { id: 'P1', first: 'Harlow', last: 'Pemberton', dob: '1958-03-14', gender: 'F', member: 'EHP100200301', mrn: 'M-1001', account: 'A-1001', payer: 'EHP', address: '12 Larch Way', city: 'Exampleton', state: 'AK', zip: '99501', phone: '907-555-0141', email: 'harlow.p@example.test' },
  { id: 'P2', first: 'Juniper', last: 'Okafor', dob: '1990-07-22', gender: 'F', member: 'SMI553200417', mrn: 'M-1002', account: 'A-1002', payer: 'SMI', address: '4 Birch Court', city: 'Exampleton', state: 'AK', zip: '99502', phone: '907-555-0142', email: 'juniper.o@example.test' },
  { id: 'P3', first: 'Rowan', last: 'Castellano', dob: '1975-11-02', gender: 'M', member: 'DMP000781234', mrn: 'M-1003', account: 'A-1003', payer: 'DMP', address: '88 Spruce Road', city: 'Sampleville', state: 'AK', zip: '99503', phone: '907-555-0143', email: 'rowan.c@example.test' },
  { id: 'P4', first: 'Marisol', last: 'Thibodeaux', dob: '1949-01-30', gender: 'F', member: 'TMC8XY4ZZ12', mrn: 'M-1004', account: 'A-1004', payer: 'TMC', address: '3 Alder Lane', city: 'Sampleville', state: 'AK', zip: '99504', phone: '907-555-0144', email: 'marisol.t@example.test' },
  { id: 'P5', first: 'Ezra', last: 'Lindqvist', dob: '2012-05-09', gender: 'M', member: 'EHP100200455', mrn: 'M-1005', account: 'A-1005', payer: 'EHP', address: '19 Cedar Street', city: 'Exampleton', state: 'AK', zip: '99501', phone: '907-555-0145', email: 'lindqvist.family@example.test' },
  { id: 'P6', first: 'Delphine', last: 'Achterberg', dob: '1983-09-17', gender: 'F', member: 'SMI553209981', mrn: 'M-1006', account: 'A-1006', payer: 'SMI', address: '7 Willow Bend', city: 'Testburg', state: 'AK', zip: '99505', phone: '907-555-0146', email: 'delphine.a@example.test' },
  { id: 'P7', first: 'Caspian', last: 'Ndiaye', dob: '1966-12-01', gender: 'M', member: 'EHP100207733', mrn: 'M-1007', account: 'A-1007', payer: 'EHP', address: '230 Hemlock Drive', city: 'Testburg', state: 'AK', zip: '99505', phone: '907-555-0147', email: 'caspian.n@example.test' },
  { id: 'P8', first: 'Wren', last: 'Halvorsen', dob: '1995-04-25', gender: 'F', member: 'DMP000799001', mrn: 'M-1008', account: 'A-1008', payer: 'DMP', address: '5 Poplar Place', city: 'Exampleton', state: 'AK', zip: '99501', phone: '907-555-0148', email: 'wren.h@example.test' },
];
export const patient = (id) => PATIENTS.find((p) => p.id === id);
export const fullName = (p) => `${p.first} ${p.last}`;

/** Canary values for a set of patient ids: the strings a model must never see. */
export const canaries = (ids = PATIENTS.map((p) => p.id)) => ids.map(patient).flatMap((p) => [fullName(p), `${p.last}, ${p.first}`, p.member, p.dob, p.mrn, p.account, p.phone, p.email]);

const d8 = (iso) => iso.replace(/-/g, '');

/**
 * 837P transaction body for claims: [{ id, patient, payer, provider, pos, freq, original_ref,
 * prior_auth, clia, dx: [..], lines: [{ code, mods, charge, units, date, ptr, ndc }] }]
 */
export function body837P(claims, { billingNpi = PRACTICE.npi, omitBillingNpi = false } = {}) {
  const segs = [['BHT', '0019', '00', 'B0001', '20260115', '1200', 'CH'], ['NM1', '41', '2', 'EXAMPLE FAMILY MEDICINE', '', '', '', '', '46', 'SUB001'], ['NM1', '40', '2', 'EXAMPLE CLEARINGHOUSE', '', '', '', '', '46', 'REC001']];
  let hl = 0;
  segs.push(['HL', String(++hl), '', '20', '1'], ['NM1', '85', '2', 'EXAMPLE FAMILY MEDICINE', '', '', '', '', 'XX', omitBillingNpi ? '' : billingNpi], ['N3', '1 Example Plaza'], ['N4', 'Exampleton', 'AK', PRACTICE.zip], ['REF', 'EI', PRACTICE.tax_id]);
  const parent = hl;
  for (const c of claims) {
    const p = patient(c.patient); const py = payer(c.payer || p.payer); const prov = PROVIDERS.find((x) => x.id === (c.provider || 'reyes'));
    segs.push(['HL', String(++hl), String(parent), '22', '0'], ['SBR', 'P', '18', '', '', '', '', '', '', py.filing], ['NM1', 'IL', '1', p.last.toUpperCase(), p.first.toUpperCase(), '', '', '', 'MI', c.member === undefined ? p.member : c.member], ['N3', p.address], ['N4', p.city, p.state, p.zip], ['DMG', 'D8', d8(c.dob || p.dob), p.gender], ['NM1', 'PR', '2', py.name.toUpperCase(), '', '', '', '', 'PI', c.payer_id === undefined ? py.id : c.payer_id]);
    const total = c.total ?? c.lines.reduce((s, l) => s + l.charge, 0);
    segs.push(['CLM', c.id, total.toFixed(2), '', '', [c.pos || '11', 'B', c.freq || '1'], 'Y', 'A', 'Y', 'Y']);
    if (c.prior_auth) segs.push(['REF', 'G1', c.prior_auth]);
    if (c.original_ref) segs.push(['REF', 'F8', c.original_ref]);
    if (c.clia) segs.push(['REF', 'X4', c.clia]);
    if (c.dx && c.dx.length) segs.push(['HI', ...c.dx.map((d, i) => [i ? 'ABF' : 'ABK', d.replace('.', '')])]);
    segs.push(['NM1', '82', '1', prov.name.split(' ')[1].toUpperCase(), prov.name.split(' ')[0].toUpperCase(), '', '', '', 'XX', c.rendering_npi || prov.npi]);
    c.lines.forEach((l, i) => {
      segs.push(['LX', String(i + 1)], ['SV1', ['HC', l.code, ...(l.mods || [])], l.charge.toFixed(2), l.basis || 'UN', String(l.units ?? 1), l.pos || '', '', l.ptr === undefined ? '1' : l.ptr], ['DTP', '472', 'D8', d8(l.date)]);
    });
  }
  return { set: '837', version: '005010X222A1', segments: segs };
}

/**
 * 835 transaction body: { trace, payer, date, amount?, claims: [{ id, patient, status, charge, paid, pr,
 * icn, cas: [[group, reason, amount]], lines: [{ code, mods, charge, paid, units, date, allowed, cas, remarks }] }], plb: [[reason, ref, amount]] }
 */
export function body835({ trace, payer: pk, date, method = 'ACH', claims, plb = [], amount }) {
  const py = payer(pk);
  const paid = claims.reduce((s, c) => s + c.paid, 0) - plb.reduce((s, x) => s + x[2], 0);
  const segs = [['BPR', 'I', (amount ?? paid).toFixed(2), 'C', method, 'CCP', '01', '999999999', 'DA', '123456', '1999999999', '', '01', '999999999', 'DA', '654321', d8(date)], ['TRN', '1', trace, '1' + py.id.padStart(9, '0')], ['DTM', '405', d8(date)], ['N1', 'PR', py.name], ['REF', '2U', py.id], ['N1', 'PE', 'EXAMPLE FAMILY MEDICINE', 'XX', PRACTICE.npi], ['LX', '1']];
  for (const c of claims) {
    const p = patient(c.patient);
    segs.push(['CLP', c.id, c.status || '1', c.charge.toFixed(2), c.paid.toFixed(2), (c.pr || 0).toFixed(2), py.filing === 'MB' ? 'MB' : py.filing === 'MC' ? 'MC' : '12', c.icn || `ICN${c.id}`]);
    for (const [g, r, a] of c.cas || []) segs.push(['CAS', g, r, a.toFixed(2)]);
    segs.push(['NM1', 'QC', '1', p.last.toUpperCase(), p.first.toUpperCase(), '', '', '', 'MI', p.member]);
    if (c.rendering) segs.push(['NM1', '82', '1', 'PROVIDER', '', '', '', '', 'XX', c.rendering]);
    if (c.received) segs.push(['DTM', '050', d8(c.received)]);
    for (const l of c.lines || []) {
      segs.push(['SVC', ['HC', l.code, ...(l.mods || [])], l.charge.toFixed(2), l.paid.toFixed(2), '', String(l.units ?? 1)], ['DTM', '472', d8(l.date)]);
      for (const [g, r, a] of l.cas || []) segs.push(['CAS', g, r, a.toFixed(2)]);
      if (l.allowed !== undefined) segs.push(['AMT', 'B6', l.allowed.toFixed(2)]);
      for (const rk of l.remarks || []) segs.push(['LQ', 'HE', rk]);
    }
  }
  if (plb.length) segs.push(['PLB', PRACTICE.npi, d8(date).slice(0, 4) + '1231', ...plb.flatMap(([r, ref, a]) => [[r, ref], a.toFixed(2)])]);
  return { set: '835', version: '005010X221A1', segments: segs };
}

/** CSV text from rows (fixture writer; values are plain fictional strings). */
export function csv(rows, columns = Object.keys(rows[0] || {})) {
  const q = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [columns.join(','), ...rows.map((r) => columns.map((c) => q(r[c])).join(','))].join('\n') + '\n';
}
