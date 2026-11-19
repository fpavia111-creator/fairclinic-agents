// What each agent's fictional fixtures plant on purpose, how the clean set is made from them,
// and the one-edit mutation cases. Used by scripts/accuracy.mjs.
//
// key:       the item's name in the result (with masking off), built from its fields.
// fine:      item statuses that are not a problem (ok, waiting, scheduled ...). For agents whose
//            items carry a findings list, the finding codes are counted; otherwise the status is.
// planted:   { 'item key': [codes] } — everything the fixture notes (fixtures/README.md) say the
//            demo data contains. A code listed twice must be found on two items with that key.
//            Any other finding on the demo data is counted as unplanned.
// clean:     edits that remove each planted problem and nothing else, applied to the demo files and
//            written to fixtures/clean/. The clean set must give zero findings.
//              ['set', file, where, values]   change matching rows
//              ['drop', file, where]          remove matching rows
//              ['dropLast', file, where]      remove the last matching row (a duplicate)
//              ['add', file, row]             add a row
//              ['text', file, regex, text]    rewrite a non-CSV file (the 835 remittance)
// mutations: one edit (one field in one row, or one row added or removed) on the clean set, and
//            the finding it must raise: { id, op, expect: ['item key', 'code'] }.
// The clean sets and mutations were written by the same author as the rules.

const k = (...f) => (i) => f.map((x) => String(i[x] ?? '')).join(' ').trim();

export const SPECS = {
  'fairclinic-boarding-grooming': {
    key: k('reservation_id'), fine: ['ok', 'cancelled'],
    planted: { R2: ['nights_short', 'addon_not_invoiced'], R3: ['not_invoiced'], R4: ['addon_not_invoiced'] },
    clean: [
      ['set', 'shepherd-invoice-items.csv', { Reservation: 'R2', Item: 'Boarding (per night)' }, { Qty: '7', Amount: '315.00' }],
      ['add', 'shepherd-invoice-items.csv', { 'Invoice Number': 'B-202', Reservation: 'R2', Client: 'Tobias Achterberg', Patient: 'Juniper', Item: 'Medication admin', Qty: '1', Amount: '5.00' }],
      ['add', 'shepherd-invoice-items.csv', { 'Invoice Number': 'B-203', Reservation: 'R3', Client: 'Ines Mwangi', Patient: 'Mochi', Item: 'Grooming - full', Qty: '1', Amount: '75.00' }],
      ['add', 'shepherd-invoice-items.csv', { 'Invoice Number': 'B-204', Reservation: 'R4', Client: 'Felix Oduya', Patient: 'Pepper', Item: 'Exit bath', Qty: '1', Amount: '30.00' }],
    ],
    mutations: [
      { id: 'night-short', op: ['set', 'shepherd-invoice-items.csv', { Reservation: 'R1', Item: 'Boarding (per night)' }, { Qty: '3' }], expect: ['R1', 'nights_short'] },
      { id: 'addon-dropped', op: ['drop', 'shepherd-invoice-items.csv', { Reservation: 'R1', Item: 'Bath' }], expect: ['R1', 'addon_not_invoiced'] },
      { id: 'daycare-not-invoiced', op: ['drop', 'shepherd-invoice-items.csv', { Reservation: 'R5' }], expect: ['R5', 'not_invoiced'] },
    ],
  },

  'fairclinic-card-deposits': {
    key: (i) => (i.kind === 'batch' ? i.batch_id : `deposit ${i.date}`), fine: ['ok'],
    planted: { B103: ['amount_differs'], B104: ['chargeback', 'pms_differs'], B105: ['no_deposit', 'fees_high'], 'deposit 2026-11-09': ['deposit_unmatched'] },
    clean: [
      ['set', 'bank-lines.csv', { Description: 'MERCH DEP B103' }, { Amount: '4771.52' }],
      ['set', 'processor-batches.csv', { Batch: 'B104' }, { Chargebacks: '0', Net: '2893.58' }],
      ['set', 'bank-lines.csv', { Date: '2026-11-07', Amount: '2743.58' }, { Amount: '2893.58' }],
      ['set', 'pms-card-totals.csv', { Date: '2026-11-05' }, { 'Card Payments': '2980.00' }],
      ['set', 'processor-batches.csv', { Batch: 'B105' }, { Fees: '104.40', Net: '3495.60' }],
      ['set', 'bank-lines.csv', { Date: '2026-11-09' }, { Amount: '3495.60' }],
    ],
    mutations: [
      { id: 'deposit-short', op: ['set', 'bank-lines.csv', { Description: 'MERCH DEP B101' }, { Amount: '4070.20' }], expect: ['B101', 'amount_differs'] },
      { id: 'fees-high', op: ['set', 'processor-batches.csv', { Batch: 'B102' }, { Fees: '150.00' }], expect: ['B102', 'fees_high'] },
      { id: 'deposit-missing', op: ['drop', 'bank-lines.csv', { Description: 'MERCH DEP B101' }], expect: ['B101', 'no_deposit'] },
    ],
  },

  'fairclinic-claims-aging': {
    key: k('claim_id'), fine: ['waiting', 'closed'],
    planted: { C1002: ['follow_up'], C1004: ['filing_risk', 'follow_up'], C1005: ['unsent'], C1006: ['denied'], C1007: ['follow_up'], C1008: ['duplicate', 'follow_up'], C1009: ['secondary_not_sent'], C1012: ['filing_risk', 'follow_up'] },
    clean: [
      ['set', 'claims-outstanding.csv', { 'Claim ID': 'C1002' }, { 'Last Follow Up': '2026-11-10' }],
      ['set', 'claims-outstanding.csv', { 'Claim ID': 'C1004' }, { Paid: '248.00', Status: 'Received' }],
      ['set', 'claims-outstanding.csv', { 'Claim ID': 'C1005' }, { 'Date Sent': '2026-11-10', Status: 'Sent' }],
      ['set', 'claims-outstanding.csv', { 'Claim ID': 'C1006' }, { Paid: '1070.00', Status: 'Received' }],
      ['set', 'claims-outstanding.csv', { 'Claim ID': 'C1007' }, { 'Last Follow Up': '2026-11-10' }],
      ['drop', 'claims-outstanding.csv', { 'Claim ID': 'C1008' }],
      ['add', 'claims-outstanding.csv', { 'Claim ID': 'C1013', Patient: 'Lucia Fontaine', Carrier: 'Sample Mutual Dental', 'Claim Type': 'Secondary', Provider: 'Dr. Ben Sample', 'Date of Service': '2026-10-14', 'Date Sent': '2026-10-20', 'Claim Amount': '108.00', 'Est. Insurance': '108.00', Paid: '0', Status: 'Sent' }],
      ['set', 'claims-outstanding.csv', { 'Claim ID': 'C1012' }, { Paid: '380.00', Status: 'Received' }],
    ],
    mutations: [
      { id: 'denied', op: ['set', 'claims-outstanding.csv', { 'Claim ID': 'C1001' }, { Status: 'Denied' }], expect: ['C1001', 'denied'] },
      { id: 'follow-up-due', op: ['set', 'claims-outstanding.csv', { 'Claim ID': 'C1003' }, { 'Last Follow Up': '2026-10-01' }], expect: ['C1003', 'follow_up'] },
      { id: 'secondary-missing', op: ['drop', 'claims-outstanding.csv', { 'Claim ID': 'C1011' }], expect: ['C1010', 'secondary_not_sent'] },
    ],
  },

  'fairclinic-client-balances': {
    key: k('client_id'), fine: ['ok'],
    planted: { A101: ['collections_review'], A102: ['credit_balance'], A103: ['deposit_not_applied'], A104: ['no_statement'], A105: ['no_statement'], A107: ['small_balance'] },
    clean: [
      ['set', 'client-ar.csv', { 'Client ID': 'A101' }, { 'Last Payment': '2026-11-01' }],
      ['set', 'client-ar.csv', { 'Client ID': 'A102' }, { Balance: '0.00', Current: '0' }],
      ['set', 'client-ar.csv', { 'Client ID': 'A103' }, { Deposit: '0' }],
      ['set', 'client-ar.csv', { 'Client ID': 'A104' }, { 'Last Statement': '2026-11-05' }],
      ['set', 'client-ar.csv', { 'Client ID': 'A105' }, { 'Last Statement': '2026-11-05' }],
      ['set', 'client-ar.csv', { 'Client ID': 'A107' }, { Balance: '0.00', Current: '0' }],
    ],
    mutations: [
      { id: 'statement-old', op: ['set', 'client-ar.csv', { 'Client ID': 'A100' }, { 'Last Statement': '2026-09-01' }], expect: ['A100', 'no_statement'] },
      { id: 'deposit', op: ['set', 'client-ar.csv', { 'Client ID': 'A100' }, { Deposit: '100.00' }], expect: ['A100', 'deposit_not_applied'] },
      { id: 'credit', op: ['set', 'client-ar.csv', { 'Client ID': 'A100' }, { Balance: '-20.00' }], expect: ['A100', 'credit_balance'] },
    ],
  },

  'fairclinic-controlled-drugs': {
    key: (i) => (i.kind === 'drug' ? i.drug : `${i.drug} ${i.date}`), fine: ['ok'],
    planted: { 'Hydromorphone 2 mg/mL': ['count_mismatch'], 'Butorphanol 10 mg/mL': ['count_mismatch'], 'Hydromorphone 2 mg/mL 2026-11-09': ['balance_math'], 'Ketamine 100 mg/mL 2026-11-05': ['waste_no_witness'], 'Ketamine 100 mg/mL 2026-11-08': ['no_patient'], 'Butorphanol 10 mg/mL 2026-11-11': ['missing_initials'] },
    clean: [
      ['set', 'controlled-log.csv', { Date: '2026-11-09', Drug: 'Hydromorphone 2 mg/mL' }, { 'Running Balance': '18.2' }],
      ['set', 'controlled-log.csv', { Date: '2026-11-10', Drug: 'Hydromorphone 2 mg/mL' }, { 'Running Balance': '17.7' }],
      ['set', 'counts.csv', { Drug: 'Hydromorphone 2 mg/mL' }, { Counted: '17.7' }],
      ['set', 'controlled-log.csv', { Date: '2026-11-05', Drug: 'Ketamine 100 mg/mL' }, { Witness: 'CE' }],
      ['set', 'controlled-log.csv', { Date: '2026-11-08', Drug: 'Ketamine 100 mg/mL' }, { Patient: 'Biscuit', Client: 'Nadia Brennan' }],
      ['set', 'controlled-log.csv', { Date: '2026-11-11', Drug: 'Butorphanol 10 mg/mL' }, { Initials: 'TL' }],
      ['set', 'counts.csv', { Drug: 'Butorphanol 10 mg/mL' }, { Counted: '37.5' }],
    ],
    mutations: [
      { id: 'count-short', op: ['set', 'counts.csv', { Drug: 'Diazepam 5 mg/mL' }, { Counted: '13.0' }], expect: ['Diazepam 5 mg/mL', 'count_mismatch'] },
      { id: 'no-witness', op: ['set', 'controlled-log.csv', { Date: '2026-11-04', Drug: 'Hydromorphone 2 mg/mL' }, { Witness: '' }], expect: ['Hydromorphone 2 mg/mL 2026-11-04', 'waste_no_witness'] },
      { id: 'balance-math', op: ['set', 'controlled-log.csv', { Date: '2026-11-07', Drug: 'Diazepam 5 mg/mL' }, { 'Running Balance': '14.5' }], expect: ['Diazepam 5 mg/mL 2026-11-07', 'balance_math'] },
    ],
  },

  'fairclinic-credential-expiry': {
    key: k('holder', 'credential'), fine: ['ok', 'renewal_submitted'],
    planted: { 'Dr. Ben Sample State dental license': ['expired'], 'Dr. Ada Example DEA registration': ['expiring'], 'Dr. Ben Sample Malpractice insurance': ['expiring'], 'Dr. Ada Example State dental license': ['ce_short'], 'Bright Example Dental Radiation equipment registration': ['missing_expiry'] },
    clean: [
      ['set', 'credentials.csv', { Number: 'DL-0055502' }, { Expires: '2028-10-31' }],
      ['set', 'credentials.csv', { Number: 'XE0000001' }, { Expires: '2029-12-31' }],
      ['set', 'credentials.csv', { Number: 'PL-000123' }, { Expires: '2027-12-15' }],
      ['set', 'credentials.csv', { Number: 'DL-0055501' }, { 'CE Done': '30' }],
      ['set', 'credentials.csv', { Number: 'RX-0001' }, { Expires: '2027-09-30' }],
    ],
    mutations: [
      { id: 'expiring', op: ['set', 'credentials.csv', { Number: 'HL-0088001' }, { Expires: '2026-12-20' }], expect: ['Hana Test Dental hygiene license', 'expiring'] },
      { id: 'expired', op: ['set', 'credentials.csv', { Number: 'VL-0077101' }, { Expires: '2026-11-01' }], expect: ['Dr. Cora Example State veterinary license', 'expired'] },
      { id: 'no-expiry', op: ['set', 'credentials.csv', { Number: 'VL-0077101' }, { Expires: '' }], expect: ['Dr. Cora Example State veterinary license', 'missing_expiry'] },
    ],
  },

  'fairclinic-era-posting': {
    key: k('claim_id'), fine: ['ok'],
    planted: { C2002: ['writeoff_mismatch'], C2003: ['not_posted'], C2004: ['denial_written_off'], C2005: ['payment_mismatch'], C2006: ['reversal'], C2009: ['not_on_era'] },
    clean: [
      ['set', 'posted-payments.csv', { 'Claim ID': 'C2002' }, { 'Write-off Posted': '245.00' }],
      ['add', 'posted-payments.csv', { 'Claim ID': 'C2003', Patient: 'Kenji Abernathy', Carrier: 'Example Dental PPO', 'Check Number': 'EFT1101', 'Payment Posted': '76.80', 'Write-off Posted': '0.00', 'Posted Date': '2026-11-11', 'Posted By': 'Jo Front' }],
      // The denial and the reversal are taken out of the remittance itself (a person always works those).
      ['text', 'era-2026-11.835', 'CLP\\*C2004\\*4\\*540\\.00\\*0\\*0\\*', 'CLP*C2004*1*540.00*432.00*108.00*'],
      ['text', 'era-2026-11.835', 'SVC\\*AD:D2392\\*540\\.00\\*0\\*\\*1', 'SVC*AD:D2392*540.00*432.00**1'],
      ['text', 'era-2026-11.835', 'CAS\\*CO\\*29\\*540\\.00', 'CAS*PR*2*108.00'],
      ['text', 'era-2026-11.835', 'BPR\\*I\\*933\\.60\\*', 'BPR*I*1365.60*'],
      ['set', 'posted-payments.csv', { 'Claim ID': 'C2004' }, { 'Payment Posted': '432.00', 'Write-off Posted': '0.00' }],
      ['set', 'posted-payments.csv', { 'Claim ID': 'C2005' }, { 'Payment Posted': '625.00' }],
      ['text', 'era-2026-11.835', 'CLP\\*C2006\\*22\\*[^]*?CAS\\*CO\\*45\\*-62\\.00~\\s*', ''],
      ['text', 'era-2026-11.835', 'BPR\\*I\\*617\\.00\\*', 'BPR*I*865.00*'],
      ['text', 'era-2026-11.835', 'SE\\*24\\*0002', 'SE*20*0002'],
      ['drop', 'posted-payments.csv', { 'Claim ID': 'C2009' }],
    ],
    mutations: [
      { id: 'writeoff-short', op: ['set', 'posted-payments.csv', { 'Claim ID': 'C2001' }, { 'Write-off Posted': '80.00' }], expect: ['C2001', 'writeoff_mismatch'] },
      { id: 'payment-typo', op: ['set', 'posted-payments.csv', { 'Claim ID': 'C2007' }, { 'Payment Posted': '204.00' }], expect: ['C2007', 'payment_mismatch'] },
      { id: 'not-posted', op: ['drop', 'posted-payments.csv', { 'Claim ID': 'C2001' }], expect: ['C2001', 'not_posted'] },
      { id: 'provider-adjustment', op: ['text', 'era-2026-11.835', 'SE\\*20\\*0002', 'PLB*1999999984*20261231*WO:ICN2005*25.00~\nSE*21*0002'], expect: ['', 'provider_adjustment'] },
    ],
  },

  'fairclinic-estimate-variance': {
    key: k('estimate_id'), fine: ['ok', 'open'],
    planted: { E2: ['over_high'], E3: ['under_low'], E4: ['not_invoiced'], E5: ['invoiced_without_approval'] },
    clean: [
      ['set', 'invoices.csv', { Invoice: 'INV-302' }, { Total: '1450.00' }],
      ['set', 'invoices.csv', { Invoice: 'INV-303' }, { Total: '310.00' }],
      ['add', 'invoices.csv', { Invoice: 'INV-304', Estimate: 'E4', Total: '900.00' }],
      ['set', 'estimates.csv', { Estimate: 'E5' }, { Approved: 'Yes' }],
    ],
    mutations: [
      { id: 'over', op: ['set', 'invoices.csv', { Invoice: 'INV-301' }, { Total: '650.00' }], expect: ['E1', 'over_high'] },
      { id: 'under', op: ['set', 'invoices.csv', { Invoice: 'INV-306' }, { Total: '400.00' }], expect: ['E6', 'under_low'] },
      { id: 'not-approved', op: ['set', 'estimates.csv', { Estimate: 'E1' }, { Approved: 'No' }], expect: ['E1', 'invoiced_without_approval'] },
    ],
  },

  'fairclinic-hygiene-production': {
    key: k('hygienist'), fine: ['ok'],
    planted: { 'Iris Demo': ['below_target', 'open_time'], 'Jo Temp': ['no_hours'] },
    clean: [
      ['set', 'hygiene-hours.csv', { Hygienist: 'Iris Demo', Date: '2026-11-02' }, { 'Open Hours': '0.5' }],
      ['set', 'hygiene-hours.csv', { Hygienist: 'Iris Demo', Date: '2026-11-03' }, { 'Open Hours': '1' }],
      ['set', 'hygiene-hours.csv', { Hygienist: 'Iris Demo', Date: '2026-11-04' }, { 'Open Hours': '0' }],
      ['set', 'hygiene-procedures.csv', { Hygienist: 'Iris Demo', Code: 'D1110' }, { Qty: '6' }],
      ['set', 'hygiene-procedures.csv', { Hygienist: 'Iris Demo', Code: 'D4910' }, { Qty: '4' }],
      ['set', 'hygiene-procedures.csv', { Hygienist: 'Jo Temp', Date: '2026-11-06' }, { Date: '2026-11-05' }],
    ],
    mutations: [
      { id: 'open-time', op: ['set', 'hygiene-hours.csv', { Hygienist: 'Hana Test', Date: '2026-11-02' }, { 'Open Hours': '4.5' }], expect: ['Hana Test', 'open_time'] },
      { id: 'no-hours', op: ['drop', 'hygiene-hours.csv', { Hygienist: 'Hana Test', Date: '2026-11-04' }], expect: ['Hana Test', 'no_hours'] },
      { id: 'below-target', op: ['set', 'hygiene-procedures.csv', { Hygienist: 'Hana Test', Code: 'D4341' }, { Qty: '0' }], expect: ['Hana Test', 'below_target'] },
    ],
  },

  'fairclinic-inventory-expiry': {
    key: (i) => `${i.kind} ${i.item}`, fine: ['ok'],
    planted: { 'lot Cefovecin 80 mg/mL 10 mL': ['expired'], 'lot Carprofen 75 mg tabs': ['expiring'], 'lot Maropitant 10 mg/mL 20 mL': ['expiring'], 'lot Ear cleanser 4 oz': ['no_expiry_date'], 'count Gabapentin 100 mg caps': ['shrink'], 'count Maropitant 10 mg/mL 20 mL': ['shrink'], 'count Ear cleanser 4 oz': ['overage'] },
    clean: [
      ['set', 'stock-on-hand.csv', { 'Lot Number': 'LOT-A1' }, { 'Expiration Date': '2027-10-31' }],
      ['set', 'stock-on-hand.csv', { 'Lot Number': 'LOT-C7' }, { 'Expiration Date': '2027-12-20' }],
      ['set', 'stock-on-hand.csv', { 'Lot Number': 'LOT-M2' }, { 'Expiration Date': '2027-06-05', 'Quantity On Hand': '4' }],
      ['set', 'stock-on-hand.csv', { 'Item Name': 'Ear cleanser 4 oz' }, { 'Lot Number': 'LOT-E1', 'Expiration Date': '2027-08-31', 'Quantity On Hand': '22' }],
      ['set', 'stock-on-hand.csv', { 'Lot Number': 'LOT-G5' }, { 'Quantity On Hand': '520' }],
      ['set', 'count-sheet.csv', { Item: 'Gabapentin 100 mg caps' }, { Counted: '520' }],
      ['set', 'count-sheet.csv', { Item: 'Maropitant 10 mg/mL 20 mL' }, { Counted: '4' }],
      ['set', 'count-sheet.csv', { Item: 'Ear cleanser 4 oz' }, { Counted: '22' }],
    ],
    mutations: [
      { id: 'expiring', op: ['set', 'stock-on-hand.csv', { 'Lot Number': 'LOT-R3' }, { 'Expiration Date': '2026-12-01' }], expect: ['lot Rabies vaccine 1 year', 'expiring'] },
      { id: 'expired', op: ['set', 'stock-on-hand.csv', { 'Lot Number': 'LOT-C7' }, { 'Expiration Date': '2026-11-01' }], expect: ['lot Carprofen 75 mg tabs', 'expired'] },
      { id: 'shrink', op: ['set', 'count-sheet.csv', { Item: 'Rabies vaccine 1 year' }, { Counted: '38' }], expect: ['count Rabies vaccine 1 year', 'shrink'] },
    ],
  },

  'fairclinic-lab-cases': {
    key: (i) => (i.kind === 'case' ? i.case_id : `invoice ${i.invoice_number}`), fine: ['ok'],
    planted: { L502: ['not_back_for_seat', 'overdue_from_lab'], L503: ['overdue_from_lab'], L504: ['seated_not_billed', 'late_return'], L505: ['no_invoice'], 'invoice INV-9002': ['duplicate_invoice'], 'invoice INV-9003': ['invoice_no_case'], 'invoice INV-9004': ['remake_charged'], 'invoice INV-7710': ['case_not_returned'] },
    clean: [
      ['set', 'lab-cases.csv', { Case: 'L502' }, { Returned: '2026-11-14' }],
      ['set', 'lab-cases.csv', { Case: 'L503' }, { Due: '2026-11-20' }],
      ['drop', 'lab-invoices.csv', { Invoice: 'INV-7710' }],
      ['set', 'lab-cases.csv', { Case: 'L504' }, { Returned: '2026-10-23', Billed: 'Yes' }],
      ['add', 'lab-invoices.csv', { Invoice: 'INV-9005', Lab: 'Example Crown Lab', Case: 'L505', Date: '2026-10-06', Amount: '285.00', Remake: 'No' }],
      ['dropLast', 'lab-invoices.csv', { Invoice: 'INV-9002' }],
      ['drop', 'lab-invoices.csv', { Invoice: 'INV-9003' }],
      ['drop', 'lab-invoices.csv', { Invoice: 'INV-9004' }],
    ],
    mutations: [
      { id: 'overdue', op: ['set', 'lab-cases.csv', { Case: 'L507' }, { Due: '2026-11-10' }], expect: ['L507', 'overdue_from_lab'] },
      { id: 'not-billed', op: ['set', 'lab-cases.csv', { Case: 'L501' }, { Billed: 'No' }], expect: ['L501', 'seated_not_billed'] },
      { id: 'remake', op: ['set', 'lab-invoices.csv', { Invoice: 'INV-9001' }, { Remake: 'Yes' }], expect: ['invoice INV-9001', 'remake_charged'] },
    ],
  },

  'fairclinic-membership-plans': {
    key: k('patient_name'), fine: ['ok'],
    planted: { 'Marisol Quintero': ['missed_payment'], 'Theo Vasquez-Lind': ['failed_not_retried'], 'Priya Halvorsen': ['wrong_amount'], 'Dmitri Okonkwo': ['billed_after_cancel'], 'Saoirse Delacroix': ['renewal_due'], 'Kenji Abernathy': ['used_after_lapse', 'annual_lapsed'], 'Omar Brightwater': ['used_after_lapse'], 'Greta Lindqvist': ['not_in_roster'] },
    clean: [
      ['add', 'payments-2026-10.csv', { Customer: 'Marisol Quintero', Date: '2026-10-10', Amount: '29.00', Status: 'Succeeded' }],
      ['set', 'payments-2026-10.csv', { Customer: 'Theo Vasquez-Lind' }, { Status: 'Succeeded' }],
      ['set', 'payments-2026-10.csv', { Customer: 'Priya Halvorsen' }, { Amount: '29.00' }],
      ['drop', 'payments-2026-10.csv', { Customer: 'Dmitri Okonkwo' }],
      ['set', 'members.csv', { Member: 'Saoirse Delacroix' }, { 'Renewal Date': '2027-11-25' }],
      ['set', 'members.csv', { Member: 'Kenji Abernathy' }, { 'Renewal Date': '2027-10-05' }],
      ['drop', 'visits.csv', { Patient: 'Omar Brightwater' }],
      ['drop', 'payments-2026-10.csv', { Customer: 'Greta Lindqvist' }],
    ],
    mutations: [
      { id: 'wrong-amount', op: ['set', 'payments-2026-10.csv', { Customer: 'Rowan Achebe', Date: '2026-10-15' }, { Amount: '19.00' }], expect: ['Rowan Achebe', 'wrong_amount'] },
      { id: 'failed', op: ['set', 'payments-2026-10.csv', { Customer: 'Rowan Achebe', Date: '2026-10-15' }, { Status: 'Failed' }], expect: ['Rowan Achebe', 'failed_not_retried'] },
      { id: 'missed', op: ['drop', 'payments-2026-10.csv', { Customer: 'Rowan Achebe', Date: '2026-10-15' }], expect: ['Rowan Achebe', 'missed_payment'] },
    ],
  },

  'fairclinic-missed-charges': {
    key: k('visit_id', 'item'), fine: ['ok'],
    planted: { 'V1001 Ear cytology': ['not_invoiced'], 'V1002 IV fluids (per day)': ['qty_short'], 'V1002 CBC in-house': ['not_invoiced'], 'V1003 Nail trim': ['no_charge'], 'V1005 Heartworm test': ['invoiced_not_recorded'] },
    clean: [
      ['add', 'ezyvet-invoice-lines.csv', { 'Invoice #': 'INV-1', 'Consult ID': 'V1001', 'Animal Name': 'Biscuit', 'Invoice Date': '2026-11-12', 'Product Name': 'Ear cytology', Qty: '1', 'Total (incl tax)': '45.00' }],
      ['set', 'ezyvet-invoice-lines.csv', { 'Consult ID': 'V1002', 'Product Name': 'IV fluids (per day)' }, { Qty: '2', 'Total (incl tax)': '170.00' }],
      ['add', 'ezyvet-invoice-lines.csv', { 'Invoice #': 'INV-2', 'Consult ID': 'V1002', 'Animal Name': 'Juniper', 'Invoice Date': '2026-11-12', 'Product Name': 'CBC in-house', Qty: '1', 'Total (incl tax)': '110.00' }],
      ['set', 'ezyvet-invoice-lines.csv', { 'Consult ID': 'V1003', 'Product Name': 'Nail trim' }, { 'Total (incl tax)': '22.00', Note: '' }],
      ['add', 'treatment-sheet.csv', { Visit: 'V1005', Patient: 'Ziggy', Client: 'Clara Benedetti', Date: '2026-11-13', Item: 'Heartworm test', Qty: '1', Staff: 'Tech Moss' }],
    ],
    mutations: [
      { id: 'not-invoiced', op: ['drop', 'ezyvet-invoice-lines.csv', { 'Consult ID': 'V1004', 'Product Name': 'Dental radiographs' }], expect: ['V1004 Dental radiographs', 'not_invoiced'] },
      { id: 'qty-short', op: ['set', 'ezyvet-invoice-lines.csv', { 'Consult ID': 'V1004', 'Product Name': 'Anesthesia (per 30 min)' }, { Qty: '2' }], expect: ['V1004 Anesthesia (per 30 min)', 'qty_short'] },
      { id: 'no-charge', op: ['set', 'ezyvet-invoice-lines.csv', { 'Consult ID': 'V1001', 'Product Name': 'Exam - comprehensive' }, { 'Total (incl tax)': '0.00' }], expect: ['V1001 Exam - comprehensive', 'no_charge'] },
    ],
  },

  'fairclinic-no-shows': {
    key: k('appointment_id'), fine: ['ok'],
    planted: { A2: ['no_show_not_rebooked', 'fee_not_charged'], A3: ['repeat_no_show', 'fee_not_charged'], A4: ['late_cancel_not_rebooked'], A10: ['no_show_not_rebooked', 'fee_not_charged'] },
    clean: [
      ['set', 'appointments.csv', { Appointment: 'A2' }, { Status: 'Completed', 'Fee Charged': '' }],
      ['set', 'appointments.csv', { Appointment: 'A3' }, { 'Fee Charged': '25.00' }],
      ['set', 'appointments.csv', { Appointment: 'A4' }, { Rebooked: '2026-11-20' }],
      ['set', 'appointments.csv', { Appointment: 'A10' }, { Rebooked: '2026-11-24', 'Fee Charged': '25.00' }],
    ],
    mutations: [
      { id: 'no-show', op: ['set', 'appointments.csv', { Appointment: 'A1' }, { Status: 'No-show' }], expect: ['A1', 'no_show_not_rebooked'] },
      { id: 'late-cancel', op: ['set', 'appointments.csv', { Appointment: 'A8' }, { Rebooked: '' }], expect: ['A8', 'late_cancel_not_rebooked'] },
      { id: 'no-fee', op: ['set', 'appointments.csv', { Appointment: 'A6' }, { 'Fee Charged': '0' }], expect: ['A6', 'fee_not_charged'] },
    ],
  },

  'fairclinic-patient-balances': {
    key: k('account_number'), fine: ['ok', 'insurance_pending', 'payment_plan'],
    planted: { G1002: ['collections_review'], G1003: ['credit_balance'], G1005: ['no_statement'], G1006: ['plan_missed'], G1007: ['small_balance'], G1009: ['no_statement'] },
    clean: [
      ['set', 'ar-by-guarantor.csv', { Account: 'G1002' }, { 'Last Payment': '2026-11-01' }],
      ['set', 'ar-by-guarantor.csv', { Account: 'G1003' }, { Balance: '0.00', '0-30': '0' }],
      ['set', 'ar-by-guarantor.csv', { Account: 'G1005' }, { 'Last Statement': '2026-11-05' }],
      ['set', 'ar-by-guarantor.csv', { Account: 'G1006' }, { 'Last Payment': '2026-11-01' }],
      ['set', 'ar-by-guarantor.csv', { Account: 'G1007' }, { Balance: '0.00', '0-30': '0' }],
      ['set', 'ar-by-guarantor.csv', { Account: 'G1009' }, { 'Last Statement': '2026-11-05' }],
    ],
    mutations: [
      { id: 'statement-old', op: ['set', 'ar-by-guarantor.csv', { Account: 'G1001' }, { 'Last Statement': '2026-09-01' }], expect: ['G1001', 'no_statement'] },
      { id: 'plan-missed', op: ['set', 'ar-by-guarantor.csv', { Account: 'G1008' }, { 'Last Payment': '2026-09-01' }], expect: ['G1008', 'plan_missed'] },
      { id: 'credit', op: ['set', 'ar-by-guarantor.csv', { Account: 'G1010' }, { Balance: '-75.00' }], expect: ['G1010', 'credit_balance'] },
    ],
  },

  'fairclinic-payroll-production': {
    key: (i) => (i.kind === 'period' ? `period ${i.period_start}` : `${i.employee} ${i.period_start}`), fine: ['ok'],
    planted: { 'period 2026-10-16': ['payroll_pct_high'], 'Lee Tech 2026-10-16': ['overtime'], 'period 2026-11-01': ['no_revenue'] },
    clean: [
      ['set', 'collections-by-period.csv', { 'Period Start': '2026-10-16' }, { Collections: '42000.00' }],
      ['set', 'payroll-register.csv', { Employee: 'Lee Tech', 'Period Start': '2026-10-16' }, { 'Overtime Hours': '6' }],
      ['add', 'collections-by-period.csv', { 'Period Start': '2026-11-01', Collections: '36000.00', Production: '41000.00' }],
    ],
    mutations: [
      { id: 'payroll-high', op: ['set', 'collections-by-period.csv', { 'Period Start': '2026-10-01' }, { Collections: '30000.00' }], expect: ['period 2026-10-01', 'payroll_pct_high'] },
      { id: 'overtime', op: ['set', 'payroll-register.csv', { Employee: 'Kim Desk', 'Period Start': '2026-10-01' }, { 'Overtime Hours': '10' }], expect: ['Kim Desk 2026-10-01', 'overtime'] },
      { id: 'no-revenue', op: ['drop', 'collections-by-period.csv', { 'Period Start': '2026-10-01' }], expect: ['period 2026-10-01', 'no_revenue'] },
    ],
  },

  'fairclinic-pet-insurance-claims': {
    key: k('claim_id'), fine: ['paid', 'pending'],
    planted: { PC2: ['no_response'], PC3: ['info_requested'], PC4: ['direct_pay_balance'], PC5: ['denied'], PC6: ['not_submitted'] },
    clean: [
      ['set', 'pet-claims.csv', { Claim: 'PC2' }, { Status: 'Paid', Paid: '1500.00', 'Paid Date': '2026-11-10' }],
      ['set', 'pet-claims.csv', { Claim: 'PC3' }, { Status: 'In review' }],
      ['set', 'pet-claims.csv', { Claim: 'PC4' }, { Paid: '950.00' }],
      ['set', 'pet-claims.csv', { Claim: 'PC5' }, { Status: 'Paid', Paid: '144.00', 'Paid Date': '2026-11-14' }],
      ['set', 'pet-claims.csv', { Claim: 'PC6' }, { Submitted: '2026-11-03', Status: 'In review' }],
    ],
    mutations: [
      { id: 'denied', op: ['set', 'pet-claims.csv', { Claim: 'PC1' }, { Status: 'Denied' }], expect: ['PC1', 'denied'] },
      { id: 'direct-short', op: ['set', 'pet-claims.csv', { Claim: 'PC1' }, { 'Direct Pay': 'Yes' }], expect: ['PC1', 'direct_pay_balance'] },
      { id: 'no-response', op: ['set', 'pet-claims.csv', { Claim: 'PC7' }, { Submitted: '2026-10-12' }], expect: ['PC7', 'no_response'] },
    ],
  },

  'fairclinic-pharmacy-margins': {
    key: k('item'), fine: ['ok'],
    planted: { 'Heartworm chewable 6-pack': ['below_cost'], 'Maropitant 16 mg tab': ['cost_rise_not_passed', 'low_margin'], 'Gabapentin 100 mg cap': ['low_margin'], 'Amoxicillin-clavulanate 250 mg tab': ['no_dispensing_fee'] },
    clean: [
      ['set', 'pharmacy-prices.csv', { Item: 'Heartworm chewable 6-pack' }, { Price: '90.00', 'Previous Price': '90.00' }],
      ['set', 'pharmacy-prices.csv', { Item: 'Maropitant 16 mg tab' }, { Price: '18.00' }],
      ['set', 'pharmacy-prices.csv', { Item: 'Gabapentin 100 mg cap' }, { Price: '0.22' }],
      ['set', 'pharmacy-prices.csv', { Item: 'Amoxicillin-clavulanate 250 mg tab' }, { 'Dispensing Fee': '12.00' }],
    ],
    mutations: [
      { id: 'below-cost', op: ['set', 'pharmacy-prices.csv', { Item: 'Carprofen 75 mg tab' }, { Price: '0.40' }], expect: ['Carprofen 75 mg tab', 'below_cost'] },
      { id: 'cost-rise', op: ['set', 'pharmacy-prices.csv', { Item: 'Prednisone 5 mg tab' }, { Cost: '0.06' }], expect: ['Prednisone 5 mg tab', 'cost_rise_not_passed'] },
      { id: 'no-fee', op: ['set', 'pharmacy-prices.csv', { Item: 'Carprofen 75 mg tab' }, { 'Dispensing Fee': '' }], expect: ['Carprofen 75 mg tab', 'no_dispensing_fee'] },
    ],
  },

  'fairclinic-ppo-fees': {
    key: k('plan', 'code'), fine: ['ok', 'not_offered'],
    planted: { 'Example Dental PPO D2740': ['paid_below_schedule'], 'Example Dental PPO D9110': ['no_office_fee'], 'Sample Mutual Dental D1110': ['fee_below_allowed'], 'Sample Mutual Dental D2740': ['deep_discount'], 'Sample Mutual Dental D2950': ['not_in_schedule'] },
    clean: [
      ['set', 'allowed-paid.csv', { Plan: 'Example Dental PPO', Code: 'D2740' }, { Allowed: '790.00' }],
      ['add', 'office-fees.csv', { Code: 'D9110', Description: 'Palliative treatment of dental pain', 'Office Fee': '95.00' }],
      ['set', 'office-fees.csv', { Code: 'D1110' }, { 'Office Fee': '130.00' }],
      ['set', 'allowed-paid.csv', { Plan: 'Sample Mutual Dental', Code: 'D1110' }, { Allowed: '128.00' }],
      ['set', 'ppo-schedules.csv', { Plan: 'Sample Mutual Dental', Code: 'D2740' }, { Allowed: '700.00' }],
      ['set', 'allowed-paid.csv', { Plan: 'Sample Mutual Dental', Code: 'D2740' }, { Allowed: '700.00' }],
      ['add', 'ppo-schedules.csv', { Plan: 'Sample Mutual Dental', Code: 'D2950', Allowed: '220.00' }],
    ],
    mutations: [
      { id: 'paid-below', op: ['set', 'allowed-paid.csv', { Plan: 'Example Dental PPO', Code: 'D2391' }, { Allowed: '150.00' }], expect: ['Example Dental PPO D2391', 'paid_below_schedule'] },
      { id: 'deep-discount', op: ['set', 'ppo-schedules.csv', { Plan: 'Example Dental PPO', Code: 'D0120' }, { Allowed: '30.00' }], expect: ['Example Dental PPO D0120', 'deep_discount'] },
      { id: 'no-office-fee', op: ['drop', 'office-fees.csv', { Code: 'D2391' }], expect: ['Example Dental PPO D2391', 'no_office_fee'] },
    ],
  },

  'fairclinic-ppo-writeoffs': {
    key: k('date', 'patient_name'), fine: ['ok'],
    planted: { '2026-11-04 Dmitri Okonkwo': ['out_of_network'], '2026-11-05 Lucia Fontaine': ['no_reason'], '2026-11-07 Saoirse Delacroix': ['duplicate', 'large', 'large'], '2026-11-09 Omar Brightwater': ['no_carrier'] },
    clean: [
      ['drop', 'adjustments.csv', { Patient: 'Dmitri Okonkwo' }],
      ['set', 'adjustments.csv', { Patient: 'Lucia Fontaine' }, { Note: 'Long-time patient courtesy' }],
      ['dropLast', 'adjustments.csv', { Patient: 'Saoirse Delacroix' }],
      ['set', 'adjustments.csv', { Patient: 'Saoirse Delacroix' }, { Amount: '420.00' }],
      ['set', 'adjustments.csv', { Patient: 'Omar Brightwater' }, { Carrier: 'Example Dental PPO' }],
    ],
    mutations: [
      { id: 'no-reason', op: ['set', 'adjustments.csv', { Patient: 'Kenji Abernathy' }, { Note: '' }], expect: ['2026-11-06 Kenji Abernathy', 'no_reason'] },
      { id: 'out-of-network', op: ['set', 'adjustments.csv', { Patient: 'Rowan Achebe' }, { Carrier: 'Northway Dental Indemnity' }], expect: ['2026-11-02 Rowan Achebe', 'out_of_network'] },
      { id: 'duplicate', op: ['add', 'adjustments.csv', { Date: '2026-11-03', Patient: 'Marisol Quintero', 'Adjustment Type': 'PPO Write-off', Carrier: 'Sample Mutual Dental', Amount: '250.00', 'Entered By': 'Sam Billing', Note: '' }], expect: ['2026-11-03 Marisol Quintero', 'duplicate'] },
    ],
  },

  'fairclinic-preauthorizations': {
    key: k('preauth_id'), fine: ['ok', 'pending'],
    planted: { P302: ['no_response'], P303: ['expiring', 'approved_unscheduled'], P304: ['expired'], P305: ['scheduled_after_expiry', 'reduced'], P306: ['denied'], P307: ['not_sent'], P309: ['approved_unscheduled'], P311: ['done_after_expiry'] },
    clean: [
      ['set', 'preauths.csv', { 'Pre-auth #': 'P302' }, { Status: 'Approved', 'Response Date': '2026-10-20', 'Approved Amount': '625.00', 'Valid Until': '2027-04-20', Scheduled: '2026-12-10' }],
      ['set', 'preauths.csv', { 'Pre-auth #': 'P303' }, { Scheduled: '2026-11-25' }],
      ['set', 'preauths.csv', { 'Pre-auth #': 'P304' }, { Completed: '2026-09-15' }],
      ['set', 'preauths.csv', { 'Pre-auth #': 'P305' }, { 'Approved Amount': '550.00', Scheduled: '2027-02-10' }],
      ['set', 'preauths.csv', { 'Pre-auth #': 'P306' }, { Status: 'Approved', 'Approved Amount': '260.00', 'Valid Until': '2027-03-28', Scheduled: '2026-12-15' }],
      ['set', 'preauths.csv', { 'Pre-auth #': 'P307' }, { 'Date Sent': '2026-11-03', Status: 'Sent' }],
      ['set', 'preauths.csv', { 'Pre-auth #': 'P309' }, { Scheduled: '2026-12-20' }],
      ['set', 'preauths.csv', { 'Pre-auth #': 'P311' }, { Completed: '2026-07-15' }],
    ],
    mutations: [
      { id: 'unscheduled', op: ['set', 'preauths.csv', { 'Pre-auth #': 'P301' }, { Scheduled: '' }], expect: ['P301', 'approved_unscheduled'] },
      { id: 'no-response', op: ['set', 'preauths.csv', { 'Pre-auth #': 'P308' }, { 'Date Sent': '2026-10-01' }], expect: ['P308', 'no_response'] },
      { id: 'reduced', op: ['set', 'preauths.csv', { 'Pre-auth #': 'P301' }, { 'Approved Amount': '400.00' }], expect: ['P301', 'reduced'] },
    ],
  },

  'fairclinic-provider-production': {
    key: k('provider', 'month'), fine: ['ok'],
    planted: { 'Dr. Ben Sample 2026-08': ['low_collections'], 'Dr. Ben Sample 2026-09': ['high_adjustments'], 'Dr. Ben Sample 2026-10': ['production_drop'], 'Hana Test RDH 2026-09': ['missing_month'] },
    clean: [
      ['set', 'production-by-provider.csv', { Provider: 'Dr. Ben Sample', Month: '2026-08' }, { Collections: '35100.00' }],
      ['set', 'production-by-provider.csv', { Provider: 'Dr. Ben Sample', Month: '2026-09' }, { Adjustments: '12000.00', Collections: '34500.00' }],
      ['set', 'production-by-provider.csv', { Provider: 'Dr. Ben Sample', Month: '2026-10' }, { 'Gross Production': '47000.00', Adjustments: '11900.00', Collections: '34800.00' }],
      ['add', 'production-by-provider.csv', { Provider: 'Hana Test RDH', Month: '2026-09', 'Gross Production': '14100.00', Adjustments: '3450.00', Collections: '10500.00' }],
    ],
    mutations: [
      { id: 'low-collections', op: ['set', 'production-by-provider.csv', { Provider: 'Iris Demo RDH', Month: '2026-09' }, { Collections: '9000.00' }], expect: ['Iris Demo RDH 2026-09', 'low_collections'] },
      { id: 'drop', op: ['set', 'production-by-provider.csv', { Provider: 'Dr. Ada Example', Month: '2026-10' }, { 'Gross Production': '40000.00' }], expect: ['Dr. Ada Example 2026-10', 'production_drop'] },
      { id: 'missing-month', op: ['drop', 'production-by-provider.csv', { Provider: 'Iris Demo RDH', Month: '2026-08' }], expect: ['Iris Demo RDH 2026-08', 'missing_month'] },
    ],
  },

  'fairclinic-recall-gaps': {
    key: k('patient_name'), fine: ['scheduled', 'not_due', 'inactive', 'contacted'],
    planted: { 'Saoirse Delacroix': ['missed_appointment'], 'Theo Vasquez-Lind': ['overdue'], 'Lucia Fontaine': ['overdue'], 'Priya Halvorsen': ['lapsed'], 'Dmitri Okonkwo': ['due_soon'] },
    clean: [
      ['set', 'recall.csv', { Patient: 'Saoirse Delacroix' }, { 'Next Appointment': '2026-11-24' }],
      ['set', 'recall.csv', { Patient: 'Theo Vasquez-Lind' }, { 'Next Appointment': '2026-11-20' }],
      ['set', 'recall.csv', { Patient: 'Lucia Fontaine' }, { 'Next Appointment': '2026-11-21' }],
      ['set', 'recall.csv', { Patient: 'Priya Halvorsen' }, { Status: 'Inactive' }],
      ['set', 'recall.csv', { Patient: 'Dmitri Okonkwo' }, { 'Next Appointment': '2026-11-28' }],
    ],
    mutations: [
      { id: 'due-soon', op: ['set', 'recall.csv', { Patient: 'Rowan Achebe' }, { 'Next Appointment': '' }], expect: ['Rowan Achebe', 'due_soon'] },
      { id: 'overdue', op: ['set', 'recall.csv', { Patient: 'Kenji Abernathy' }, { 'Due Date': '2026-10-01' }], expect: ['Kenji Abernathy', 'overdue'] },
      { id: 'missed', op: ['set', 'recall.csv', { Patient: 'Theo Vasquez-Lind' }, { 'Next Appointment': '2026-11-10' }], expect: ['Theo Vasquez-Lind', 'missed_appointment'] },
    ],
  },

  'fairclinic-reference-labs': {
    key: (i) => `${i.accession || 'charge'} ${i.patient_name}`, fine: ['ok'],
    planted: { 'A-9002 Juniper': ['not_charged'], 'A-9004 Pepper': ['charged_below_cost'], 'A-9003 Mochi': ['low_markup'], 'charge Olive': ['charged_not_sent'] },
    clean: [
      ['add', 'client-charges.csv', { Patient: 'Juniper', Client: 'Tobias Achterberg', Date: '2026-11-03', Item: 'Thyroid T4', Amount: '55.00' }],
      ['set', 'client-charges.csv', { Patient: 'Pepper', Item: 'Fecal PCR panel' }, { Amount: '120.00' }],
      ['set', 'client-charges.csv', { Patient: 'Mochi', Item: 'Urinalysis with culture' }, { Amount: '85.00' }],
      ['add', 'lab-invoice.csv', { Accession: 'A-9006', Date: '2026-11-10', Patient: 'Olive', Test: 'Lyme quantitative', 'Lab Cost': '30.00' }],
    ],
    mutations: [
      { id: 'low-markup', op: ['set', 'client-charges.csv', { Patient: 'Biscuit', Item: 'Senior chemistry panel' }, { Amount: '80.00' }], expect: ['A-9001 Biscuit', 'low_markup'] },
      { id: 'not-charged', op: ['drop', 'client-charges.csv', { Patient: 'Ziggy' }], expect: ['A-9005 Ziggy', 'not_charged'] },
      { id: 'below-cost', op: ['set', 'client-charges.csv', { Patient: 'Biscuit', Item: 'Senior chemistry panel' }, { Amount: '40.00' }], expect: ['A-9001 Biscuit', 'charged_below_cost'] },
    ],
  },

  'fairclinic-referral-tracking': {
    key: k('direction', 'patient_name'), fine: ['ok', 'waiting'],
    planted: { 'out Theo Vasquez-Lind': ['no_report'], 'out Kenji Abernathy': ['no_report'], 'in Greta Lindqvist': ['no_first_visit'], 'in Omar Brightwater': ['thank_you_not_sent'] },
    clean: [
      ['set', 'referrals-out.csv', { Patient: 'Theo Vasquez-Lind' }, { 'Report Received': '2026-10-25' }],
      ['set', 'referrals-out.csv', { Patient: 'Kenji Abernathy' }, { 'Report Received': '2026-09-20' }],
      ['set', 'referrals-in.csv', { Patient: 'Greta Lindqvist' }, { 'First Visit': '2026-10-08' }],
      ['set', 'referrals-in.csv', { Patient: 'Omar Brightwater' }, { Thanked: '2026-10-21' }],
    ],
    mutations: [
      { id: 'no-report', op: ['set', 'referrals-out.csv', { Patient: 'Rowan Achebe' }, { 'Report Received': '' }], expect: ['out Rowan Achebe', 'no_report'] },
      { id: 'not-thanked', op: ['set', 'referrals-in.csv', { Patient: 'Lucia Fontaine' }, { Thanked: '' }], expect: ['in Lucia Fontaine', 'thank_you_not_sent'] },
      { id: 'not-seen', op: ['set', 'referrals-in.csv', { Patient: 'Dmitri Okonkwo' }, { 'First Visit': '' }], expect: ['in Dmitri Okonkwo', 'no_first_visit'] },
    ],
  },

  'fairclinic-review-replies': {
    key: k('review_id'), fine: ['replied'],
    planted: { RV1: ['needs_reply'], RV2: ['low_rating_no_reply'], RV4: ['low_rating_no_reply'] },
    clean: [
      ['set', 'reviews.csv', { 'Review ID': 'RV1' }, { Replied: '2026-11-15' }],
      ['set', 'reviews.csv', { 'Review ID': 'RV2' }, { Replied: '2026-11-11' }],
      ['set', 'reviews.csv', { 'Review ID': 'RV4' }, { Replied: '2026-11-13' }],
    ],
    mutations: [
      { id: 'no-reply', op: ['set', 'reviews.csv', { 'Review ID': 'RV3' }, { Replied: '' }], expect: ['RV3', 'needs_reply'] },
      { id: 'low-no-reply', op: ['add', 'reviews.csv', { 'Review ID': 'RV6', Platform: 'Example Reviews', Date: '2026-11-15', Rating: '1', Reviewer: 'Mei Tanaka-Ross', Text: 'Nobody called me back.', Replied: '' }], expect: ['RV6', 'low_rating_no_reply'] },
    ],
  },

  'fairclinic-staff-discounts': {
    key: k('invoice_number'), fine: ['ok'],
    planted: { 'INV-405': ['self_approved', 'high_pct', 'no_reason'], 'INV-402': ['no_approver'], 'INV-403': ['staff_discount_non_staff'], 'INV-406': ['no_reason'] },
    clean: [
      ['set', 'discounts.csv', { Invoice: 'INV-405' }, { Amount: '120.00', 'Approved By': 'Dr. Cora Example', Reason: 'Hardship' }],
      ['set', 'discounts.csv', { Invoice: 'INV-402' }, { 'Approved By': 'Dr. Cora Example' }],
      ['set', 'discounts.csv', { Invoice: 'INV-403' }, { Type: 'Courtesy', Reason: 'Long-time client' }],
      ['set', 'discounts.csv', { Invoice: 'INV-406' }, { Reason: 'Late appointment' }],
    ],
    mutations: [
      { id: 'non-staff', op: ['set', 'discounts.csv', { Invoice: 'INV-404' }, { Client: 'Mei Tanaka-Ross' }], expect: ['INV-404', 'staff_discount_non_staff'] },
      { id: 'high-pct', op: ['set', 'discounts.csv', { Invoice: 'INV-402' }, { Amount: '200.00' }], expect: ['INV-402', 'high_pct'] },
      { id: 'no-reason', op: ['set', 'discounts.csv', { Invoice: 'INV-402' }, { Reason: '' }], expect: ['INV-402', 'no_reason'] },
    ],
  },

  'fairclinic-sterilization-logs': {
    key: (i) => `${i.sterilizer} ${i.ref || i.date}`, fine: [],
    planted: { 'Autoclave A 106': ['missing_entry'], 'Autoclave A 107-109': ['cycle_number_gap'], 'Autoclave A 110': ['failed_no_rerun'], 'Autoclave B 2026-11-12': ['spore_gap', 'positive_no_followup'] },
    clean: [
      ['set', 'cycle-log.csv', { Sterilizer: 'Autoclave A', Cycle: '106' }, { Initials: 'HT' }],
      ['add', 'cycle-log.csv', { Date: '2026-11-05', Sterilizer: 'Autoclave A', Cycle: '108', Result: 'Pass', Initials: 'ID' }],
      ['set', 'cycle-log.csv', { Sterilizer: 'Autoclave A', Cycle: '110' }, { Result: 'Pass' }],
      ['add', 'spore-tests.csv', { Date: '2026-11-06', Sterilizer: 'Autoclave B', Result: 'Negative' }],
      ['add', 'spore-tests.csv', { Date: '2026-11-13', Sterilizer: 'Autoclave B', Result: 'Negative' }],
    ],
    mutations: [
      { id: 'no-initials', op: ['set', 'cycle-log.csv', { Sterilizer: 'Autoclave A', Cycle: '112' }, { Initials: '' }], expect: ['Autoclave A 112', 'missing_entry'] },
      { id: 'failed', op: ['set', 'cycle-log.csv', { Sterilizer: 'Autoclave B', Cycle: '203' }, { Result: 'Fail' }], expect: ['Autoclave B 203', 'failed_no_rerun'] },
      { id: 'gap', op: ['drop', 'cycle-log.csv', { Sterilizer: 'Autoclave A', Cycle: '102' }], expect: ['Autoclave A 101-103', 'cycle_number_gap'] },
    ],
  },

  'fairclinic-supply-costs': {
    key: (i) => (i.kind === 'month' ? `month ${i.month}` : `line ${i.invoice_number} ${i.item}`), fine: ['ok'],
    planted: { 'month 2026-10': ['over_target', 'category_spike'], 'line ESD-1003 Composite A2 syringe': ['duplicate_line'], 'line ESD-1003 Nitrile gloves (box)': ['price_increase'] },
    clean: [
      ['dropLast', 'supply-invoices.csv', { Invoice: 'ESD-1003', Item: 'Composite A2 syringe' }],
      ['set', 'supply-invoices.csv', { Invoice: 'ESD-1003', Item: 'Nitrile gloves (box)' }, { 'Unit Price': '8.50', Amount: '850.00' }],
      ['set', 'supply-invoices.csv', { Invoice: 'SSC-503', Item: 'Implant healing abutment' }, { Qty: '1', Amount: '450.00' }],
    ],
    mutations: [
      { id: 'price-increase', op: ['set', 'supply-invoices.csv', { Invoice: 'SSC-503', Item: 'Prophy paste' }, { 'Unit Price': '27.00' }], expect: ['line SSC-503 Prophy paste', 'price_increase'] },
      { id: 'over-target', op: ['set', 'production-by-month.csv', { Month: '2026-08' }, { Production: '40000.00' }], expect: ['month 2026-08', 'over_target'] },
      { id: 'duplicate', op: ['add', 'supply-invoices.csv', { Supplier: 'Sample Supply Co', Invoice: 'SSC-502', Date: '2026-09-18', Item: 'Sterilization pouches', Category: 'Infection control', Qty: '40', 'Unit Price': '12.00', Amount: '480.00' }], expect: ['line SSC-502 Sterilization pouches', 'duplicate_line'] },
    ],
  },

  'fairclinic-unscheduled-treatment': {
    key: k('patient_name'), fine: ['scheduled', 'done', 'declined'],
    planted: { 'Rowan Achebe': ['benefits_expiring', 'accepted_unscheduled'], 'Marisol Quintero': ['proposed_unscheduled'], 'Priya Halvorsen': ['stale'], 'Lucia Fontaine': ['accepted_unscheduled'], 'Omar Brightwater': ['benefits_expiring', 'proposed_unscheduled'] },
    clean: [
      ['set', 'treatment-plans.csv', { Patient: 'Rowan Achebe' }, { Scheduled: '2026-12-03' }],
      ['set', 'treatment-plans.csv', { Patient: 'Marisol Quintero' }, { Scheduled: '2026-12-10' }],
      ['set', 'treatment-plans.csv', { Patient: 'Priya Halvorsen' }, { Scheduled: '2026-12-15' }],
      ['set', 'treatment-plans.csv', { Patient: 'Lucia Fontaine' }, { Scheduled: '2026-11-30' }],
      ['set', 'treatment-plans.csv', { Patient: 'Omar Brightwater' }, { Scheduled: '2026-12-08' }],
    ],
    mutations: [
      { id: 'accepted', op: ['set', 'treatment-plans.csv', { Patient: 'Kenji Abernathy' }, { Status: 'Accepted' }], expect: ['Kenji Abernathy', 'accepted_unscheduled'] },
      { id: 'proposed', op: ['set', 'treatment-plans.csv', { Patient: 'Dmitri Okonkwo' }, { Status: 'Proposed' }], expect: ['Dmitri Okonkwo', 'proposed_unscheduled'] },
      { id: 'benefits', op: ['set', 'treatment-plans.csv', { Patient: 'Greta Lindqvist' }, { Scheduled: '' }], expect: ['Greta Lindqvist', 'benefits_expiring'] },
    ],
  },

  'fairclinic-vaccine-reminders': {
    key: k('patient_name', 'reminder'), fine: ['overdue_reminded', 'reminded', 'booked', 'not_due', 'inactive'],
    planted: { 'Olive DHPP': ['sent_to_inactive'], 'Juniper FVRCP': ['overdue_no_contact'], 'Juniper Rabies 1 year': ['overdue_no_contact'], 'Ziggy Bordetella': ['no_contact_info'], 'Biscuit Rabies 3 year': ['due_soon_no_reminder'] },
    clean: [
      ['set', 'reminders.csv', { 'Patient Name': 'Olive' }, { 'Reminder Sent': '' }],
      ['set', 'reminders.csv', { 'Patient Name': 'Juniper', 'Reminder Description': 'FVRCP' }, { 'Reminder Sent': '2026-11-10' }],
      ['set', 'reminders.csv', { 'Patient Name': 'Juniper', 'Reminder Description': 'Rabies 1 year' }, { 'Reminder Sent': '2026-11-10' }],
      ['set', 'reminders.csv', { 'Patient Name': 'Ziggy' }, { Email: 'clara.b@example.test', 'Reminder Sent': '2026-11-10' }],
      ['set', 'reminders.csv', { 'Patient Name': 'Biscuit', 'Reminder Description': 'Rabies 3 year' }, { 'Reminder Sent': '2026-11-01' }],
    ],
    mutations: [
      { id: 'due-soon', op: ['set', 'reminders.csv', { 'Patient Name': 'Noodle' }, { 'Due Date': '2026-12-01' }], expect: ['Noodle FeLV', 'due_soon_no_reminder'] },
      { id: 'deceased', op: ['set', 'reminders.csv', { 'Patient Name': 'Biscuit', 'Reminder Description': 'DHPP' }, { 'Patient Status': 'Deceased' }], expect: ['Biscuit DHPP', 'sent_to_inactive'] },
      { id: 'overdue', op: ['set', 'reminders.csv', { 'Patient Name': 'Pepper' }, { 'Next Appointment': '' }], expect: ['Pepper Leptospirosis', 'overdue_no_contact'] },
    ],
  },

  'fairclinic-wellness-plans': {
    key: k('client_name'), fine: ['ok'],
    planted: { 'Tobias Achterberg': ['failed_not_retried'], 'Clara Benedetti': ['wrong_amount'], 'Ines Mwangi': ['over_used'], 'Felix Oduya': ['early_cancel_balance'] },
    clean: [
      ['set', 'payments-2026-10.csv', { Customer: 'Tobias Achterberg' }, { Status: 'Succeeded' }],
      ['set', 'payments-2026-10.csv', { Customer: 'Clara Benedetti' }, { Amount: '35.00' }],
      ['drop', 'plan-usage.csv', { Patient: 'Mochi', Date: '2026-09-02' }],
      ['drop', 'plan-usage.csv', { Patient: 'Pepper', Service: 'Bloodwork' }],
      ['drop', 'plan-usage.csv', { Patient: 'Pepper', Date: '2026-09-01' }],
    ],
    mutations: [
      { id: 'wrong-amount', op: ['set', 'payments-2026-10.csv', { Customer: 'Nadia Brennan' }, { Amount: '29.00' }], expect: ['Nadia Brennan', 'wrong_amount'] },
      { id: 'over-used', op: ['set', 'plan-usage.csv', { Patient: 'Biscuit', Date: '2026-07-12', Service: 'Exam' }, { Qty: '3' }], expect: ['Nadia Brennan', 'over_used'] },
      { id: 'missed', op: ['drop', 'payments-2026-10.csv', { Customer: 'Nadia Brennan' }], expect: ['Nadia Brennan', 'missed_payment'] },
    ],
  },
};
