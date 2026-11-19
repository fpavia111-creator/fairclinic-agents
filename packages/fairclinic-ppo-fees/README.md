# Fairclinic PPO Fees (`fairclinic-ppo-fees`)

Fairclinic PPO Fees: your office fee schedule against each PPO's allowed amounts and what each PPO actually allowed: lines allowed below the plan's own fee, office fees below a plan fee, codes missing from a schedule or from your fees, and the write-off percent per code and plan. It never sets fees or touches a contract.

**Never changes the fee schedule in the practice-management system; a person makes any correction there. Never bills or files with a PPO; a person does, after review. Never signs, joins, leaves or renegotiates a PPO contract.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-ppo-fees demo
npx -y fairclinic-ppo-fees mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-ppo-fees demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic PPO Fees demo (fictional practice fee schedule and PPO plans) in C:\Users\fpavi\AppData\Local\Temp\fairclinic-ppo-fees-demo-f94KjO

▶ Check the files
  status: executed  decision: allow
  17 plan and code pair(s) across 2 plan(s), 5 to review: 2 allowed below the plan's own fee (62), 1 office fee(s) below the plan fee (about 32 left), 1 code(s) missing from a schedule, 1 with no office fee, 1 deep discount(s).
    paid_below_schedule  Example Dental PPO    D2740  fee    1180  plan    790
    no_office_fee        Example Dental PPO    D9110  fee       -  plan     75
    paid_below_schedule  Sample Mutual Dental  D1110  fee     120  plan    128
    deep_discount        Sample Mutual Dental  D2740  fee    1180  plan    610
    not_in_schedule      Sample Mutual Dental  D2950  fee     330  plan      -

▶ Write the worklist for the team
  status: executed  decision: allow
  PPO fee check written: 17 plan and code pair(s) across 2 plan(s), 5 to review: 2 allowed below the plan's own fee (62), 1 office fee(s) below the plan fee (about 32 left), 1 code(s) missing from a schedule, 1 with no office fee, 1 deep discount(s). Files: fairclinic-out/fees/fees-ppo-check.csv, fairclinic-out/fees/fees-ppo-check.html.

▶ Agent tries pms update itself
  status: blocked  decision: block
  reason: Never changes the fee schedule in the practice-management system; a person makes any correction there.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `fees_check` | Every plan and code with the office fee, the plan's allowed amount, what the plan actually allowed and the write-off percent, and a status: paid_below_schedule, fee_below_allowed, not_in_schedule, no_office_fee, deep_… | runs |
| `fees_by_plan` | Average write-off percent per plan (office fee against the plan's allowed amount), highest first. | runs |
| `fees_write_report` | Write fees-ppo-check.csv (one row per item, with blank owner and decision columns for your team) and fees-ppo-check.html into out_dir (default fairclinic-out/fees). | runs |
| `fees_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `fees_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `fees_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `fees_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `pms_update` | Never changes the fee schedule in the practice-management system; a person makes any correction there. | refused |
| `claim_submit` | Never bills or files with a PPO; a person does, after review. | refused |
| `contract_sign` | Never signs, joins, leaves or renegotiates a PPO contract. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Office fee schedule (`fees`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `code` (required) | text | Code, CDT, CDT Code, Procedure, Proc Code, ProcCode | - |
| `description` | text | Description, Procedure Description, Descript | Beschreibung, Description, 摘要, 摘要 |
| `office_fee` (required) | amount | Office Fee, Fee, UCR, Standard Fee, Amount | Betrag, Montant, 請求額, 金额 |

### PPO fee schedules (`schedules`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `plan` (required) | text | Plan, PPO, Carrier, Fee Schedule, Payer | Kostenträger, Payeur, 保険者, 付款方 |
| `code` (required) | text | Code, CDT, CDT Code, Procedure, Proc Code | - |
| `allowed` (required) | amount | Allowed, Allowed Amount, PPO Fee, Max Allowable, Contracted Fee, Fee | Anerkannt, Montant admis, 許容額, 允许金额 |

### Lines the PPOs allowed (`paid`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `plan` (required) | text | Plan, PPO, Carrier, Payer | Kostenträger, Payeur, 保険者, 付款方 |
| `code` (required) | text | Code, CDT, CDT Code, Procedure, Proc Code | - |
| `allowed` (required) | amount | Allowed, Allowed Amount, Allowed Paid, Ins Allowed | Anerkannt, Montant admis, 許容額, 允许金额 |
| `date_of_service` | date | Date of Service, DOS, Service Date, Date | Leistungsdatum, Date de soins, 診療日, 服务日期 |
| `patient_name` | text (masked) | Patient, Patient Name | Patient, Patient, 患者名, 患者 |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-ppo-fees inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-ppo-fees can remember facts about your setup so the next run does not have to be told again. `fees_learn` only proposes a fact; it changes nothing until a named person accepts it with `fees_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-ppo-fees memory list
fairclinic-ppo-fees memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-ppo-fees memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-ppo-fees demo
npx -y fairclinic-ppo-fees mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-ppo-fees": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-ppo-fees",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-ppo-fees -- npx -y fairclinic-ppo-fees mcp --root .`, or install the `fairclinic-ppo-fees` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-ppo-fees approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-ppo-fees approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-ppo-fees kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-ppo-fees tools                 # every tool, its policy and arguments
fairclinic-ppo-fees sources               # the columns each input is read from
fairclinic-ppo-fees inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-ppo-fees call fees_check '{"fees":"<fees>","schedules":"<schedules>"}'
fairclinic-ppo-fees eval                  # the private eval cases on the fictional fixtures
fairclinic-ppo-fees demo
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
