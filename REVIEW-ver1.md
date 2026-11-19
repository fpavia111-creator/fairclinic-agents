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
