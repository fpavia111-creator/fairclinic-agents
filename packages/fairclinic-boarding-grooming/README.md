# Fairclinic Boarding Grooming (`fairclinic-boarding-grooming`)

Fairclinic Boarding and Grooming: boarding, daycare and grooming reservations against invoice lines: stays with no invoice, fewer nights or days invoiced than stayed, and booked add-ons not invoiced, valued at your list prices. It never changes an invoice or charges a client. Pet and client names are masked before results reach the model.

**Never changes invoices or reservations; a person makes any correction there. Never charges a client or a card.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-boarding-grooming demo
npx -y fairclinic-boarding-grooming mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-boarding-grooming demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Boarding and Grooming demo (fictional animal hospital, pets and clients, November 2026) in C:\Users\fpavi\AppData\Local\Temp\fairclinic-boarding-grooming-demo-UiP5UO

▶ Check the files
  status: executed  decision: allow
  6 reservation(s), 1 cancelled. 3 to review: 1 with no invoice, 1 with fewer nights or days invoiced than stayed, 2 add-on(s) not invoiced. About 155 not charged at list price.
    not_invoiced        R3 Grooming - full  stayed 1 invoiced 0  missed 75
    nights_short        R2 Boarding         stayed 7 invoiced 6  missed 50
    addon_not_invoiced  R4 Boarding         stayed 3 invoiced 3  missed 30

▶ Write the worklist for the team
  status: executed  decision: allow
  Boarding and grooming invoices written: 6 reservation(s), 1 cancelled. 3 to review: 1 with no invoice, 1 with fewer nights or days invoiced than stayed, 2 add-on(s) not invoiced. About 155 not charged at list price. Files: fairclinic-out/boarding/boarding-invoices.csv, fairclinic-out/boarding/boarding-invoices.html.

▶ Agent tries pms update itself
  status: blocked  decision: block
  reason: Never changes invoices or reservations; a person makes any correction there.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `boarding_check` | Every reservation with the nights or days stayed against the units invoiced and every add-on against the invoice, with a status: not_invoiced, nights_short, addon_not_invoiced, ok or cancelled, valued at your list pri… | runs |
| `boarding_write_report` | Write boarding-invoices.csv (one row per item, with blank owner and decision columns for your team) and boarding-invoices.html into out_dir (default fairclinic-out/boarding). | runs |
| `boarding_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `boarding_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `boarding_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `boarding_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `pms_update` | Never changes invoices or reservations; a person makes any correction there. | refused |
| `client_charge` | Never charges a client or a card. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Reservations (`reservations`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `reservation_id` (required) | text | Reservation, Reservation ID, Booking, Booking ID, Res # | - |
| `client_name` | text (masked) | Client, Owner, Client Name | - |
| `patient_name` | text (masked) | Patient, Pet, Animal, Patient Name | Patient, Patient, 患者名, 患者 |
| `service` (required) | text | Service, Type, Reservation Type | - |
| `check_in` (required) | date | Check In, Check-in, Start, Arrival | - |
| `check_out` | date | Check Out, Check-out, End, Departure | - |
| `add_ons` | text | Add-ons, Add Ons, Extras, Requested Services | - |
| `status` | text | Status, Reservation Status | - |

### Invoice lines (`invoices`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `invoice_number` | text | Invoice Number, Invoice #, Invoice | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `reservation_id` (required) | text | Reservation, Reservation ID, Booking, Res # | - |
| `patient_name` | text (masked) | Patient, Pet, Animal | Patient, Patient, 患者名, 患者 |
| `item` (required) | text | Item, Product, Service, Description | Artikel, Article, 品目, 物料 |
| `qty` | number | Qty, Quantity, Units, Nights | Menge, Quantité, 数量, 数量 |
| `amount` | amount | Amount, Total, Line Total | Betrag, Montant, 金額, 金额 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Shepherd | Invoice item export (CSV) | Invoice Number, Client, Patient, Item, Amount | no |

Where a layout says "checked", its column names were compared with the publisher's template or documentation on that date (the CMS price-transparency templates, the pfs.data.cms.gov column lists and Open Dental's published procedure log fields). The NCCI, MUE and RVU file headers and the other practice-management and clearinghouse layouts were written from knowledge of the export and were not checked; where the vendor's public help says something about the export, the layout's note says what. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-boarding-grooming inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-boarding-grooming can remember facts about your setup so the next run does not have to be told again. `boarding_learn` only proposes a fact; it changes nothing until a named person accepts it with `boarding_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-boarding-grooming memory list
fairclinic-boarding-grooming memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-boarding-grooming memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-boarding-grooming demo
npx -y fairclinic-boarding-grooming mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-boarding-grooming": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-boarding-grooming",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-boarding-grooming -- npx -y fairclinic-boarding-grooming mcp --root .`, or install the `fairclinic-boarding-grooming` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-boarding-grooming approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-boarding-grooming approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-boarding-grooming kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-boarding-grooming tools                 # every tool, its policy and arguments
fairclinic-boarding-grooming sources               # the columns each input is read from
fairclinic-boarding-grooming inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-boarding-grooming call boarding_check '{"reservations":"<reservations>","invoices":"<invoices>"}'
fairclinic-boarding-grooming eval                  # the private eval cases on the fictional fixtures
fairclinic-boarding-grooming demo
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
