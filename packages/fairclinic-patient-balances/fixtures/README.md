# Fairclinic Patient Balances fixtures

Everything here is fictional: the practice, guarantors, account numbers and amounts. Measured as of 2026-11-16.

- `ar-by-guarantor.csv`: eleven accounts. Planted: 680 over 90 days with no payment since August (G1002, collections review); a credit of 125 (G1003); a balance waiting entirely on insurance (G1004); 640 with no statement for 57 days (G1005); a payment plan with no payment for 67 days (G1006); a 3.20 balance under the small-balance amount (G1007); a plan paid this month (G1008); 150 never sent a statement (G1009); a zero balance, left out (G1011). G1001 and G1010 are fine.
- `settings.json`: 35 days between statements, small balance 5, collections after 60 days without payment, plans after 45. `settings-typo.json` has a misspelt key.
