# Fairclinic Controlled Drugs (`fairclinic-controlled-drugs`)

Fairclinic Controlled Drugs: reconciles a veterinary controlled drug log (DEA schedule items) with the physical count: the balance worked out from the entries against the written balance and the count, arithmetic errors that hide a difference, waste with no witness, use with no patient, entries with no initials. It reports the log; it never decides compliance or files anything. Pet and client names are masked before results reach the model.

**Never files or reports anything to the DEA, a state board or the police. Never adds to, edits or corrects a controlled drug log. Never orders controlled drugs.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-controlled-drugs demo
npx -y fairclinic-controlled-drugs mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-controlled-drugs demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Controlled Drugs demo (fictional animal hospital, drugs, pets and staff, November 2026)

▶ Check the files
  status: executed  decision: allow
  4 drug(s), 16 log entr(ies). 6 item(s) to review: 2 count(s) that differ from the log, 1 arithmetic error(s) in written balances, 1 waste entr(ies) with no witness, 1 use(s) with no patient, 1 without initials, 0 drug(s) not counted. This reports the log; it is not a compliance finding.
    count_mismatch    Butorphanol 10 mg/mL         2026-11-15  Counted 36.5 on 2026-11-15; the log's entries add up to 37.5 (short by 1).
    count_mismatch    Hydromorphone 2 mg/mL        2026-11-15  Counted 17.5 on 2026-11-15; the log's entries add up to 17.7 (short by 0.2). The written balance (17.5) hides it because of 1 arithmetic error(s).
    balance_math      Hydromorphone 2 mg/mL        2026-11-09  Balance written as 18; 18.8 - 0.6 is 18.2 (off by -0.2).
    waste_no_witness  Ketamine 100 mg/mL           2026-11-05  Waste of 0.2 on 2026-11-05 with no witness recorded.
    no_patient        Ketamine 100 mg/mL           2026-11-08  0.5 administered on 2026-11-08 with no patient recorded.
    missing_initials  Butorphanol 10 mg/mL         2026-11-11  Entry on 2026-11-11 has no initials.

▶ Write the worklist for the team
  status: executed  decision: allow
  Controlled drug log reconciliation written: 4 drug(s), 16 log entr(ies). 6 item(s) to review: 2 count(s) that differ from the log, 1 arithmetic error(s) in written balances, 1 waste entr(ies) with no witness, 1 use(s) with no patient, 1 without initials, 0 drug(s) not counted. This reports the log; it is not a compliance finding. Files: fairclinic-out/drugs/drugs-reconciliation.csv, fairclinic-out/drugs/drugs-reconciliation.html.

▶ Agent tries regulator file itself
  status: blocked  decision: block
  reason: Never files or reports anything to the DEA, a state board or the police.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `drugs_check` | Per drug: the balance worked out from the log entries against the written balance and the physical count; per entry: arithmetic errors, waste with no witness, use with no patient, no initials. | runs |
| `drugs_write_report` | Write drugs-reconciliation.csv (one row per item, with blank owner and decision columns for your team) and drugs-reconciliation.html into out_dir (default fairclinic-out/drugs). | runs |
| `drugs_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `drugs_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `drugs_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `drugs_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `regulator_file` | Never files or reports anything to the DEA, a state board or the police. | refused |
| `log_edit` | Never adds to, edits or corrects a controlled drug log. | refused |
| `order_place` | Never orders controlled drugs. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Controlled drug log (`log`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` (required) | date | Date, Entry Date, Date Used | Datum, Date, 日付, 日期 |
| `drug` (required) | text | Drug, Drug Name, Item, Product, Medication | - |
| `schedule` | text | Schedule, DEA Schedule, Class, CII-CV | - |
| `entry_type` (required) | text | Type, Entry Type, Transaction, Action | Typ, Type, 種類, 类型 |
| `quantity` (required) | number | Quantity, Qty, Amount, Volume, Units | Menge, Quantité, 数量, 数量 |
| `running_balance` | number | Running Balance, Balance, Balance On Hand, On Hand | - |
| `patient_name` | text (masked) | Patient, Pet, Animal, Patient Name | Patient, Patient, 患者名, 患者 |
| `client_name` | text (masked) | Client, Owner, Client Name | - |
| `initials` | text | Initials, Staff, By, User | - |
| `witness` | text | Witness, Witnessed By, Second Signature | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| AVImark | Controlled drug log report, exported to CSV | Drug Name, Trans Date, Qty, Balance, Initials | no |

Where a layout says "checked", its column names were compared with the publisher's template or documentation on that date (the CMS price-transparency templates, the pfs.data.cms.gov column lists and Open Dental's published procedure log fields). The NCCI, MUE and RVU file headers and the other practice-management and clearinghouse layouts were written from knowledge of the export and were not checked; where the vendor's public help says something about the export, the layout's note says what. None was tested against a live account.

### Physical counts (`counts`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `drug` (required) | text | Drug, Drug Name, Item, Product, Medication, Item Name | - |
| `counted` (required) | number | Counted, Count, Physical Count, Quantity On Hand, On Hand | - |
| `count_date` | date | Count Date, Date, Counted On | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-controlled-drugs inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-controlled-drugs can remember facts about your setup so the next run does not have to be told again. `drugs_learn` only proposes a fact; it changes nothing until a named person accepts it with `drugs_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-controlled-drugs memory list
fairclinic-controlled-drugs memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-controlled-drugs memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-controlled-drugs demo
npx -y fairclinic-controlled-drugs mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-controlled-drugs": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-controlled-drugs",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-controlled-drugs -- npx -y fairclinic-controlled-drugs mcp --root .`, or install the `fairclinic-controlled-drugs` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-controlled-drugs approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-controlled-drugs approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-controlled-drugs kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-controlled-drugs tools                 # every tool, its policy and arguments
fairclinic-controlled-drugs sources               # the columns each input is read from
fairclinic-controlled-drugs inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-controlled-drugs call drugs_check '{"log":"<log>","counts":"<counts>"}'
fairclinic-controlled-drugs eval                  # the private eval cases on the fictional fixtures
fairclinic-controlled-drugs demo
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
