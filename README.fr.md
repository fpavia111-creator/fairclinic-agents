# Agents Fairclinic pour cabinets dentaires et cliniques vétérinaires

*Traduit par Claude ; relecture par un locuteur natif en attente. La [README](README.md) anglaise fait foi.*

Trente-deux petits agents MCP pour la gestion d’un cabinet dentaire ou d’une clinique vétérinaire. Chacun fait **un seul travail** : classer par ancienneté les demandes d’assurance en attente, rapprocher un fichier 835 des écritures, retrouver les traitements jamais planifiés, comparer le registre des stupéfiants au comptage. Ils lisent les fichiers que la clinique exporte déjà (Dentrix, Eaglesoft, Open Dental, Curve, Denticon ; AVImark, Cornerstone, ezyVet, Covetrus Pulse, Shepherd ; avis de paiement, remises de cartes, banque, paie, avis en ligne), masquent les noms des patients, animaux et clients avant que le modèle d’IA ne voie un résultat, écrivent des listes de travail sur votre ordinateur et attendent une personne nommée avant toute facturation, tout envoi, dépôt, remboursement ou paiement.

Licence MIT · Node 20 ou plus · fichiers locaux uniquement · aucun identifiant · aucune dépendance · données de test fictives

Les dossiers dentaires sont des données de santé protégées : un accord de sous-traitance (business associate agreement) est signé avant la remise de tout fichier.

## Essayer

```bash
npx -y fairclinic-claims-aging demo
npx -y fairclinic-controlled-drugs demo
```

Chaque agent a une `demo`, un `eval` et un serveur MCP (`npx -y <agent> mcp --root <dossier>`). Les exports français sont lus (noms de colonnes, `1 234,56`, dates jour/mois) ; rapports en français avec `--lang fr`.

## Les agents

**Assurance dentaire :** `fairclinic-claims-aging`, `fairclinic-era-posting`, `fairclinic-preauthorizations`, `fairclinic-ppo-fees`, `fairclinic-ppo-writeoffs`.
**Patients et production dentaires :** `fairclinic-unscheduled-treatment`, `fairclinic-recall-gaps`, `fairclinic-patient-balances`, `fairclinic-membership-plans`, `fairclinic-provider-production`, `fairclinic-hygiene-production`, `fairclinic-lab-cases`, `fairclinic-sterilization-logs` (lacunes des registres uniquement, jamais un avis de conformité).
**Vétérinaire, actes et pharmacie :** `fairclinic-missed-charges`, `fairclinic-reference-labs`, `fairclinic-estimate-variance`, `fairclinic-boarding-grooming`, `fairclinic-staff-discounts`, `fairclinic-controlled-drugs`, `fairclinic-inventory-expiry`, `fairclinic-pharmacy-margins`.
**Vétérinaire, clients :** `fairclinic-vaccine-reminders`, `fairclinic-wellness-plans`, `fairclinic-pet-insurance-claims`, `fairclinic-client-balances`.
**Les deux :** `fairclinic-card-deposits`, `fairclinic-payroll-production`, `fairclinic-credential-expiry`, `fairclinic-referral-tracking`, `fairclinic-review-replies`, `fairclinic-no-shows`, `fairclinic-supply-costs`.

## Ce qu’ils ne font jamais

Rien n’est transmis à un assureur, un assureur animalier, une autorité ou la DEA ; aucun remboursement, prélèvement ni paiement ; aucune modification du logiciel de la clinique ; aucun courrier, message ou réponse publique (les brouillons attendent le clic d’une personne nommée) ; aucun diagnostic, conseil de soins ni avis sur le respect d’une règle.

Contrôles, chiffres et points ouverts : [REVIEW-ver1.md](REVIEW-ver1.md). Rapports d’exemple : [sample-reports](sample-reports/index.html). Pas de conseil médical, juridique, fiscal ni de conformité.
