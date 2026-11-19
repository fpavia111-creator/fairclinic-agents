# Fairclinic Supply Costs (`fairclinic-supply-costs`)

Fairclinic Supply Costs: dental or veterinary supplier invoices against production: supplies as a percent of production by month, unit prices up from the last price paid, the same line twice on an invoice, and categories far above their other months. It never pays a supplier or places an order.

**Never pays an invoice, a person or a supplier. Never places, changes or cancels a supply order.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-supply-costs demo
npx -y fairclinic-supply-costs mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-supply-costs demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Supply Costs demo (fictional practice and suppliers, August to October 2026)

▶ Check the files
  status: executed  decision: allow
  17 supply line(s) over 3 month(s): 10602, 5.92% of production. 3 to review: 1 repeated line(s), 1 price increase(s), 1 month(s) over target, 1 category spike(s).
    over_target     2026-10  supplies 4650 (7.62%)
    duplicate_line  2026-10  Example Dental Supply: Composite A2 syringe 640
    price_increase  2026-10  Example Dental Supply: Nitrile gloves (box) 960

▶ Write the worklist for the team
  status: executed  decision: allow
  Supply costs written: 17 supply line(s) over 3 month(s): 10602, 5.92% of production. 3 to review: 1 repeated line(s), 1 price increase(s), 1 month(s) over target, 1 category spike(s). Files: fairclinic-out/supplies/supplies-review.csv, fairclinic-out/supplies/supplies-review.html.

▶ Agent tries payment send itself
  status: blocked  decision: block
  reason: Never pays an invoice, a person or a supplier.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `supplies_check` | Each month with supplies, production and supplies as a percent of production, plus supplier lines with a problem, with a status: duplicate_line, price_increase, over_target, category_spike or ok. | runs |
| `supplies_write_report` | Write supplies-review.csv (one row per item, with blank owner and decision columns for your team) and supplies-review.html into out_dir (default fairclinic-out/supplies). | runs |
| `supplies_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `supplies_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `supplies_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `supplies_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `payment_send` | Never pays an invoice, a person or a supplier. | refused |
| `order_place` | Never places, changes or cancels a supply order. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Supplier invoice lines (`invoices`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `supplier` (required) | text | Supplier, Vendor, Distributor | Lieferant, Fournisseur, 仕入先, 供应商 |
| `invoice_number` | text | Invoice, Invoice #, Invoice Number, Order # | Rechnungsnummer, N° de facture, 請求書番号, 发票号 |
| `date` (required) | date | Date, Invoice Date, Order Date | Datum, Date, 日付, 日期 |
| `item` (required) | text | Item, Description, Product, Item Description | Artikel, Article, 品目, 物料 |
| `category` | text | Category, Product Category, Class | Kategorie, Catégorie, 経費科目, 费用类别 |
| `qty` | number | Qty, Quantity, Units | Menge, Quantité, 数量, 数量 |
| `unit_price` | amount | Unit Price, Price, Each, Unit Cost | Einzelpreis, Prix unitaire, 単価, 单价 |
| `amount` | amount | Amount, Extended, Line Total, Total | Betrag, Montant, 金額, 金额 |

### Production by month (`production`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `month` (required) | text | Month, Period | - |
| `production` (required) | amount | Production, Net Production, Gross Production, Collections | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-supply-costs inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-supply-costs can remember facts about your setup so the next run does not have to be told again. `supplies_learn` only proposes a fact; it changes nothing until a named person accepts it with `supplies_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-supply-costs memory list
fairclinic-supply-costs memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-supply-costs memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-supply-costs demo
npx -y fairclinic-supply-costs mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-supply-costs": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-supply-costs",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-supply-costs -- npx -y fairclinic-supply-costs mcp --root .`, or install the `fairclinic-supply-costs` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-supply-costs approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-supply-costs approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-supply-costs kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-supply-costs tools                 # every tool, its policy and arguments
fairclinic-supply-costs sources               # the columns each input is read from
fairclinic-supply-costs inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-supply-costs call supplies_check '{"invoices":"<invoices>"}'
fairclinic-supply-costs eval                  # the private eval cases on the fictional fixtures
fairclinic-supply-costs demo
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
