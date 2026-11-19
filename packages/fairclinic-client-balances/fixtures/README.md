# Fairclinic Client Balances fixtures

Everything here is fictional: the animal hospital, clients, account numbers and amounts. As of 2026-11-16.

- `client-ar.csv`: eight accounts. Planted: 1890 over 90 days with no payment since July (A101); a credit of 85 (A102); 230 owed with a 300 deposit unapplied (A103); 180 never sent a statement (A104); 735 with no statement for 57 days (A105); a 3.50 balance under the small-balance amount (A107); a zero balance, left out (A106). A100 is fine.
- `settings.json`: statements every 30 days, collections after 60 days without payment, small balance 5. `settings-typo.json` has a misspelt key.
