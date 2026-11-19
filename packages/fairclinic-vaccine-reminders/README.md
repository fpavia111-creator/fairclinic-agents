# Fairclinic Vaccine Reminders (`fairclinic-vaccine-reminders`)

Fairclinic Vaccine Reminders: reads the veterinary practice system's reminder list for pets that are overdue and not booked, overdue with no recent reminder, due soon with no reminder, clients with no e-mail or phone, and reminders sent for pets marked deceased or inactive. Due dates come from your system; it never sets a schedule or sends a reminder. Pet and client names are masked before results reach the model.

**Never sends a text, e-mail, letter or post; drafts wait for one named person. Never changes reminders or patient records; a person makes any correction there. Never diagnoses, recommends treatment or tells a patient or client what care to have.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-vaccine-reminders demo
npx -y fairclinic-vaccine-reminders mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-vaccine-reminders demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Vaccine Reminders demo (fictional animal hospital, pets and clients, as of 2026-11-16)

▶ Check the files
  status: executed  decision: allow
  10 reminder(s), 8 for active pets, 37.5% not yet due. 4 overdue and not booked. 5 to act on: 1 reminder(s) sent for pets marked deceased or inactive, 2 overdue with no recent reminder, 1 with no way to reach the client, 1 due soon with no reminder.
    sent_to_inactive      Canine  DHPP             A reminder went out on 2026-11-02 for a pet marked deceased. Check the reminder settings for this pet.
    overdue_no_contact    Feline  FVRCP            Overdue 47 days (due 2026-09-30), not booked, last reminder 76 days ago.
    overdue_no_contact    Feline  Rabies 1 year    Overdue 14 days (due 2026-11-02), not booked, no reminder recorded.
    no_contact_info       Canine  Bordetella       Overdue 93 days and there is no e-mail or phone on file to remind the client.
    due_soon_no_reminder  Canine  Rabies 3 year    Due in 9 day(s) (2026-11-25) and no reminder recorded.
    overdue_reminded      Feline  Rabies 1 year    Overdue 27 days; reminded 6 day(s) ago.

▶ Write the worklist for the team
  status: executed  decision: allow
  Vaccine reminder follow-up written: 10 reminder(s), 8 for active pets, 37.5% not yet due. 4 overdue and not booked. 5 to act on: 1 reminder(s) sent for pets marked deceased or inactive, 2 overdue with no recent reminder, 1 with no way to reach the client, 1 due soon with no reminder. Files: fairclinic-out/vaccines/vaccines-reminders.csv, fairclinic-out/vaccines/vaccines-reminders.html.

▶ Agent tries message send itself
  status: blocked  decision: block
  reason: Never sends a text, e-mail, letter or post; drafts wait for one named person.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `vaccines_check` | Every reminder with a status: sent_to_inactive, overdue_no_contact, no_contact_info, due_soon_no_reminder, overdue_reminded, reminded, booked, not_due or inactive, and overdue counts by reminder. | runs |
| `vaccines_write_report` | Write vaccines-reminders.csv (one row per item, with blank owner and decision columns for your team) and vaccines-reminders.html into out_dir (default fairclinic-out/vaccines). | runs |
| `vaccines_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `vaccines_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `vaccines_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `vaccines_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `message_send` | Never sends a text, e-mail, letter or post; drafts wait for one named person. | refused |
| `pms_update` | Never changes reminders or patient records; a person makes any correction there. | refused |
| `clinical_advice` | Never diagnoses, recommends treatment or tells a patient or client what care to have. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Reminder list (`reminders`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `client_id` | text (masked) | Client ID, Client #, Account, Owner ID | - |
| `client_name` | text (masked) | Client, Client Name, Owner, Owner Name | - |
| `patient_name` (required) | text (masked) | Patient Name, Patient, Pet, Animal | Patient, Patient, 患者名, 患者 |
| `species` | text | Species, Animal Type | - |
| `reminder` (required) | text | Reminder Description, Reminder, Description, Service, Vaccine | - |
| `due_date` (required) | date | Due Date, Due, Date Due, Next Due | Fälligkeitsdatum, Date d'échéance, 期日, 截止日期 |
| `last_given` | date | Last Given, Last Done, Date Given, Previous | - |
| `reminder_sent` | date | Reminder Sent, Last Reminder, Sent, Last Sent | - |
| `next_appointment` | date | Next Appointment, Next Appt, Appointment, Scheduled | - |
| `patient_status` | text | Patient Status, Status, Active | - |
| `client_email` | text (masked) | Email, Client Email, E-mail | - |
| `client_phone` | text (masked) | Phone, Client Phone, Mobile, Cell | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Cornerstone | Reminder list report, exported to CSV | Client ID, Patient Name, Reminder Description, Due Date | no |

Where a layout says "checked", its column names were compared with the publisher's template or documentation on that date (the CMS price-transparency templates, the pfs.data.cms.gov column lists and Open Dental's published procedure log fields). The NCCI, MUE and RVU file headers and the other practice-management and clearinghouse layouts were written from knowledge of the export and were not checked; where the vendor's public help says something about the export, the layout's note says what. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-vaccine-reminders inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-vaccine-reminders can remember facts about your setup so the next run does not have to be told again. `vaccines_learn` only proposes a fact; it changes nothing until a named person accepts it with `vaccines_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-vaccine-reminders memory list
fairclinic-vaccine-reminders memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-vaccine-reminders memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-vaccine-reminders demo
npx -y fairclinic-vaccine-reminders mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-vaccine-reminders": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-vaccine-reminders",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-vaccine-reminders -- npx -y fairclinic-vaccine-reminders mcp --root .`, or install the `fairclinic-vaccine-reminders` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-vaccine-reminders approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-vaccine-reminders approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-vaccine-reminders kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-vaccine-reminders tools                 # every tool, its policy and arguments
fairclinic-vaccine-reminders sources               # the columns each input is read from
fairclinic-vaccine-reminders inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-vaccine-reminders call vaccines_check '{"reminders":"<reminders>"}'
fairclinic-vaccine-reminders eval                  # the private eval cases on the fictional fixtures
fairclinic-vaccine-reminders demo
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
