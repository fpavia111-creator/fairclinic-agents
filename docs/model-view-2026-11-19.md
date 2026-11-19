# What reaches the AI model (2026-11-19)

Made by `node scripts/model-view.mjs` (`npm run model-view`): each check is run on its fictional fixtures with masking on (the default) and the result the assistant's model receives is read field by field.

**Masked** (replaced before the result leaves the agent): patient, pet, client, owner, guarantor and reviewer names (`PT-` pseudonyms), account and client numbers (`ACCT-`), member and subscriber ids (`MBR-`), chart and pet ids (`MRN-`), birth dates, street addresses, phone numbers and e-mail addresses. The same value always gives the same pseudonym, so the model can still group by it; the report and draft files on your machine keep the real values. Credential numbers show their last four characters only.

**Sent in clear:** amounts, quantities, dates (including service dates), rates, procedure and drug names, CDT codes, claim, invoice, case and appointment numbers, carrier, insurer, lab and supplier names, finding codes, and the text columns listed per agent below. Staff and provider names (dentists, hygienists, technicians, the person who entered or approved an adjustment) are sent in clear: the worklists name who did what. Free-text columns (review text, adjustment notes, discount reasons) are sent as typed.

**Free text, checked on 2026-11-19:** a review whose text says "Juniper Vance here: Dr. Ada Stranger rushed my dog Waffles", written by the reviewer Juniper Vance, reached the model with the reviewer's name replaced by a pseudonym (it is in a masked column of the same file), and with "Ada Stranger" as typed and the pet name "Waffles" as typed (they are in no masked column). Masking works on known column names and the values registered from them; it is not de-identification.

**Canary check:** every agent with patient, pet or client data lists its fictional names in `fixtures/phi-canaries.json`; 0 of 225 values reached any result.

The result goes to whatever model the user's assistant uses. Dental files are protected health information: use a model provider covered by a business associate agreement, or a local model. No compliance claim is made.

| Agent | Masked fields | Text fields sent in clear | Staff or provider names among them | Free text among them | Canaries (leaks) |
|---|---|---|---|---|---|
| fairclinic-boarding-grooming | client_name, patient_name | reservation_id, service | - | - | 12 (0) |
| fairclinic-card-deposits | - | batch_id | - | - | 0 (0) |
| fairclinic-claims-aging | patient_name | bucket, claim_id, claim_type, payer, provider, secondary_payer | provider | - | 10 (0) |
| fairclinic-client-balances | client_id, client_name | - | - | - | 8 (0) |
| fairclinic-controlled-drugs | patient_name | drug, entry_type, initials, schedule | initials | - | 10 (0) |
| fairclinic-credential-expiry | - | credential, holder, issuer, number, role | holder | - | 0 (0) |
| fairclinic-era-posting | patient_name | check_number, claim_id, payer, posted_by | posted_by | - | 12 (0) |
| fairclinic-estimate-variance | client_name, patient_name | approved, estimate_id, invoice_numbers | - | - | 12 (0) |
| fairclinic-hygiene-production | - | hygienist | hygienist | - | 0 (0) |
| fairclinic-inventory-expiry | - | item, lot | - | - | 0 (0) |
| fairclinic-lab-cases | patient_name | case_id, case_type, invoice_number, lab | - | - | 7 (0) |
| fairclinic-membership-plans | patient_name | plan | - | - | 10 (0) |
| fairclinic-missed-charges | client_name, patient_name | invoice_number, item, staff, visit_id | staff | - | 7 (0) |
| fairclinic-no-shows | patient_name | appointment_id, appointment_type, provider | provider | - | 9 (0) |
| fairclinic-patient-balances | account_number, guarantor | - | - | - | 12 (0) |
| fairclinic-payroll-production | - | employee, role | employee | - | 0 (0) |
| fairclinic-pet-insurance-claims | client_name, patient_name | claim_id, insurer, invoice_number | - | - | 12 (0) |
| fairclinic-pharmacy-margins | - | item, item_type | - | - | 0 (0) |
| fairclinic-ppo-fees | - | code, description, plan | - | description | 9 (0) |
| fairclinic-ppo-writeoffs | patient_name | carrier, entered_by, note, type | entered_by | note | 10 (0) |
| fairclinic-preauthorizations | patient_name | code, payer, preauth_id, provider | provider | - | 10 (0) |
| fairclinic-provider-production | - | provider | provider | - | 0 (0) |
| fairclinic-recall-gaps | patient_name | hygienist, recall_type | hygienist | - | 14 (0) |
| fairclinic-reference-labs | client_name, patient_name | accession, test | - | - | 11 (0) |
| fairclinic-referral-tracking | patient_name | party, specialty | party | - | 9 (0) |
| fairclinic-review-replies | reviewer_name | excerpt, platform, review_id | - | excerpt | 5 (0) |
| fairclinic-staff-discounts | client_name | approved_by, discount_type, entered_by, invoice_number, reason | approved_by, entered_by | reason | 5 (0) |
| fairclinic-sterilization-logs | - | ref, sterilizer | - | - | 0 (0) |
| fairclinic-supply-costs | - | category, invoice_number, item, supplier | - | - | 0 (0) |
| fairclinic-unscheduled-treatment | patient_name | providers | providers | - | 9 (0) |
| fairclinic-vaccine-reminders | client_id, client_name, patient_name | reminder, species | - | - | 12 (0) |
| fairclinic-wellness-plans | client_name, patient_name | plan | - | - | 10 (0) |
