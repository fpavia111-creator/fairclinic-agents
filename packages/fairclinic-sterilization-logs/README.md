# Fairclinic Sterilization Logs (`fairclinic-sterilization-logs`)

Fairclinic Sterilization Logs: gaps and open items in sterilizer cycle logs and spore test logs: entries without a result, number or initials, failed cycles with no rerun logged, missing cycle numbers, long gaps between spore tests while a sterilizer was in use, and positive spore tests with no retest logged. A log completeness check, never a compliance determination.

**Never files or reports anything to a regulator, board or inspector. Never adds to, edits or back-fills a sterilization log.**

MIT · Node 20 or newer · local files only · patient, pet and client names masked before results reach the model · built on [`fairclinic-core`](../fairclinic-core)

```bash
npx -y fairclinic-sterilization-logs demo
npx -y fairclinic-sterilization-logs mcp --root ./clinic-exports
```

<!-- generated:start -->

## A demo run

`npx -y fairclinic-sterilization-logs demo` runs the agent on the fictional files in [`fixtures/`](fixtures) in a temporary folder. Captured output:

```text
Fairclinic Sterilization Logs demo (fictional clinic and sterilizers, 2 to 13 November 2026, as of 2026-11-16)

▶ Check the files
  status: executed  decision: allow
  2 sterilizer(s), 17 cycle(s), 4 spore test(s). 5 open item(s) in the logs: 1 positive spore test(s) with no retest logged, 1 failed cycle(s) with no rerun logged, 1 gap(s) between spore tests, 1 gap(s) in cycle numbers, 1 incomplete entr(ies). This is a log completeness check, not a compliance finding.
    positive_no_followup  Autoclave B  2026-11-12  Positive spore test on 2026-11-12 with no negative retest in the log since (4 days).
    failed_no_rerun       Autoclave A  2026-11-06  Cycle 110 on 2026-11-06 failed and no passing cycle follows it that day in the log. Check what happened to that load.
    spore_gap             Autoclave B  2026-11-12  13 days between spore tests (2026-10-30 to 2026-11-12) while the sterilizer was in use; your interval is 7 days.
    cycle_number_gap      Autoclave A  2026-11-05  Cycle numbers jump from 107 to 109: 1 cycle(s) not in the log.
    missing_entry         Autoclave A  2026-11-04  Cycle 106 on 2026-11-04 has no initials in the log.

▶ Write the worklist for the team
  status: executed  decision: allow
  Sterilization log check written: 2 sterilizer(s), 17 cycle(s), 4 spore test(s). 5 open item(s) in the logs: 1 positive spore test(s) with no retest logged, 1 failed cycle(s) with no rerun logged, 1 gap(s) between spore tests, 1 gap(s) in cycle numbers, 1 incomplete entr(ies). This is a log completeness check, not a compliance finding. Files: fairclinic-out/sterilization/sterilization-log-check.csv, fairclinic-out/sterilization/sterilization-log-check.html.

▶ Agent tries regulator file itself
  status: blocked  decision: block
  reason: Never files or reports anything to a regulator, board or inspector.
```

## Tools

| Tool | What it does | Policy |
|---|---|---|
| `sterilization_check` | Open items in the logs: positive_no_followup, failed_no_rerun, spore_gap, cycle_number_gap and missing_entry, each with the sterilizer, date and what the log does not show; a summary per sterilizer. | runs |
| `sterilization_write_report` | Write sterilization-log-check.csv (one row per item, with blank owner and decision columns for your team) and sterilization-log-check.html into out_dir (default fairclinic-out/sterilization). | runs |
| `sterilization_recall` | Search this agent's own memory of the customer's setup: accepted facts (in use) and facts waiting for a person. | runs |
| `sterilization_learn` | Propose one fact about the customer's setup for this agent to remember. | runs |
| `sterilization_accept_learning` | A named person accepts or rejects a fact waiting in this agent's memory. | one named click, even in Auto (`accept_learning`) |
| `sterilization_retire_memory` | A named person stops an accepted fact from applying. | one named click, even in Auto (`accept_learning`) |
| `regulator_file` | Never files or reports anything to a regulator, board or inspector. | refused |
| `log_edit` | Never adds to, edits or back-fills a sterilization log. | refused |

Any tool name not in this table is blocked, including names a model invents. `refused` tools are listed so a model can see they exist and are refused.

## Columns it reads

Table inputs can be CSV, TSV, semicolon- or pipe-separated text, Excel `.xlsx`, JSON or JSONL; claims and remittances can also be X12 837 and 835 files. Columns are matched by the agent's own name, then by the English names below, then by their names in German, French, Spanish, Portuguese, Italian, Japanese, Chinese and Korean. Dates become `YYYY-MM-DD`; amounts are read with either decimal mark. Every result lists under `sources` how each file was read. Columns marked *masked* hold patient identifiers: the model sees a pseudonym, a birth year or nothing (see Patient data).

### Sterilizer cycle log (`cycles`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` (required) | date | Date, Cycle Date, Run Date | Datum, Date, 日付, 日期 |
| `sterilizer` (required) | text | Sterilizer, Autoclave, Unit, Device | - |
| `cycle_number` | text | Cycle, Cycle #, Cycle Number, Load #, Load | - |
| `result` | text | Result, Pass/Fail, Outcome, Indicator | - |
| `initials` | text | Initials, Operator, Staff, Run By | - |

### Spore test log (`spores`)

| Column | Type | Also read as | For example, in other languages |
|---|---|---|---|
| `date` (required) | date | Date, Test Date, Date Run | Datum, Date, 日付, 日期 |
| `sterilizer` (required) | text | Sterilizer, Autoclave, Unit, Device | - |
| `result` | text | Result, Outcome, Spore Result | - |

### Files from other countries

A German export in Windows-1252 with semicolons, `1.234,56` and `03.11.2026`, or a Japanese one in Shift_JIS with `2026/11/03`, is read the same way as the English file: `npm run intl` in the repository rewrites every eval fixture the way a German, French, Spanish, Brazilian, Italian, Japanese, Chinese and Korean export would write it and requires the same results. Columns named differently? Run `npx fairclinic-sterilization-logs inspect <file>` (names and shapes only, never values) and name them in `fairclinic-sources.json`:

```json
{ "files": { "exports/claims.csv": { "columns": { "claim_id": "Fallnummer" }, "date_order": "dmy" } } }
```

## Memory

fairclinic-sterilization-logs can remember facts about your setup so the next run does not have to be told again. `sterilization_learn` only proposes a fact; it changes nothing until a named person accepts it with `sterilization_accept_learning`, which is one click even in Auto. Facts live in one hash-chained file per agent under `.fairclinic/memory/`; if the chain does not verify, no fact is used. Credentials, personal identifiers and text that reads like instructions to an AI are refused. Run without memory with `--no-memory`.

| Kind | What an accepted fact changes |
|---|---|
| `note` | nothing (shown by recall only) |

```bash
fairclinic-sterilization-logs memory list
fairclinic-sterilization-logs memory accept MEM-1a2b3c4d5e6f --as "Your Name"
fairclinic-sterilization-logs memory retire MEM-1a2b3c4d5e6f --as "Your Name" --reason "payer renamed"
```

## Install

Node 20 or newer. No other dependencies.

```bash
npx -y fairclinic-sterilization-logs demo
npx -y fairclinic-sterilization-logs mcp --root /path/to/your/files
```

Claude Desktop, Cursor and other MCP hosts:

```json
{
  "mcpServers": {
    "fairclinic-sterilization-logs": {
      "command": "npx",
      "args": [
        "-y",
        "fairclinic-sterilization-logs",
        "mcp",
        "--root",
        "/path/to/your/files"
      ]
    }
  }
}
```

Claude Code: `claude mcp add fairclinic-sterilization-logs -- npx -y fairclinic-sterilization-logs mcp --root .`, or install the `fairclinic-sterilization-logs` plugin from this repository's marketplace (`fairclinic-agents`).

## Modes and approvals

- **Review** (`--mode review`): reads and reports only.
- **Assist** (default): the policy above. A tool that asks returns an `approval_id`; a person approves it once with `fairclinic-sterilization-logs approve <id> --as "Your Name"` (or on the local approvals page, `fairclinic-sterilization-logs approvals`), and the same call is repeated.
- **Auto** (`--mode auto --auto <tool,...>`): opt-in per tool, with step caps and a kill switch (`fairclinic-sterilization-logs kill`). Sending, moving money, going live and accepting a learned fact stay **one named click even in Auto**; an approval is tied to the sha256 of the reviewed draft, so a changed draft needs a new click.

## CLI

```bash
fairclinic-sterilization-logs tools                 # every tool, its policy and arguments
fairclinic-sterilization-logs sources               # the columns each input is read from
fairclinic-sterilization-logs inspect <file>        # how a file would be read (names and shapes, never values)
fairclinic-sterilization-logs call sterilization_check '{"cycles":"<cycles>"}'
fairclinic-sterilization-logs eval                  # the private eval cases on the fictional fixtures
fairclinic-sterilization-logs demo
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
