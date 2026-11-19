# Fairclinic Referral Tracking (`fairclinic-referral-tracking`)

Fairclinic Referral Tracking: referrals sent to specialists with no report back, referrals received that were never seen, referring doctors not thanked, and new patients and production by referral source. It reads dates and practice names only, never clinical details, and sends nothing. Patient names are masked before results reach the model.

**Never sends a text, e-mail, letter or post; drafts wait for one named person. Never sends records or letters to another practice. Never diagnoses, recommends treatment or tells a patient or client what care to have.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-referral-tracking demo
npx -y fairclinic-referral-tracking mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-referral-tracking demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Referral Tracking demo (fictional practices and patients, as of 2026-11-16)

▶ Check the files
  status: executed  decision: allow
  4 referral(s) sent, 5 received. 4 to follow up: 2 with no report back, 1 referred in and never seen, 1 referring doctor(s) not thanked.
    no_report           out  2026-08-15  Sample Orthodontics        Referred 93 days ago and no report back from Sample Orthodontics. Ask whether the patient was seen.
    no_report           out  2026-10-01  Sample Oral Surgery        Referred 46 days ago and no report back from Sample Oral Surgery. Ask whether the patient was seen.
    no_first_visit      in   2026-10-01  Website                    Referred in 46 days ago by Website and no first visit recorded. Follow up with the patient.
    thank_you_not_sent  in   2026-10-10  Dr. Mara Referring         Seen 2026-10-20; no thank-you recorded to Dr. Mara Referring.

▶ Write the worklist for the team
  status: executed  decision: allow
  Referral follow-up written: 4 referral(s) sent, 5 received. 4 to follow up: 2 with no report back, 1 referred in and never seen, 1 referring doctor(s) not thanked. Files: fairclinic-out/referrals/referrals-follow-up.csv, fairclinic-out/referrals/referrals-follow-up.html.

▶ Agent tries message send itself
  status: blocked  decision: block
  reason: Never sends a text, e-mail, letter or post; drafts wait for one named person.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `referrals_check` | Every referral out (report back or not) and in (seen, thanked), with a status: no_report, no_first_visit, thank_you_not_sent, waiting or ok; new patients and production by source; reports back by specialist. | runs |
| `referrals_write_report` | Write referrals-follow-up.csv (one row per item, with blank owner and decision columns for your team) and referrals-follow-up.html into out_dir (default fairclinic-out/referrals). | runs |
| `referrals_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `referrals_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `referrals_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `referrals_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `message_send` | Never sends a text, e-mail, letter or post; drafts wait for one named person. | refused |
| `records_send` | Never sends records or letters to another practice. | refused |
| `clinical_advice` | Never diagnoses, recommends treatment or tells a patient or client what care to have. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Referrals sent (`outgoing`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` (required) | date | Date, Referral Date, Date Referred, Sent | Datum, Date, 日付, 日期 |
| `patient_name` | text (masked) | Patient, Patient Name, Pet | Patient, Patient, 患者名, 患者 |
| `referred_to` (required) | text | Referred To, Specialist, Referral To, Practice | - |
| `specialty` | text | Specialty, Service, Department | - |
| `report_received` | date | Report Received, Report Date, Letter Received, Records Received | - |

### Referrals received (`incoming`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` (required) | date | Date, Referral Date, Date Referred, Received | Datum, Date, 日付, 日期 |
| `patient_name` | text (masked) | Patient, Patient Name, New Patient, Pet | Patient, Patient, 患者名, 患者 |
| `source` (required) | text | Source, Referred By, Referral Source, Referring Doctor | - |
| `source_type` | text | Source Type, Type, Channel | - |
| `first_visit` | date | First Visit, First Appointment, Seen | - |
| `production` | amount | Production, First 90 Days, Revenue, Charges | - |
| `thanked` | date | Thanked, Thank You Sent, Thank-you Sent, Acknowledged | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-referral-tracking inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-referral-tracking can remember facts about your setup so the next run does not have to be told again. `referrals_learn` only proposes a fact; it changes nothing until a named person accepts it with `referrals_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-referral-tracking memory list
fairclinic-referral-tracking memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-referral-tracking memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-referral-tracking demo
npx -y fairclinic-referral-tracking mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-referral-tracking": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-referral-tracking",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-referral-tracking -- npx -y fairclinic-referral-tracking mcp --root .`, or install the `fairclinic-referral-tracking` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-referral-tracking approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-referral-tracking approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-referral-tracking kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-referral-tracking tools                 # every tool, its policy and arguments
fairclinic-referral-tracking sources               # the columns each input is read from
fairclinic-referral-tracking inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-referral-tracking call referrals_check '{"outgoing":"<outgoing>"}'
fairclinic-referral-tracking eval                  # the private eval cases on the fictional fixtures
fairclinic-referral-tracking demo
```

## Patient data

Results go to an AI model, so patient identifiers are masked before they leave the agent (`--phi mask`, the default): names, member IDs, MRNs and account numbers become stable pseudonyms such as `PT-3f9a1c2e`; birth dates become the birth year; addresses, phones, e-mails and SSNs are removed, also inside free text. `--phi strict` also hides claim numbers, service days and ZIP codes. Tools still take a pseudonym back as an argument. Report files written to disk keep real names, because people work from them: keep them in a folder only your staff can open. `--phi off` is possible and is recorded in the audit log. The shared tests check that no fictional patient identifier from the fixtures reaches any eval result. This is a design for keeping PHI away from the model; it is not a HIPAA compliance determination: your business associate agreements, access controls and policies still apply.

## Audit log and data

Every call is written to `.fairclinic/audit.jsonl` under the root: hash-chained JSON lines, with arguments stored as a hash, signed with an Ed25519 key when you configure one. Everything runs on your machine on files you choose. No network calls, no telemetry, no credentials. The bundled fixtures are fictional.

<!-- generated:end -->

## Limits

- It checks only what is in the files and settings you load. Thresholds and fee schedules are as current as what you give it; the defaults are starting points, not anyone's policy or a standard of care.
- It is not clinical, legal, tax, coding or compliance advice, and it never decides whether a rule is met. A person reviews every result before anything is billed, sent, filed, refunded or corrected; the agent does none of those.
- Export layouts named in "Columns it reads" were written from knowledge of each system and not tested against a live account; `inspect` shows how a file was read.
- Masking keeps names and contact details away from the model; it does not replace your privacy program. Dental files are protected health information: a business associate agreement is signed before any file is held.
