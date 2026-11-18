# Beaver of Remits fixtures

Everything here is fictional: the practice (Bright Example Dental), the carriers (Example Dental PPO, Sample Mutual Dental, Test Dental Network), the patients, member ids, claim and check numbers. The payee NPI is a made-up number.

- `era-2026-11.835`: two ERAs (005010X221A1). EFT1101 from Example Dental PPO pays 933.60 for four claims; CHK55210 from Sample Mutual Dental pays 617.00 for three, one of them a reversal (claim status 22).
- `posted-payments.csv`: what the front desk posted. Planted: C2002 write-off posted as 196 where the ERA's CO-45 is 245; C2003 paid and not posted; C2004 denied for timely filing (CO-29) and written off in full; C2005 posted as 652 instead of 625; C2006's reversal not posted; C2009 posted on EFT1101 but not on that ERA; C1950 on another check (left out of the totals). C2001 and C2007 are posted correctly.
- `era-export.csv`: the first three claims of EFT1101 as a remittance export with one row per adjustment.
- `settings.json`: contractual reason codes. `settings-typo.json` has a misspelt key.
