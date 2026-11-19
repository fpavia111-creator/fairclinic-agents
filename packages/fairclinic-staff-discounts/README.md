# Fairclinic Staff Discounts (`fairclinic-staff-discounts`)

Fairclinic Staff Discounts: veterinary discounts and write-offs on invoices against your own policy: approved by the person who gave them or with no approver above your limit, staff discounts on accounts not on the staff list, discounts above your percent limit and discounts with no reason, with totals by the person who entered them. A flag is a question for a manager, not a finding about anyone. Client names are masked before results reach the model.

**Never changes invoices or discounts; a person makes any correction there. Never disciplines, messages or reports a member of staff. Never refunds, credits or pays anyone.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-staff-discounts demo
npx -y fairclinic-staff-discounts mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-staff-discounts demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Staff Discounts demo (fictional animal hospital, staff and clients, November 2026)

▶ Check the files
  status: executed  decision: allow
  6 discount(s) and write-off(s), 815 in total. 4 to review against your policy: 1 approved by the person who gave them, 1 with no approver, 1 staff discount(s) on accounts not on the staff list, 1 above your percent limit, 2 without a reason.
    self_approved             INV-405 Write-off                420  by Lee Tech, approved Lee Tech
    no_approver               INV-402 Courtesy                 180  by Lee Tech, approved -
    staff_discount_non_staff  INV-403 Staff discount 30%        90  by Kim Desk, approved Dr. Cora Example
    no_reason                 INV-406 Courtesy                  40  by Kim Desk, approved -

▶ Write the worklist for the team
  status: executed  decision: allow
  Discounts and write-offs by staff written: 6 discount(s) and write-off(s), 815 in total. 4 to review against your policy: 1 approved by the person who gave them, 1 with no approver, 1 staff discount(s) on accounts not on the staff list, 1 above your percent limit, 2 without a reason. Files: fairclinic-out/discounts/discounts-by-staff.csv, fairclinic-out/discounts/discounts-by-staff.html.

▶ Agent tries pms update itself
  status: blocked  decision: block
  reason: Never changes invoices or discounts; a person makes any correction there.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `discounts_check` | Every discount or write-off against your policy, with a status: self_approved, no_approver, staff_discount_non_staff, high_pct, no_reason or ok; totals by the person who entered them and by type. | runs |
| `discounts_by_staff` | Per person who entered them: count, amount, share of the total and how many are flagged. | runs |
| `discounts_write_report` | Write discounts-by-staff.csv (one row per item, with blank owner and decision columns for your team) and discounts-by-staff.html into out_dir (default fairclinic-out/discounts). | runs |
| `discounts_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `discounts_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `discounts_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `discounts_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `pms_update` | Never changes invoices or discounts; a person makes any correction there. | refused |
| `staff_action` | Never disciplines, messages or reports a member of staff. | refused |
| `refund_issue` | Never refunds, credits or pays anyone. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Discounts and write-offs (`discounts`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` (required) | date | Date, Invoice Date, Discount Date | Datum, Date, 日付, 日期 |
| `invoice_number` | text | Invoice, Invoice #, Invoice Number | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `client_name` | text (masked) | Client, Owner, Client Name, Account Name | - |
| `discount_type` (required) | text | Type, Discount Type, Discount, Adjustment Type | Typ, Type, 種類, 类型 |
| `amount` (required) | amount | Amount, Discount Amount, Write-off, Adjustment | Betrag, Montant, 金額, 金额 |
| `invoice_total` | amount | Invoice Total, Total Before Discount, Gross, Invoice Amount | - |
| `entered_by` | text | Entered By, Staff, User, Operator | - |
| `approved_by` | text | Approved By, Approver, Authorized By | - |
| `reason` | text | Reason, Note, Comment, Memo | Verwendungszweck, Libellé, 摘要, 摘要 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-staff-discounts inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-staff-discounts can remember facts about your setup so the next run does not have to be told again. `discounts_learn` only proposes a fact; it changes nothing until a named person accepts it with `discounts_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-staff-discounts memory list
fairclinic-staff-discounts memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-staff-discounts memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-staff-discounts demo
npx -y fairclinic-staff-discounts mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-staff-discounts": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-staff-discounts",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-staff-discounts -- npx -y fairclinic-staff-discounts mcp --root .`, or install the `fairclinic-staff-discounts` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-staff-discounts approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-staff-discounts approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-staff-discounts kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-staff-discounts tools                 # every tool, its policy and arguments
fairclinic-staff-discounts sources               # the columns each input is read from
fairclinic-staff-discounts inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-staff-discounts call discounts_check '{"discounts":"<discounts>"}'
fairclinic-staff-discounts eval                  # the private eval cases on the fictional fixtures
fairclinic-staff-discounts demo
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
