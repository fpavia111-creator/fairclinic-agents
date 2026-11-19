# Fairclinic agents for dental practices and veterinary clinics

[Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português](README.pt-BR.md) · [Italiano](README.it.md) · [日本語](README.ja.md) · [简体中文](README.zh-Hans.md) · [한국어](README.ko.md)

Thirty-two small MCP agents for the back office of a dental practice or a veterinary clinic. Each does **one job**, such as aging open insurance claims, matching an 835 to what was posted, finding treatment that was never booked, or checking the controlled drug log against the count, and cannot act beyond it. They read files the clinic already exports (Dentrix, Eaglesoft, Open Dental, Curve, Denticon; AVImark, Cornerstone, ezyVet, Covetrus Pulse, Shepherd; 835 remittances, card processor, bank, payroll and review exports), mask patient, pet and client names before any result reaches the AI model, write worklists on your computer, and wait for one named person before anything is billed, sent, filed, refunded or paid.

MIT licence · Node 20 or newer · local files only · no credentials · no dependencies · fictional test data only

Dental files are protected health information: a business associate agreement is signed with whoever sets this up before any file is held.

## Try it

```bash
npx -y fairclinic-claims-aging demo          # open dental claims on fictional data
npx -y fairclinic-controlled-drugs demo      # a fictional controlled drug log against its count
```

Every agent has a `demo` on fictional files, an `eval` with its own cases, and an MCP server (`npx -y <agent> mcp --root <folder>`) for Claude Desktop, Claude Code, Cursor and other MCP hosts. Exports in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean are read too (local column names, `1.234,56`, local dates and encodings); report pages follow `--lang de|fr|es|pt|it|ja|zh|ko`.

## The agents

**Dental insurance:** `fairclinic-claims-aging` (open claims, follow-ups, filing limits, unsent, duplicate and secondary claims; status inquiry draft), `fairclinic-era-posting` (835 against postings: unposted payments, write-off differences, denials written off, reversals), `fairclinic-preauthorizations` (no answer, approvals running out), `fairclinic-ppo-fees` (your fees against PPO allowed amounts), `fairclinic-ppo-writeoffs` (contractual and discretionary adjustments by plan and person).

**Dental patients and production:** `fairclinic-unscheduled-treatment` (treatment never booked, benefits left; patient letter draft), `fairclinic-recall-gaps` (overdue recall, reappointment by hygienist), `fairclinic-patient-balances` (credits, plans, collections review, statements; balance letter draft), `fairclinic-membership-plans` (in-house plan billing), `fairclinic-provider-production` (production and collections per provider), `fairclinic-hygiene-production` (production per hour, open time), `fairclinic-lab-cases` (cases not back for the seat appointment, lab invoices), `fairclinic-sterilization-logs` (gaps in cycle and spore logs; never a compliance finding).

**Veterinary charges and pharmacy:** `fairclinic-missed-charges` (treatment sheet against invoice), `fairclinic-reference-labs` (send-out tests against client charges), `fairclinic-estimate-variance` (estimates against invoices), `fairclinic-boarding-grooming` (nights, days and add-ons invoiced), `fairclinic-staff-discounts` (discounts against your policy, by person), `fairclinic-controlled-drugs` (DEA schedule log against the count; never files anything), `fairclinic-inventory-expiry` (expired stock and shrink), `fairclinic-pharmacy-margins` (below cost, cost rises, margins).

**Veterinary clients:** `fairclinic-vaccine-reminders` (overdue pets, unreachable clients, reminders sent for deceased pets), `fairclinic-wellness-plans` (plan billing and use), `fairclinic-pet-insurance-claims` (information requests, short direct payments, waiting claims), `fairclinic-client-balances` (credits, deposits, collections review).

**Both:** `fairclinic-card-deposits` (batches against bank deposits), `fairclinic-payroll-production` (payroll against collections), `fairclinic-credential-expiry` (licences, DEA registrations, insurance, CE hours), `fairclinic-referral-tracking` (referrals with no report back), `fairclinic-review-replies` (reply drafts that never confirm someone is a patient), `fairclinic-no-shows` (missed and late-cancelled visits not rebooked), `fairclinic-supply-costs` (supplier invoices against production).

All are built on [`fairclinic-core`](packages/fairclinic-core): allow/ask/block policy, Review, Assist and Auto modes with caps and a kill switch, a hash-chained audit log, patient-data masking, readers for CSV, Excel, JSON and X12 835/837, a zero-dependency MCP server and fixture-based evals.

## What they never do

- Bill, file or submit anything to an insurer, a pet insurer, a regulator, a board or the DEA.
- Refund, charge, pay or move money; post to the books or change the practice system.
- Send a letter, text, e-mail or review reply. Drafts are written to a file and wait for one named person's click (even in Auto mode), tied to the draft's hash.
- Diagnose, recommend care, decide vaccine schedules, or decide whether a sterilization or controlled drug log meets any rule.

## Checks

`npm test` (every package), `npm run evals`, `npm run hostile` and `npm run hostile:args` (planted formulas, HTML, path tricks and AI-directed text; broken arguments), `npm run intl` (every eval fixture rewritten as eight local exports), `npm run bench` (10,000 rows) and `npm run release:check:offline` (metadata, one-click policy, honest-copy and secret scans, `npm pack`). Numbers, decisions and what is not checked yet are in [REVIEW-ver1.md](REVIEW-ver1.md). Sample reports written by the agents on fictional data are in [sample-reports](sample-reports/index.html).

Final pass (19 Nov 2026): `npm run accuracy` (planted problems found, findings on a clean copy of every fixture set, one-edit mutation cases: [docs/accuracy-2026-11-19.md](docs/accuracy-2026-11-19.md)), `npm run model-view` (what an assistant's model sees from each agent: [docs/model-view-2026-11-19.md](docs/model-view-2026-11-19.md)), `npm run realdata` (four agents on public files: a state licence file, a state Medicaid sample 835, CMS drug acquisition costs and a state Medicaid dental fee schedule: [docs/realdata-2026-11-19.md](docs/realdata-2026-11-19.md)) and `npm run rules-doc` (every setting, its default and how to change it: [docs/rules-2026-11-19.md](docs/rules-2026-11-19.md)).

## Limits

Export layouts for the named systems were written from knowledge and are confirmed on your own exports at setup; `npx <agent> inspect <file>` shows how a file was read. Thresholds are your settings, not anyone's rules. Masking keeps names and contact details away from the model; it is not a HIPAA determination and does not replace your privacy program. Not clinical, legal, tax, coding or compliance advice.

Mythos Machines · [fair-agents.com](https://fair-agents.com)
