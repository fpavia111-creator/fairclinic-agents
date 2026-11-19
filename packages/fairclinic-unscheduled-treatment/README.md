# Fairclinic Unscheduled Treatment (`fairclinic-unscheduled-treatment`)

Fairclinic Unscheduled Treatment: dental treatment that was accepted or proposed and never booked, per patient, with fees, insurance estimates and benefits left before the benefit year ends; old plans set aside for the dentist; a plain letter to one patient for one named person to send. Patient names are masked before results reach the model.

**Never sends a text, e-mail, letter or post; drafts wait for one named person. Never changes appointments or treatment plans; a person makes any correction there. Never diagnoses, recommends treatment or tells a patient or client what care to have.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-unscheduled-treatment demo
npx -y fairclinic-unscheduled-treatment mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-unscheduled-treatment demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Unscheduled Treatment demo (fictional dental practice and patients, as of 2026-11-16) in C:\Users\fpavi\AppData\Local\Temp\fairclinic-unscheduled-treatment-demo-En7868

▶ Check the files
  status: executed  decision: allow
  9 patient(s), 4 to contact: 2670 accepted and 2440 proposed treatment not scheduled; 2 patient(s) with 2400 of benefits ending soon; 1 plan(s) old enough for the dentist to review.
    benefits_expiring     accepted       0  proposed    1800  benefits left 1500
    benefits_expiring     accepted    1490  proposed       0  benefits left 900
    accepted_unscheduled  accepted    1180  proposed       0  benefits left -
    proposed_unscheduled  accepted       0  proposed     640  benefits left 0
    stale                 accepted       0  proposed       0  benefits left 1200

▶ Write the worklist for the team
  status: executed  decision: allow
  Unscheduled treatment written: 9 patient(s), 4 to contact: 2670 accepted and 2440 proposed treatment not scheduled; 2 patient(s) with 2400 of benefits ending soon; 1 plan(s) old enough for the dentist to review. Files: fairclinic-out/treatment/treatment-unscheduled.csv, fairclinic-out/treatment/treatment-unscheduled.html.

▶ Agent tries message send itself
  status: blocked  decision: block
  reason: Never sends a text, e-mail, letter or post; drafts wait for one named person.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `treatment_check` | Every patient with treatment planned and not booked: accepted and proposed amounts, remaining benefits and benefit year end, the oldest plan date, and a status: benefits_expiring, accepted_unscheduled, proposed_unsche… | runs |
| `treatment_explain` | One patient's plan lines with their status and the findings in plain words. | runs |
| `treatment_write_report` | Write treatment-unscheduled.csv (one row per item, with blank owner and decision columns for your team) and treatment-unscheduled.html into out_dir (default fairclinic-out/treatment). | runs |
| `treatment_draft_patient_letter` | Write drafts/patient_letter-<hash>.md: a plain letter listing the patient's accepted and proposed treatment that is not booked, with fees, insurance estimates and remaining benefits. | asks first (Auto can be opted in) |
| `treatment_request_send` | After one named human click (even in Auto), record that the reviewed patient letter draft is approved in patient_letter-requests.csv. | one named click, even in Auto (`binding_send`) |
| `treatment_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `treatment_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `treatment_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `treatment_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `message_send` | Never sends a text, e-mail, letter or post; drafts wait for one named person. | refused |
| `pms_update` | Never changes appointments or treatment plans; a person makes any correction there. | refused |
| `clinical_advice` | Never diagnoses, recommends treatment or tells a patient or client what care to have. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Treatment plan lines (`plans`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `patient_name` (required) | text (masked) | Patient, Patient Name | Patient, Patient, 患者名, 患者 |
| `provider` | text | Provider, Dentist, Treating Provider | Leistungserbringer, Prestataire, 医師, 医生 |
| `code` | text | Procedure, Code, CDT, CDT Code, Proc Code | - |
| `description` | text | Description, Procedure Description, Treatment | Beschreibung, Description, 摘要, 摘要 |
| `fee` | amount | Fee, Treatment Fee, Office Fee, Amount | Betrag, Montant, 請求額, 金额 |
| `est_insurance` | amount | Est. Insurance, Estimated Insurance, Ins Est, Insurance Estimate | - |
| `status` | text | Status, Plan Status, Treatment Status | - |
| `date_planned` | date | Date Planned, Planned, Date Presented, Plan Date, Created | - |
| `scheduled_date` | date | Scheduled, Scheduled Date, Appointment, Next Appt, Appt Date | - |
| `remaining_benefit` | amount | Remaining Benefit, Benefits Remaining, Annual Max Remaining, Remaining Max | - |
| `benefit_year_end` | date | Benefit Year End, Plan Year End, Benefit Renewal | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Eaglesoft | Treatment plan report, exported to CSV | Patient, Plan Status, Date Planned, Treatment Fee | no |

Where a layout says "checked", its column names were compared with the publisher's template or documentation on that date (the CMS price-transparency templates, the pfs.data.cms.gov column lists and Open Dental's published procedure log fields). The NCCI, MUE and RVU file headers and the other practice-management and clearinghouse layouts were written from knowledge of the export and were not checked; where the vendor's public help says something about the export, the layout's note says what. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-unscheduled-treatment inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-unscheduled-treatment can remember facts about your setup so the next run does not have to be told again. `treatment_learn` only proposes a fact; it changes nothing until a named person accepts it with `treatment_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-unscheduled-treatment memory list
fairclinic-unscheduled-treatment memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-unscheduled-treatment memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-unscheduled-treatment demo
npx -y fairclinic-unscheduled-treatment mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-unscheduled-treatment": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-unscheduled-treatment",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-unscheduled-treatment -- npx -y fairclinic-unscheduled-treatment mcp --root .`, or install the `fairclinic-unscheduled-treatment` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-unscheduled-treatment approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-unscheduled-treatment approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-unscheduled-treatment kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-unscheduled-treatment tools                 # every tool, its policy and arguments
fairclinic-unscheduled-treatment sources               # the columns each input is read from
fairclinic-unscheduled-treatment inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-unscheduled-treatment call treatment_check '{"plans":"<plans>"}'
fairclinic-unscheduled-treatment eval                  # the private eval cases on the fictional fixtures
fairclinic-unscheduled-treatment demo
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
