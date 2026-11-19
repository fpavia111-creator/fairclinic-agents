# Fairclinic ver 1: review

18 Nov 2026. Fairclinic is the Fair Agents family for dental practices and veterinary clinics: 32 agents and `fairclinic-core`, built to the Mythos ver 6 bar in `BUILD-BRIEF.md` without input from Kurt. This file lists every check with its numbers, what was found and fixed, what is not checked yet, and every decision made.

Nothing was published, pushed, uploaded or sent. Stripe and the websites were not touched. All data is fictional.

## Scope

| Area | Agents |
|---|---|
| Dental insurance | claims-aging, era-posting, preauthorizations, ppo-fees, ppo-writeoffs |
| Dental patients and production | unscheduled-treatment, recall-gaps, patient-balances, membership-plans, provider-production, hygiene-production, lab-cases, sterilization-logs |
| Veterinary charges and pharmacy | missed-charges, reference-labs, estimate-variance, boarding-grooming, staff-discounts, controlled-drugs, inventory-expiry, pharmacy-margins |
| Veterinary clients | vaccine-reminders, wellness-plans, pet-insurance-claims, client-balances |
| Both | card-deposits, payroll-production, credential-expiry, referral-tracking, review-replies, no-shows, supply-costs |

Every package is `fairclinic-<name above>` at version 0.1.0, MIT, with README, CHANGELOG and LICENSE. Four agents write drafts behind a one-click approval: claims-aging (carrier status inquiry), unscheduled-treatment (patient letter), patient-balances (balance reminder), review-replies (public reply). Every agent lists refused tools so a host model can see the line (billing an insurer, refunds, payments, messages, changing the practice system, filing with a regulator, clinical advice).

## Checks run (Windows 10, Node 24.20.0, this machine)

| Check | Result |
|---|---|
| `npm test` (all 33 workspaces) | 805 tests, 805 pass, 0 fail. fairclinic-core 131; agents 20 to 22 each (no agent below 20) |
| `npm run evals` | 615 eval cases across 32 agents, 0 failed; 16 to 28 per agent (no agent below 15). Each agent has 5 to 14 hand-written domain cases plus generated safety cases |
| `npm run hostile` (planted formulas, HTML, path tricks, AI-directed text in every fixture, every eval case) | 32 agents, 3,081 calls, 576 planted values, 0 calls refused or held because of planted data, 0 findings |
| `npm run hostile:args` (null, numbers, arrays, 200,000-character strings, `../` and absolute paths in every argument of every tool) | 32 agents, 16,086 calls, 558 planted values, 0 findings (run in seven parallel groups; on this shared machine one agent takes 2 to 15 minutes because each mutation replays the earlier eval cases in a fresh sandbox) |
| `npm run intl` (every spreadsheet case rewritten as a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export: local column names, `1.234,56`, local dates, legacy encodings) | 32 agents, 408 cases with spreadsheet inputs, 8 languages: every case that passes in English passes in every language (after the provider-production fix below; the first run had 8 failures, all that one case). 166 of 394 column names have a local word (German count) |
| `npm run bench -- --sizes 10000` (every read and report tool on 10,000 rows) | 75 tools across 32 agents, one process each, at 10,000 rows: all executed. The first full run flagged membership-plans (error), reference-labs and boarding-grooming (slow); after the fixes below the second full run had 74 under 10 s and boarding-grooming at 10.3 s, and after its own fix boarding-grooming takes 4.5 s. Slowest now: wellness-plans write report 7.6 s, 207 MB. Run on a machine shared with other sessions' test runs |
| `npm run release:check:offline` (metadata, one-click policy, honest-copy and secret scans, `npm pack`) | exit 0: 33 packages listed, metadata in order, no .npmrc, secret scan clean (924 tracked files), honest copy clean (100 README, package and manifest files), all 7 one-click categories present and none set to allow, no paid tier, 805 tests, 615/615 evals, hostile data and export passes 0 findings, `npm pack` of 33 packages (575 KB, no tests, state, output, keys or .npmrc). npm names were skipped by `--offline` and checked separately with `npm view` |
| `npm run readme:check` / `npm run plugin:check` | pass / pass (65 plugin files for 32 agents) |
| Masking | Every agent that reads patient, pet, client or reviewer data lists its fictional names in `fixtures/phi-canaries.json` (23 agents, 5 to 14 values each); a shared test and a generated eval case check none reaches any result. The 9 agents with no patient data assert that no column they read is a patient field |
| `npm view` for all 33 names | all free (E404), see `docs/npm-names-2026-11-18.md` |
| MCP Registry | `node ..\add-mcp-registry.cjs fairclinic-agents fairclinic.html`: `mcpName` and `server.json` for all 32 agents |

## Found and fixed during the build

- **Core, case-only header matches** (found by the Fairmake session, ported): a header equal to a field name in another case ("Status" for `status`) was not re-keyed when no other column needed mapping. Fixed in `sources.js`.
- **Core, local values under the agent's own column names** (Fairmake note, ported): a German file in the agent's own layout kept `12.11.2026` and `1.234,50` unread. Fixed; one core test that documented the old behaviour now uses an ISO date and checks the German case.
- **Core, very long paths** (Fairtable note, ported): `safePath` now refuses paths over 1,024 characters before touching the file system.
- **README generator on Windows**: the captured demo output kept `C:\...\Temp\...` folder names, so `readme:check` failed for every agent on every run. It now strips Windows temp folders as it did POSIX ones.
- **Export layouts that equal the agent's own names**: the Denticon and AVImark layouts were first given signatures made of the agent's own field names, which made an own-name file count as "adapted" (contract test failed). They now use distinct vendor headers.
- **provider-production in other languages**: once column names were localised, the Denticon file no longer matched its layout and "Total Collections" was no alias, so collections read as 0 in all eight languages. Added the alias; intl passes.
- **claims-aging**: a paid primary with a second carrier was not checked for a secondary claim at first; added `secondary_not_sent`. The status inquiry first listed every claim older than the follow-up age, including duplicates, denials and claims followed up last week; it now lists only claims whose follow-up is due.
- **ppo-fees**: a line capped at the office fee (lower than the plan fee) was reported as underpaid. It now applies the lower-of rule before calling anything underpaid.
- **lab-cases**: "no invoice" was reported even when no invoice file was given; now only checked when invoices are loaded.
- **vaccine-reminders**: a sort comparator without parentheses put a reminder for a deceased pet below others; fixed and tested.
- **Eval expectations**: several of my hand-computed totals were wrong (patient portion 668.4 not 668.6; stock value 1,166.8; pharmacy gap 2,103.64 because below-cost items also count toward the gap to target). The code was right in each case; the expectations were corrected after checking the arithmetic by hand.
- **Bench, membership-plans**: at 10,000 rows (where the bench repeats member names) every payment of a repeated name became its own finding and the report string grew past what Node allows ("Invalid string length"); names of charges not on the roster were also looked up with a scan per name. Each member now gets one finding per kind with a count ("and 49 more like it"), names are looked up once, and a test covers it. 25.9 s with an error became 4.4 s.
- **Bench, reference-labs**: every lab test scanned every charge for the same pet and item and parsed dates each time (7.9 s of matching at 10,000 rows). Charges are now indexed, sorted by date and taken from a moving start (0.8 s).
- **Bench, boarding-grooming**: with a reservation id repeated across thousands of rows (the bench repeats ids; real exports can list one row per night), every reservation re-filtered all of that id's invoice lines. Lines are now summed per reservation and item once: 10.3 s became 4.5 s.
- **Core, long ids in errors**: a "not found" message repeated the whole argument, 200,000 characters in the hostile pass. It now echoes at most 80 characters.
- **Safety eval generator**: a first version expected report tools to be blocked in Review mode; the core allows local report files in Review by design, so that case was replaced by an unknown-argument case.

## Not checked yet (say this out loud)

- **Real exports.** Column layouts for Dentrix, Eaglesoft, Open Dental, Curve, Denticon, AVImark, Cornerstone, ezyVet, Covetrus Pulse and Shepherd were written from knowledge and are marked "recalled" in the core catalogue. No real export has been read. Every agent's `inspect` command shows how a file was read; the first setup confirms the columns.
- **Node 20 and 22**: only Node 24 was run here. `engines` says Node 20 or newer.
- **mcp:check** (official MCP SDK client) was not run: it needs the SDK installed. The stdio smoke test in every agent's shared tests passes.
- **Translated column names**: 166 of 394 column names have a local word in the dictionary (German count). Clinic-specific columns (recall due, approval end date, running balance) keep English names in localised files; they still read because the English name is kept. Translations of READMEs and report headings were written by Claude and have not had a native-speaker review.
- **Rules and thresholds**: filing limits, follow-up days, late-cancellation windows, margins and payroll targets are settings with defaults chosen as starting points. Nobody from a dental billing office, a veterinary practice, a privacy officer or a lawyer has reviewed them.
- **Controlled drugs and sterilization** report what the logs show. They are not a DEA, state board or infection-control review, and the wording avoids any compliance finding; a person who runs those programmes should read the wording before a sale.
- **Masking** works on known column names and registered values. A patient name typed into a free-text column the agent does not know (for example review text) can reach the model. It is not a HIPAA de-identification.

## Decisions made (Kurt asked for none to wait for him)

1. **Base**: copied the Remedy core (the Lodestar pattern with patient-data masking and X12 835/837 readers, already carrying the 18 Nov Windows fixes) rather than the plain Lodestar core, because dental files are PHI and the ERA agent needs the 835 reader.
2. **Names**: `fairclinic-<what it does>` per the brief; two agents first built under mammal names were renamed the same day (`docs/renamed-2026-11-18.md`). Tool prefixes are single job words because the core's memory tools require a prefix without underscores.
3. **Agent list**: 14 dental, 12 veterinary, 6 shared (32), following the brief's examples. Supply costs, sterilization logs and inventory expiry are written for both kinds of clinic.
4. **What waits for a person**: four agents draft text (status inquiry, patient letter, balance reminder, review reply); the approve step is `binding_send`, one named click even in Auto, tied to the draft's sha256, refused while `[TO CONFIRM ...]` markers remain unless a note is given. Nothing else writes anywhere except local worklists.
5. **Review replies** never confirm the reviewer is a patient or client; the agent also checks any wording a person proposes for words that would disclose a visit, care, records, a date or a name.
6. **Controlled drugs** compares the count with the balance worked out from the entries (not the written balance), so an arithmetic error that hides a difference is shown.
7. **Masking for veterinary data**: client, owner, pet and reviewer names, client ids, phones, e-mails and addresses were added to the core's masked fields. Staff names are not masked (worklists name who entered an adjustment); credential numbers show their last four characters only.
8. **Fixtures**: one fictional dental practice and one fictional animal hospital shared across agents, with invented patients, pets, clients, carriers (Example Dental PPO, Sample Mutual Dental, Demo Smile Plan, Test Dental Network), pet insurers and labs, all named so they cannot be mistaken for real ones.
9. **Prices** (`sales/pricing-page-ver1.md`): nine single-site packages from $1,800 to $7,500 and a partner rollout at $15,000 for up to 10 locations, plus $200, $450 or $250 per location a month for support. Placed between Fairtable and the medical families. Kurt approved using the proposals.
10. **Site page**: `fairclinic.html` for the MCP Registry `websiteUrl`.

## Ideas for ver 2

Local column words for the clinic-specific fields; a calendar file (ICS) for credential expiries and pre-authorization end dates; one de-identified real export per named system; a monthly runner that chains the dental insurance pack; native-speaker review of the nine languages.

## Final pass (19 Nov 2026)

Run at the main session's request (`FINAL-PASS-REQUEST.md`): the eight-point "Final pass" checklist in `BUILD-BRIEF.md`, Kurt's five review questions with numbers, and real-data tests on public files. Work in `fairclinic-agents` only, committed locally; nothing was pushed, published, uploaded or sent, and Stripe and the websites were not touched. The evidence files are in `docs/` and are regenerated by scripts: `npm run accuracy`, `npm run model-view`, `npm run realdata` (after `-- --download`) and `npm run rules-doc`.

### Checklist

1. **Names.** A search for the old themed words outside fixture data and history found real leftovers in the core: the `fairclinic-new-agent` scaffold still refused any name that was not `<figure>-of-<process>`, the core README gave `iris-of-tests` and `acme-of-access` as examples and said "All 30 Fairclinic domain agents ... from `olympus-of-migration` to `solon-of-clauses`" (copied from another family), and a licence test looked for packages with `-of-` in the name, so it silently checked none. All fixed: the scaffold takes `fairclinic-<what it does>` with the job word as tool prefix and refuses themed names (tested), the README lists the 32 agents, the test finds them. Old names remain only in the CHANGELOG rename lines and `docs/renamed-2026-11-18.md`.
2. **Each agent read as a buyer.** The Missed Charges demo did not pass its own `settings.json`, so its README showed two wrong findings (a fecal test worded differently on the treatment sheet and the invoice); fixed and regenerated. The shared "Exports it reads" note in every README described another family's checked CMS layouts; it now says which Fairclinic layouts were tested on public files and that the practice-management layouts were written from knowledge. READMEs regenerated for the four agents that changed (ERA posting, credential expiry, PPO fees, pre-authorizations).
3. **Honest copy.** A search of every README, `sales/site.json`, the pricing page and the sample reports for guarantees, compliance, certification and savings wording found none. `site.json` said "Tested on fictional data only"; it now says which four agents were also tested on public files.
4. **Binding actions.** Unchanged and checked again by `release:check`: the four draft tools (status inquiry, patient letter, balance reminder, review reply) need one named click even in Auto, tied to the draft's sha256; billing, filing, refunds, payments, messages, practice-system changes and clinical advice are refused tools. The real-data changes added no action.
5. **The full bar from a fresh clone.** See the table below.
6. **Fixtures fictional.** Names, practices, carriers, insurers and labs are invented. Following the Fairdrive note, identifiers with a public registry were checked: the payee NPI in the 835 fixture (1999999984) is not issued (NPPES API, 19 Nov 2026, no result); the DEA-style numbers XE0000001 and XE0000002 fail the DEA check digit; the routing number 999999999 is not a valid ABA number; e-mails use `example.test`. Masking canaries: 0 of 225 fictional names reached any result.
7. **`site.json`, pricing page and agents.** 10 packages, the same prices, and the agent counts match (21 for the whole dental practice, 20 for the whole veterinary hospital). Sample reports regenerated; only the ERA posting report changed (the check table now shows the payment amount and provider-level adjustments).
8. **Pack contents.** `release:check:offline`: no secrets, no `.fairclinic`/`fairclinic-out` state, no tests or `.npmrc` in `npm pack`.

Also from the other families' lessons: a `.gitattributes` keeps code, docs and fixtures LF on every checkout (the legacy-encoding intl fixtures and `.835` files keep their exact bytes), and `readme:check`, `plugin:check`, `sources-doc` and the clean-set check ignore CR, so a Windows clone with `core.autocrlf=true` passes.

| Check (fresh clone, `git clone -c core.autocrlf=true`, `npm install --offline`, Windows 10, Node 24.20.0) | Result |
|---|---|
FINAL_BAR_ROWS

### Kurt's five questions

**1. Accuracy** (`docs/accuracy-2026-11-19.md`, per agent). On the fictional fixtures: **180 of 180** planted problems found, 0 unplanned findings on the planted set; **0 findings on 468 rows** of clean data (every agent has a clean set: its demo files with each planted problem removed, nothing else changed); **96 of 96** one-edit mutation cases caught (three per agent; two for review replies, four for ERA posting). Every agent is at 100% on all three. Writing the clean sets found one wrong finding, now fixed: a pre-authorization whose visit was booked before the approval ends was still flagged "expiring". The fixtures, clean sets and mutations were written by the same author as the rules, so these numbers show the rules do what they were written to do; they say nothing yet about a real practice's exports.

**2. Security** (`docs/model-view-2026-11-19.md`, per agent). Each check was run with masking on and the result the model receives was read field by field. Masked: patient, pet, client, owner, guarantor and reviewer names (`PT-` pseudonyms), account and client numbers, member ids, chart and pet ids, birth dates, addresses, phones and e-mails; credential numbers show their last four characters. Sent in clear: amounts, dates, procedure and drug names, codes, claim, invoice and case numbers, carrier, insurer, lab and supplier names, and in 15 agents the names of staff or providers (provider, hygienist, employee, initials, who entered, posted or approved something, the licence holder, a referral source). Free text sent as typed: adjustment notes (PPO write-offs), discount reasons (staff discounts) and review text (review replies). A probe review "Juniper Vance here: Dr. Ada Stranger rushed my dog Waffles" reached the model with the reviewer's own name masked (it is in a masked column) and "Ada Stranger" and "Waffles" as typed. New in this pass: `--phi strict` also replaces staff and provider names with `ST-` pseudonyms, inside text too (tested); the person who clicks approve and a discount's approver stay in clear. Canaries 0 of 225; hostile passes in the table above. Results go to whatever model the user's assistant uses; for dental records use a model provider covered by a business associate agreement, or a local model. No HIPAA or other compliance is claimed.

**3. Compatibility.** 15 formats are recognised by name. **3 tested on a public sample**: the X12 835 remittance (a state Medicaid sample), the Washington State credential file and the Montana Medicaid dental fee schedule (two editions). **12 written from knowledge of the export, not checked against documentation or a real export**: Dentrix outstanding claims and adjustments, Open Dental claim and claim payment queries, Eaglesoft treatment plans, Curve recall, Denticon production, AVImark controlled drug log, Cornerstone reminders, ezyVet invoice lines, Covetrus Pulse inventory and Shepherd invoice items. **0 tested on a real practice export.** Any other file is read by column name with each field's list of alternatives, and `inspect` plus `fairclinic-sources.json` maps a layout by hand.

**4. Commercial traction.** No paying customers; no checkout is live (the main session's answer for the suite).

**5. Support** (`docs/rules-2026-11-19.md`). **85 settings across the 32 agents**, each in the JSON settings file the practice passes to the agent, with the default written in the agent's `src/logic.js` schema: follow-up and filing days, warning windows, margins, targets, fees, plan contents and price lists. The defaults are starting points chosen on 18 Nov 2026, not regulations, payer contracts or standards of care, and nobody from a dental or veterinary practice has reviewed them. A misspelt or out-of-range setting is refused. A practice updates a rule by editing its settings file and a changed export layout in `fairclinic-sources.json`, without a release. The rules that come from an outside standard and need a release when it changes are few: the X12 835 claim status and adjustment handling (status 4 denied, 22 reversal, PLB provider adjustments, contractual reason codes 45, 253 and 131 as a default setting) and the licensing-board status words. There are no dated regulatory rules (filing deadlines set by law, DEA schedules, CDT validity) inside the checks. Mythos Machines maintains the code and the export layouts; the support plans on the pricing page cover export changes and new versions.

### Real data (`docs/realdata-2026-11-19.md`)

Public files in their published format; downloads kept in the git-ignored `_realdata/`; each agent result recounted with separate code in `scripts/realdata.mjs`; nothing sent to any model.

| Source (read 19 Nov 2026) | Licence | Agent | What it found | Wrong findings | Fixed |
|---|---|---|---|---|---|
| Washington State Department of Health, Health Care Provider Credential Data (data.wa.gov `qxh8-f4bd`), dentist, dental hygiene, veterinary and veterinary technician credentials | Public domain | credential-expiry | 47,539 credentials: 25,972 not active at the board, 3,650 expiring within 90 days, 438 with no expiry date, 12 past their date that the board still lists as Active | 0 against the recount | Could not read the file (first and last name in separate columns) and ignored the board status: now joins the names, reads the status (`not_active` wins over the date) and says when the board still lists a past-date credential as Active |
| Nevada Medicaid sample 835 (a PDF on medicaid.nv.gov; text extracted, page lines removed, wrapped segments rejoined) | State document, no licence stated | era-posting | 3 remittances with segments ended by line breaks, 3 claims, 2 denials (status 4), one 1,812.27 payment made only of provider-level adjustments | 0 against the recount | The claim-less payment and every PLB adjustment were dropped without a word: now listed as `provider_adjustment` with the payment amount and PLB total per check (test and mutation case added) |
| CMS NADAC 2026 (data.medicaid.gov), 26 human generics often dispensed by veterinary practices, unit costs of 7 Jan and 18 Nov 2026 under fictional prices | Public domain | pharmacy-margins | 3 cost rises over 5% not passed on (metronidazole, enalapril, tramadol), 1 margin under target, 0 below cost; five-decimal unit costs read as given | 0 against the recount | Nothing needed |
| Montana Medicaid dental services fee schedules, January 2026 and July 2025 (Excel, medicaidprovider.mt.gov) | State document; CDT codes © ADA | ppo-fees | 285 and 281 codes read as one plan each; 6 write-offs over 45% against the fictional office fees | 0 against the recount | Could not read either file (no plan column; `Proc`, `Fees`/`Office Fees`; sheet renamed between editions): now a `plan` argument and those names. It would also have raised a "no office fee" finding for each of 277 codes the office never bills: those are now `not_offered`, listed but not counted as work |

No public data fits the other 28 agents: they read a practice's own records (claims, ledgers, plans, logs, schedules), and no dental or veterinary practice-management vendor publishes a sample export that we found. They are tested on the fictional fixtures only.

### What changed in this pass

Code: ERA posting (PLB and claim-less payments), credential expiry (board files and status), PPO fees (one-plan payer schedules, `not_offered`), pre-authorizations (no "expiring" when the visit is booked in time), Missed Charges demo (passes its settings), core masking (`strict` masks staff names), core scaffold (product names), core exports catalogue (a `tested` basis with source and date). Tests: 3 new domain tests (ERA provider adjustments, board credential file, schedule codes not offered), 1 new core test (strict masking of staff names), stronger scaffold, catalogue and pre-authorization tests; eval cases for the one-plan schedule. Tooling: `scripts/accuracy.mjs` with `accuracy-specs.mjs` and `fixtures/clean/` in every agent, `model-view.mjs`, `realdata.mjs`, `rules-doc.mjs`, `demo-args.mjs`, `.gitattributes`, CR-tolerant checks. Docs: `docs/accuracy-…`, `model-view-…`, `realdata-…`, `rules-…` (all 2026-11-19), `sales/final-pass.json`, the README checks paragraph.

### For Kurt to decide

1. **Staff and provider names reach the model in clear by default** (15 agents). `--phi strict` masks them; Fairdrive masks staff names by default. Keep the default, or switch every agent to masking staff names (worklist files would still name people)?
2. **No real practice export has been read.** The 12 practice-management layouts stay "written from knowledge" until a design partner shares one de-identified export per system.
3. **The thresholds have not been reviewed** by a dental billing office, a veterinary practice manager or a privacy officer.
4. The final-pass paragraph in the root README is in English only; the eight translations were not updated.
