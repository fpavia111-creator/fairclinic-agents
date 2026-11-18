# Otter of Claims (`otter-of-claims`)

Otter of Claims: dental insurance claims still unpaid, aged by date sent, with follow-up dates, timely-filing risk, unsent and duplicate claims, and a payer follow-up letter for one named person to send. Patient names are masked before results reach the model.

**Never bills or files with a dental carrier; a person does, after review. Never changes claim status in the practice-management system; a person makes any correction there. Never sends a text, e-mail, letter or post; drafts wait for one named person.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y otter-of-claims demo
npx -y otter-of-claims mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y otter-of-claims demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Otter of Claims demo (fictional dental practice and patients, as of 2026-11-16) in C:\Users\fpavi\AppData\Local\Temp\otter-of-claims-demo-vrM4ek

▶ Age the open claims
  status: executed  decision: allow
  10 open claim(s), 3804.6 outstanding (2859 over 60 days): 2 to follow up, 1 denied, 2 near or past the filing limit, 1 not sent, 1 possible duplicate(s), 1 secondary claim(s) not sent.
    follow_up          C1002      74 days       625  follow_up
    filing_risk        C1004      37 days       248  filing_risk, follow_up
    unsent             C1005       - days       148  unsent
    denied             C1006      61 days      1070  denied
    follow_up          C1007      41 days      76.8  follow_up
    duplicate          C1008      40 days      76.8  duplicate, follow_up
    secondary_not_sent C1009      32 days         0  secondary_not_sent
    filing_risk        C1012     348 days       380  filing_risk, follow_up

▶ Write the list for the billing team
  status: executed  decision: allow
  Open dental claims written: 10 open claim(s), 3804.6 outstanding (2859 over 60 days): 2 to follow up, 1 denied, 2 near or past the filing limit, 1 not sent, 1 possible duplicate(s), 1 secondary claim(s) not sent. Files: fairclinic-out/otter/otter-open-claims.csv, fairclinic-out/otter/otter-open-claims.html.

▶ Agent tries to send a claim itself
  status: blocked  decision: block
  reason: Never bills or files with a dental carrier; a person does, after review.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `otter_check` | Every open dental insurance claim with its age from the date sent, aging bucket, outstanding amount, filing-limit date, next follow-up date and status: denied, filing_risk, unsent, duplicate, follow_up, waiting, secon… | runs |
| `otter_explain` | One claim with its dates, amounts, filing-limit date and every finding in plain words. | runs |
| `otter_write_report` | Write otter-open-claims.csv (one row per item, with blank owner and decision columns for your team) and otter-open-claims.html into out_dir (default fairclinic-out/otter). | runs |
| `otter_draft_status_inquiry` | Write drafts/status_inquiry-<hash>.md: one carrier's open claims older than the follow-up age, as a status inquiry. | asks first (Auto can be opted in) |
| `otter_request_send` | After one named human click (even in Auto), record that the reviewed status inquiry draft is approved in status_inquiry-requests.csv. | one named click, even in Auto (`binding_send`) |
| `otter_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `otter_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `otter_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `otter_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `claim_submit` | Never bills or files with a dental carrier; a person does, after review. | refused |
| `pms_update` | Never changes claim status in the practice-management system; a person makes any correction there. | refused |
| `message_send` | Never sends a text, e-mail, letter or post; drafts wait for one named person. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Outstanding dental claims (`claims`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `claim_id` (required) | text | Claim ID, Claim #, Claim Number, ClaimNum, Claim No | - |
| `patient_name` | text (masked) | Patient, Patient Name, PatName | Patient, Patient, 患者名, 患者 |
| `payer` | text | Carrier, Carrier Name, Insurance, Insurance Carrier, Primary Carrier, Payer | Kostenträger, Payeur, 保険者, 付款方 |
| `claim_type` | text | Claim Type, Type, Primary/Secondary, ClaimType, Coverage | - |
| `provider` | text | Provider, Treating Provider, Dentist, ProvTreat | Leistungserbringer, Prestataire, 医師, 医生 |
| `date_of_service` | date | Date of Service, DOS, Service Date, Proc Date, DateService | Leistungsdatum, Date de soins, 診療日, 服务日期 |
| `date_sent` | date | Date Sent, Sent Date, Sent, DateSent, Submitted | - |
| `billed` | amount | Claim Amount, Claim Fee, Billed, Total Fee, ClaimFee, Amount Billed | Rechnungsbetrag, Montant facturé, 請求額, 账单金额 |
| `expected` | amount | Est. Insurance, Estimated Insurance, Ins Est, InsPayEst, Expected, Est Ins Portion | - |
| `paid` | amount | Paid, Ins Paid, InsPayAmt, Insurance Paid, Amount Paid | Bezahlt, Payé, 支払額, 已付 |
| `status` | text | Status, Claim Status, ClaimStatus | - |
| `last_follow_up` | date | Last Follow Up, Last Followup, Last Contact, Follow Up Date, Tracer Date | - |
| `secondary_payer` | text | Secondary Carrier, Secondary Insurance, Sec Carrier | - |

Named exports recognised by their column names:

| System | Export | Recognised by | Layout checked against vendor docs |
|---|---|---|---|
| Dentrix | Outstanding insurance claims report, exported to CSV | Patient Name, Carrier Name, Date Sent, Claim Amount | no |
| Open Dental | User query on the claim table (CSV; database column names) | ClaimNum, DateSent, ClaimFee, ClaimStatus | no; Open Dental claim status letters: U unsent, H hold, W waiting to send, S sent, R received. Otter reads R as closed and U, H and W as not sent. |

Where a layout says "checked", its column names were compared with the publisher's template or documentation on that date (the CMS price-transparency templates, the pfs.data.cms.gov column lists and Open Dental's published procedure log fields). The NCCI, MUE and RVU file headers and the other practice-management and clearinghouse layouts were written from knowledge of the export and were not checked; where the vendor's public help says something about the export, the layout's note says what. None was tested against a live account.

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx otter-of-claims inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

otter-of-claims can remember facts about your setup so the next run does not have to be told again. `otter_learn` only proposes a fact; it changes nothing until a named person accepts it with `otter_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
otter-of-claims memory list
otter-of-claims memory accept MEM-1a2b3c4d5e6f --as "Your Name"
otter-of-claims memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y otter-of-claims demo
npx -y otter-of-claims mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "otter-of-claims": {
      "command": "npx",
      "args": [
        "-y",
        "otter-of-claims",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add otter-of-claims -- npx -y otter-of-claims mcp --root .`, or install the `otter-of-claims` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `otter-of-claims approve <id> --as "Your Name"` (or on the local approvals page, `otter-of-claims approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`otter-of-claims kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
otter-of-claims tools                 # every tool, its policy and arguments
otter-of-claims sources               # the columns each input is read from
otter-of-claims inspect <file>        # how a file would be read (names and shapes, never values)
otter-of-claims call otter_check '{"claims":"<claims>"}'
otter-of-claims eval                  # the private eval cases on the fictional fixtures
otter-of-claims demo
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
