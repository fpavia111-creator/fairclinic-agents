# Fairclinic Controlled Drugs fixtures

Everything here is fictional: the animal hospital, staff initials, pets, clients and quantities (in mL). November 2026.

- `controlled-log.csv`: sixteen entries for four drugs. Planted: on 9 November the hydromorphone balance is written as 18.0 where 18.8 - 0.6 is 18.2, which hides 0.2 mL; ketamine wasted with no witness and used with no patient; butorphanol used with no initials.
- `counts.csv`: the physical count on 15 November. Planted: hydromorphone counted 17.5 where the entries add up to 17.7; butorphanol counted 36.5 where the entries add up to 37.5.
- `settings.json`: waste needs a witness (your own protocol). `settings-typo.json` has a misspelt key.
