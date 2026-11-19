# Fairclinic Recall Gaps (`fairclinic-recall-gaps`)

Fairclinic Recall Gaps: dental recall and hygiene patients who are overdue and not booked, missed a booked visit, are due soon, or have lapsed, with the last contact date; and how many hygiene visits leave with the next visit booked, per hygienist. Patient names are masked before results reach the model.

**Never sends a text, e-mail, letter or post; drafts wait for one named person. Never changes appointments or recall settings; a person makes any correction there. Never diagnoses, recommends treatment or tells a patient or client what care to have.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-recall-gaps demo
npx -y fairclinic-recall-gaps mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-recall-gaps demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Recall Gaps demo (fictional dental practice and patients, as of 2026-11-16)

▶ Check the files
  status: executed  decision: allow
  10 recall patient(s), 22.22% booked; 5 to contact: 2 overdue, 1 missed visit(s), 1 due soon, 1 lapsed; 1 contacted recently. Reappointment at hygiene visits: 75% (1 hygienist(s) below target).
    missed_appointment  Prophy             due 2026-10-20  The booked visit on 2026-11-03 has passed and the recall (due 2026-10-20) is still open; it was probably missed or cancelled.
    overdue             Prophy             due 2026-08-01  Overdue 107 days (due 2026-08-01), not booked, last contact 2026-09-01.
    overdue             Perio Maintenance  due 2026-11-01  Overdue 15 days (due 2026-11-01), not booked, no contact recorded.
    lapsed              Prophy             due 2024-12-01  Overdue 715 days (due 2024-12-01); on the reactivation list.
    due_soon            Prophy             due 2026-12-01  Due in 15 day(s) (2026-12-01) and not booked.
    contacted           Perio Maintenance  due 2026-09-15  Overdue 62 days; contacted 6 day(s) ago.

▶ Write the worklist for the team
  status: executed  decision: allow
  Recall gaps written: 10 recall patient(s), 22.22% booked; 5 to contact: 2 overdue, 1 missed visit(s), 1 due soon, 1 lapsed; 1 contacted recently. Reappointment at hygiene visits: 75% (1 hygienist(s) below target). Files: fairclinic-out/recall/recall-gaps.csv, fairclinic-out/recall/recall-gaps.html.

▶ Agent tries message send itself
  status: blocked  decision: block
  reason: Never sends a text, e-mail, letter or post; drafts wait for one named person.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `recall_check` | Every recall patient with a status: missed_appointment, overdue, lapsed, due_soon, contacted, scheduled, not_due or inactive, days overdue and the reason; with visits, the share of hygiene visits that left with the ne… | runs |
| `recall_hygienists` | Per hygienist: hygiene visits, how many left with the next visit booked, the rate and whether it is below the target in your settings. | runs |
| `recall_explain` | One recall patient with dates and the reason for the status. | runs |
| `recall_write_report` | Write recall-gaps.csv (one row per item, with blank owner and decision columns for your team) and recall-gaps.html into out_dir (default fairclinic-out/recall). | runs |
| `recall_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `recall_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `recall_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `recall_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `message_send` | Never sends a text, e-mail, letter or post; drafts wait for one named person. | refused |
| `pms_update` | Never changes appointments or recall settings; a person makes any correction there. | refused |
| `clinical_advice` | Never diagnoses, recommends treatment or tells a patient or client what care to have. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Recall list (`recall`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `patient_name` (required) | text (masked) | Patient, Patient Name | Patient, Patient, 患者名, 患者 |
| `recall_type` | text | Recall Type, Type, Recall, Interval Type | - |
| `due_date` (required) | date | Due Date, Recall Due, Due, Date Due, DateDue | Fälligkeitsdatum, Date d'échéance, 期日, 截止日期 |
| `last_visit` | date | Last Visit, Previous Date, Last Recall, DatePrevious, Last Hygiene | - |
| `next_appointment` | date | Next Appointment, Next Appt, Scheduled, DateScheduled, Appt Date | - |
| `hygienist` | text | Hygienist, Provider, Hyg, RDH | - |
| `last_contact` | date | Last Contact, Contacted, Last Reminder, Reminder Sent | - |
| `status` | text | Status, Patient Status, Active | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Curve Dental | Recall list export (CSV) | Patient, Recall Type, Recall Due, Next Appointment | no |

Where a layout says "checked", its column names were compared with the publisher's template or documentation on that date (the CMS price-transparency templates, the pfs.data.cms.gov column lists and Open Dental's published procedure log fields). The NCCI, MUE and RVU file headers and the other practice-management and clearinghouse layouts were written from knowledge of the export and were not checked; where the vendor's public help says something about the export, the layout's note says what. None was tested against a live account.

### Hygiene visits (`visits`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `patient_name` (required) | text (masked) | Patient, Patient Name | Patient, Patient, 患者名, 患者 |
| `visit_date` (required) | date | Date, Visit Date, Appointment Date, Date of Service | Datum, Date, 日付, 日期 |
| `hygienist` | text | Hygienist, Provider, Hyg, RDH | - |
| `next_appointment` | date | Next Appointment, Next Appt, Rebooked For, Next Visit | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-recall-gaps inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-recall-gaps can remember facts about your setup so the next run does not have to be told again. `recall_learn` only proposes a fact; it changes nothing until a named person accepts it with `recall_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-recall-gaps memory list
fairclinic-recall-gaps memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-recall-gaps memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-recall-gaps demo
npx -y fairclinic-recall-gaps mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-recall-gaps": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-recall-gaps",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-recall-gaps -- npx -y fairclinic-recall-gaps mcp --root .`, or install the `fairclinic-recall-gaps` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-recall-gaps approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-recall-gaps approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-recall-gaps kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-recall-gaps tools                 # every tool, its policy and arguments
fairclinic-recall-gaps sources               # the columns each input is read from
fairclinic-recall-gaps inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-recall-gaps call recall_check '{"recall":"<recall>"}'
fairclinic-recall-gaps eval                  # the private eval cases on the fictional fixtures
fairclinic-recall-gaps demo
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
