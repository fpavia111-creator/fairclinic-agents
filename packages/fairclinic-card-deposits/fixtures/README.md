# Fairclinic Card Deposits fixtures

Everything here is fictional: the clinic, processor batches, bank lines and amounts. November 2026. No patient data.

- `processor-batches.csv`: five batches. `bank-lines.csv`: bank statement lines. `pms-card-totals.csv`: card payments per day in the practice system.
- Planted: B103 deposited 50 short; B104 carries a 150 chargeback and the practice system shows 30 more in card payments that day; B105 never deposited and its fees are 4.5% of gross; a 980 card deposit on 9 November matches no batch. B101 and B102 are fine.
- `settings.json`: 5 days to deposit, fees flagged above 3.5%. `settings-typo.json` has a misspelt key.
