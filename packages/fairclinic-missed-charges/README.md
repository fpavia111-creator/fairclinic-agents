# Fairclinic Missed Charges (`fairclinic-missed-charges`)

Fairclinic Missed Charges: what a veterinary treatment sheet or medical record says was done, against what was invoiced, matched by visit (or pet and date) and item: items not invoiced, quantities invoiced short, lines at no charge to confirm, and invoiced items missing from the record, valued from your price list. Pet and client names are masked before results reach the model.

**Never changes invoices; a person makes any correction there. Never charges a client or a card. Never sends a text, e-mail, letter or post; drafts wait for one named person.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-missed-charges demo
npx -y fairclinic-missed-charges mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-missed-charges demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Missed Charges demo (fictional animal hospital, pets and clients, 12 and 13 November 2026)

▶ Check the files
  status: executed  decision: allow
  15 recorded line(s) over 5 visit(s). 5 to review: 2 not invoiced, 1 invoiced short, 1 at no charge, 1 invoiced but not on the record. About 240 not charged.
    not_invoiced           V1001  Ear cytology               recorded 1 invoiced 0  missed 45
    not_invoiced           V1002  CBC in-house               recorded 1 invoiced 0  missed 110
    qty_short              V1002  IV fluids (per day)        recorded 2 invoiced 1  missed 85
    no_charge              V1003  Nail trim                  recorded 1 invoiced 1  missed 0
    invoiced_not_recorded  V1005  Heartworm test             recorded 0 invoiced 1  missed 0

▶ Write the worklist for the team
  status: executed  decision: allow
  Missed charges written: 15 recorded line(s) over 5 visit(s). 5 to review: 2 not invoiced, 1 invoiced short, 1 at no charge, 1 invoiced but not on the record. About 240 not charged. Files: fairclinic-out/charges/charges-missed.csv, fairclinic-out/charges/charges-missed.html.

▶ Agent tries pms update itself
  status: blocked  decision: block
  reason: Never changes invoices; a person makes any correction there.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `charges_check` | Every line on the treatment sheet matched to the invoice by visit (or patient and date) and item, with a status: not_invoiced, qty_short, no_charge, invoiced_not_recorded or ok, and the value not charged from your pri… | runs |
| `charges_write_report` | Write charges-missed.csv (one row per item, with blank owner and decision columns for your team) and charges-missed.html into out_dir (default fairclinic-out/charges). | runs |
| `charges_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `charges_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `charges_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `charges_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `pms_update` | Never changes invoices; a person makes any correction there. | refused |
| `client_charge` | Never charges a client or a card. | refused |
| `message_send` | Never sends a text, e-mail, letter or post; drafts wait for one named person. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Treatment sheet items (`treatments`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `visit_id` | text | Visit, Visit ID, Consult ID, Consult, Encounter | - |
| `patient_name` (required) | text (masked) | Patient, Pet, Animal, Animal Name, Patient Name | Patient, Patient, 患者名, 患者 |
| `client_name` | text (masked) | Client, Owner, Client Name | - |
| `date` (required) | date | Date, Treatment Date, Visit Date | Datum, Date, 日付, 日期 |
| `item` (required) | text | Item, Treatment, Service, Product, Description, Product Name | Artikel, Article, 品目, 物料 |
| `qty` | number | Qty, Quantity, Units, Dose Count | Menge, Quantité, 数量, 数量 |
| `staff` | text | Staff, Done By, Performed By, Technician | - |

### Invoice lines (`invoices`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `invoice_number` | text | Invoice #, Invoice, Invoice Number, Invoice No | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `visit_id` | text | Visit, Visit ID, Consult ID, Consult, Encounter | - |
| `patient_name` (required) | text (masked) | Patient, Pet, Animal, Animal Name, Patient Name | Patient, Patient, 患者名, 患者 |
| `date` | text | Date, Invoice Date | Datum, Date, 日付, 日期 |
| `item` (required) | text | Item, Product Name, Product, Description, Service | Artikel, Article, 品目, 物料 |
| `qty` | number | Qty, Quantity, Units | Menge, Quantité, 数量, 数量 |
| `amount` | amount | Total (incl tax), Amount, Total, Line Total, Price | Betrag, Montant, 金額, 金额 |
| `note` | text | Note, Comment, Discount Reason | Verwendungszweck, Libellé, 摘要, 摘要 |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| ezyVet | Invoice lines export (CSV) | Invoice #, Animal Name, Product Name, Qty, Total (incl tax) | no |

Where a layout says "checked", its column names were compared with the publisher's template or documentation on that date (the CMS price-transparency templates, the pfs.data.cms.gov column lists and Open Dental's published procedure log fields). The NCCI, MUE and RVU file headers and the other practice-management and clearinghouse layouts were written from knowledge of the export and were not checked; where the vendor's public help says something about the export, the layout's note says what. None was tested against a live account.

### Price list (`prices`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `item` (required) | text | Item, Product, Product Name, Service, Description | Artikel, Article, 品目, 物料 |
| `price` (required) | amount | Price, Unit Price, Fee, Sell Price | Einzelpreis, Prix unitaire, 単価, 单价 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-missed-charges inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-missed-charges can remember facts about your setup so the next run does not have to be told again. `charges_learn` only proposes a fact; it changes nothing until a named person accepts it with `charges_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-missed-charges memory list
fairclinic-missed-charges memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-missed-charges memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-missed-charges demo
npx -y fairclinic-missed-charges mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-missed-charges": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-missed-charges",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-missed-charges -- npx -y fairclinic-missed-charges mcp --root .`, or install the `fairclinic-missed-charges` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-missed-charges approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-missed-charges approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-missed-charges kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-missed-charges tools                 # every tool, its policy and arguments
fairclinic-missed-charges sources               # the columns each input is read from
fairclinic-missed-charges inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-missed-charges call charges_check '{"treatments":"<treatments>","invoices":"<invoices>"}'
fairclinic-missed-charges eval                  # the private eval cases on the fictional fixtures
fairclinic-missed-charges demo
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
