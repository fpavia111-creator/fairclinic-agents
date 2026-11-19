# Fairclinic Lab Cases fixtures

Everything here is fictional: the practice, the labs (Example Crown Lab, Sample Denture Studio), patients, cases and invoices. As of 2026-11-16.

- `lab-cases.csv`: seven cases. Planted: an implant crown not back with the seat appointment tomorrow (L502); a denture six days overdue (L503); a crown returned late and seated but not billed (L504); a crown returned in October with no invoice (L505). L501, L506 and L507 are fine.
- `lab-invoices.csv`: six lines. Planted: an invoice for a case not in the log (INV-9003); the same invoice twice (INV-9002); a remake charged 285 (INV-9004); a denture invoiced before it came back (INV-7710).
- `settings.json`: seat buffer 2 days, invoices expected within 30 days. `settings-typo.json` has a misspelt key.
