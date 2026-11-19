# Fairclinic ERA Posting (`fairclinic-era-posting`)

Fairclinic ERA Posting: reads dental ERAs (835 files or remittance exports) and compares each claim with what was posted in the practice system: payments not posted, posted amounts that differ, contractual write-offs that differ from the ERA, denials written off as contractual, reversals, postings that are not on the ERA, and check totals that do not tie. Patient names are masked before results reach the model.

**Never changes payments or write-offs in the practice-management system; a person makes any correction there. Never bills or files with a dental carrier; a person does, after review. Never refunds, credits or pays anyone.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-era-posting demo
npx -y fairclinic-era-posting mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-era-posting demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic ERA Posting demo (fictional dental practice, carriers and patients)

▶ Check the files
  status: executed  decision: allow
  7 ERA claim(s), 1550.6 paid; 1868.8 posted against those checks. 1 not posted (76.8), 2 posted differently, 1 denial(s) written off, 0 denial(s) to work, 1 reversal(s), 1 posting(s) not on the ERA, 2 check(s) that do not tie.
    writeoff_mismatch   C2002  EFT1101   ERA     588  posted     588
    not_posted          C2003  EFT1101   ERA    76.8  posted       -
    denial_written_off  C2004  EFT1101   ERA       0  posted       0
    payment_mismatch    C2005  CHK55210  ERA     625  posted     652
    reversal            C2006  CHK55210  ERA    -248  posted       -
    not_on_era          C2009  EFT1101   ERA       -  posted     120

▶ Write the worklist for the team
  status: executed  decision: allow
  ERA posting check written: 7 ERA claim(s), 1550.6 paid; 1868.8 posted against those checks. 1 not posted (76.8), 2 posted differently, 1 denial(s) written off, 0 denial(s) to work, 1 reversal(s), 1 posting(s) not on the ERA, 2 check(s) that do not tie. Files: fairclinic-out/era/era-posting.csv, fairclinic-out/era/era-posting.html.

▶ Agent tries pms update itself
  status: blocked  decision: block
  reason: Never changes payments or write-offs in the practice-management system; a person makes any correction there.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `era_check` | Every ERA claim with what the ERA paid, the contractual write-off and patient portion it shows, and what was posted, with a status: reversal, denial_written_off, denied, not_posted, payment_mismatch, writeoff_mismatch… | runs |
| `era_explain` | One claim's ERA lines, adjustments and posting, with each finding in plain words. | runs |
| `era_write_report` | Write era-posting.csv (one row per item, with blank owner and decision columns for your team) and era-posting.html into out_dir (default fairclinic-out/era). | runs |
| `era_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `era_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `era_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `era_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `pms_update` | Never changes payments or write-offs in the practice-management system; a person makes any correction there. | refused |
| `claim_submit` | Never bills or files with a dental carrier; a person does, after review. | refused |
| `refund_issue` | Never refunds, credits or pays anyone. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### ERA or remittance export (835 files are read directly) (`era`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `claim_id` (required) | text | Claim ID, Patient Control Number, Claim Number, Claim #, Encounter ID, Encounter | - |
| `payer_claim_id` | text | Payer Claim Number, ICN, Payer Claim ID, Claim Control Number, Payer ICN, Payer Claim Control Number | - |
| `patient_name` | text (masked) | Patient, Patient Name, Pt Name | Patient, Patient, 患者名, 患者 |
| `member_id` | text (masked) | Member ID, Subscriber ID, Insured ID, Policy Number | - |
| `account` | text (masked) | Account Number, Patient Account, Acct #, Account # | - |
| `payer` | text | Payer, Payer Name, Insurance, Payor, Carrier, Insurance Company | Kostenträger, Payeur, 保険者, 付款方 |
| `payer_id` | text | Payer ID, Payor ID | - |
| `check_number` | text | Check Number, Check #, EFT Number, EFT Trace, Trace Number, Payment Reference | - |
| `payment_date` | date | Payment Date, Check Date, Paid Date, Remit Date, EFT Date, Check/EFT Date | - |
| `claim_status` | text | Claim Status Code, Status Code, CLP02, Claim Status | - |
| `date_of_service` | date | DOS, Date of Service, Service Date, From Date | Leistungsdatum, Date de soins, 診療日, 服务日期 |
| `code` | text | CPT, CPT Code, Procedure, Procedure Code, HCPCS, Proc Code | - |
| `modifiers` | text | Modifiers, Modifier, Mod | - |
| `units` | number | Units, Qty, Paid Units, Units Paid | Anzahl, Quantité, 回数, 数量 |
| `billed` | amount | Billed, Charge, Billed Amount, Charges, Submitted Charge, Charge Amount | Rechnungsbetrag, Montant facturé, 請求額, 账单金额 |
| `allowed` | amount | Allowed, Allowed Amount, Allowable, Allowed Amt | Anerkannt, Montant admis, 許容額, 允许金额 |
| `paid` | amount | Paid, Paid Amount, Payment, Insurance Paid, Payer Paid, Ins Paid | Bezahlt, Payé, 支払額, 已付 |
| `patient_responsibility` | amount | Patient Responsibility, Pt Resp, PR Amount, Patient Portion, Patient Resp | - |
| `adjustment_group` | text | Group Code, Adj Group, Adjustment Group, CAS Group, Group | - |
| `adjustment_reason` | text | Reason Code, CARC, Adj Reason, Adjustment Reason, Adjustment Code, Denial Code | - |
| `adjustment_amount` | amount | Adjustment, Adj Amount, Adjustment Amount, Adj Amt, Write Off, Contractual | - |
| `adjustments` | text | Adjustments, Adjustment Codes, CARC Codes, CAS, Adjustment Detail | - |
| `remarks` | text | Remark Codes, RARC, Remarks, Remark, Remark Code, RARC Codes | - |
| `rendering_npi` | text | Rendering NPI, Provider NPI, NPI | - |
| `provider` | text | Provider, Rendering Provider, Provider Name | Leistungserbringer, Prestataire, 医師, 医生 |
| `received_date` | date | Received Date, Date Received, Payer Received | - |
| `submitted_date` | date | Submitted, Submit Date, Date Submitted, Billed Date, Claim Date | - |

### Insurance payments posted (`posted`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `claim_id` (required) | text | Claim ID, Claim #, Claim Number, ClaimNum | - |
| `patient_name` | text (masked) | Patient, Patient Name, PatName | Patient, Patient, 患者名, 患者 |
| `payer` | text | Carrier, Carrier Name, Insurance, Payer | Kostenträger, Payeur, 保険者, 付款方 |
| `check_number` | text | Check Number, Check #, Check/EFT, EFT Number, Reference, CheckNum | - |
| `paid` | amount | Payment Posted, Ins Payment, Insurance Payment, Paid, InsPayAmt, Payment | Bezahlt, Payé, 支払額, 已付 |
| `writeoff` | amount | Write-off Posted, Write Off, Writeoff, Write-off, WriteOff, Adjustment | - |
| `posted_date` | date | Posted Date, Date Posted, Entry Date, DatePay | Datum, Date, 日付, 日期 |
| `posted_by` | text | Posted By, User, Entered By, Operator | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Open Dental | Open Dental claim payment query (CSV; database column names) | ClaimNum, InsPayAmt, WriteOff, CheckNum | no |

Where a layout says "checked", its column names were compared with the publisher's template or documentation on that date (the CMS price-transparency templates, the pfs.data.cms.gov column lists and Open Dental's published procedure log fields). The NCCI, MUE and RVU file headers and the other practice-management and clearinghouse layouts were written from knowledge of the export and were not checked; where the vendor's public help says something about the export, the layout's note says what. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-era-posting inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-era-posting can remember facts about your setup so the next run does not have to be told again. `era_learn` only proposes a fact; it changes nothing until a named person accepts it with `era_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-era-posting memory list
fairclinic-era-posting memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-era-posting memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-era-posting demo
npx -y fairclinic-era-posting mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-era-posting": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-era-posting",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-era-posting -- npx -y fairclinic-era-posting mcp --root .`, or install the `fairclinic-era-posting` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-era-posting approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-era-posting approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-era-posting kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-era-posting tools                 # every tool, its policy and arguments
fairclinic-era-posting sources               # the columns each input is read from
fairclinic-era-posting inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-era-posting call era_check '{"era":"<era>","posted":"<posted>"}'
fairclinic-era-posting eval                  # the private eval cases on the fictional fixtures
fairclinic-era-posting demo
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
