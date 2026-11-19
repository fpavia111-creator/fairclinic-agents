# Fairclinic Inventory Expiry fixtures

Everything here is fictional: the animal hospital, items, lots and costs. As of 2026-11-16. No patient data.

- `stock-on-hand.csv` (a Covetrus Pulse-style layout): six lots. Planted: cefovecin expired on 31 October (420 at cost); carprofen expiring in 34 days (81); maropitant expiring in 50 days (285); ear cleanser with no expiry date.
- `count-sheet.csv`: five counted items. Planted: 20 gabapentin capsules missing (2.40); one maropitant vial missing (95); two ear cleanser bottles more than expected.
- `settings.json`: expiring within 60 days, count tolerance 0. `settings-typo.json` has a misspelt key.
