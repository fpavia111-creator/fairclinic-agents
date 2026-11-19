# Fairclinic Lab Cases (`fairclinic-lab-cases`)

Fairclinic Lab Cases: the dental lab case log against seat appointments, billing and lab invoices: cases not back for the seat appointment, overdue from the lab, seated and not billed, remakes charged, duplicate invoices, invoices for cases not in the log or not back yet, and returned cases with no invoice. It never pays a lab or changes a case. Patient names are masked before results reach the model.

**Never pays an invoice, a person or a supplier. Never changes appointments or procedures; a person makes any correction there. Never orders, cancels or changes a lab case.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-lab-cases demo
npx -y fairclinic-lab-cases mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-lab-cases demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Lab Cases demo (fictional dental practice, labs and patients, as of 2026-11-16) in C:\Users\fpavi\AppData\Local\Temp\fairclinic-lab-cases-demo-IFVSFx

▶ Check the files
  status: executed  decision: allow
  7 case(s), 6 invoice line(s) for 2090. 8 to work: 1 not back for the seat appointment, 1 overdue from the lab, 1 seated and not billed, 1 remake(s) charged (285), 1 duplicate(s) (285), 1 invoice(s) not in the log, 1 invoiced before return, 1 with no invoice yet.
    not_back_for_seat  L502            Example Crown Lab      Not back from the lab and the seat appointment is in 1 day(s) (2026-11-17). Call the lab or move the appointment.
    overdue_from_lab   L503            Sample Denture Studio  Due back 2026-11-10, 6 day(s) ago.
    seated_not_billed  L504            Example Crown Lab      Seated 2026-10-30 and not marked billed: check the procedure was posted and the claim sent.
    remake_charged     L506  INV-9004  Example Crown Lab      Remake of case L506 charged 285; many labs remake at no charge, so ask for a credit if yours does.
    duplicate_invoice  L504  INV-9002  Example Crown Lab      Invoice INV-9002 from Example Crown Lab appears more than once.
    invoice_no_case    L999  INV-9003  Example Crown Lab      Case L999 is not in the case log.
    case_not_returned  L503  INV-7710  Sample Denture Studio  Invoiced for case L503, which the log shows as not back from the lab.
    no_invoice         L505            Example Crown Lab      Returned 2026-10-03 and no invoice for this case in the file after 44 days (it may be on a monthly statement).

▶ Write the worklist for the team
  status: executed  decision: allow
  Lab cases and invoices written: 7 case(s), 6 invoice line(s) for 2090. 8 to work: 1 not back for the seat appointment, 1 overdue from the lab, 1 seated and not billed, 1 remake(s) charged (285), 1 duplicate(s) (285), 1 invoice(s) not in the log, 1 invoiced before return, 1 with no invoice yet. Files: fairclinic-out/labs/labs-worklist.csv, fairclinic-out/labs/labs-worklist.html.

▶ Agent tries payment send itself
  status: blocked  decision: block
  reason: Never pays an invoice, a person or a supplier.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `labs_check` | Every lab case and every invoice line with a problem, with a status: not_back_for_seat, overdue_from_lab, seated_not_billed, remake_charged, duplicate_invoice, invoice_no_case, case_not_returned, no_invoice, late_retu… | runs |
| `labs_write_report` | Write labs-worklist.csv (one row per item, with blank owner and decision columns for your team) and labs-worklist.html into out_dir (default fairclinic-out/labs). | runs |
| `labs_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `labs_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `labs_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `labs_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `payment_send` | Never pays an invoice, a person or a supplier. | refused |
| `pms_update` | Never changes appointments or procedures; a person makes any correction there. | refused |
| `lab_order` | Never orders, cancels or changes a lab case. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Lab case log (`cases`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `case_id` (required) | text | Case, Case #, Case ID, Lab Case, Rx # | - |
| `patient_name` | text (masked) | Patient, Patient Name | Patient, Patient, 患者名, 患者 |
| `lab` | text | Lab, Laboratory, Lab Name | Lieferant, Fournisseur, 仕入先, 供应商 |
| `case_type` | text | Type, Case Type, Restoration, Description | Typ, Type, 種類, 类型 |
| `sent_date` | date | Sent, Date Sent, Sent Date | - |
| `due_date` | date | Due, Due Date, Due Back | Fälligkeitsdatum, Date d'échéance, 期日, 截止日期 |
| `returned_date` | date | Returned, Date Returned, Received, Received Date | - |
| `seat_date` | date | Seat Appointment, Seat Date, Appointment, Seat Appt | - |
| `seated_date` | date | Seated, Date Seated, Delivered | - |
| `billed` | text | Billed, Procedure Billed, Claim Sent, Charged | - |

### Lab invoices (`invoices`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `invoice_number` (required) | text | Invoice, Invoice #, Invoice Number, Inv # | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `lab` | text | Lab, Laboratory, Vendor, Lab Name | Lieferant, Fournisseur, 仕入先, 供应商 |
| `case_id` | text | Case, Case #, Case ID, Pan #, Rx # | - |
| `date` | text | Date, Invoice Date | Datum, Date, 日付, 日期 |
| `amount` (required) | amount | Amount, Total, Charge, Invoice Amount | Betrag, Montant, 金額, 金额 |
| `remake` | text | Remake, Is Remake, Redo | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-lab-cases inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-lab-cases can remember facts about your setup so the next run does not have to be told again. `labs_learn` only proposes a fact; it changes nothing until a named person accepts it with `labs_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-lab-cases memory list
fairclinic-lab-cases memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-lab-cases memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-lab-cases demo
npx -y fairclinic-lab-cases mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-lab-cases": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-lab-cases",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-lab-cases -- npx -y fairclinic-lab-cases mcp --root .`, or install the `fairclinic-lab-cases` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-lab-cases approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-lab-cases approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-lab-cases kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-lab-cases tools                 # every tool, its policy and arguments
fairclinic-lab-cases sources               # the columns each input is read from
fairclinic-lab-cases inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-lab-cases call labs_check '{"cases":"<cases>"}'
fairclinic-lab-cases eval                  # the private eval cases on the fictional fixtures
fairclinic-lab-cases demo
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
