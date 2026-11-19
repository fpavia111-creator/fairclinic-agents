# Fairclinic Missed Charges fixtures

Everything here is fictional: the animal hospital, vets (Dr. Cora Example, Dr. Felix Sample), technicians, pets, clients and prices. 12 and 13 November 2026.

- `treatment-sheet.csv`: fifteen recorded items over five visits.
- `ezyvet-invoice-lines.csv`: the invoices, in an ezyVet-style invoice line layout. Planted: ear cytology not invoiced (V1001); one day of IV fluids invoiced for two recorded (V1002); an in-house CBC not invoiced (V1002); a nail trim at no charge (V1003); a heartworm test invoiced with no line on the treatment sheet (V1005). The treatment sheet says "Fecal flotation" where the invoice says "Fecal test": `settings.json` names them as the same item.
- `price-list.csv`: prices used to value what was missed. `settings-typo.json` has a misspelt key.
