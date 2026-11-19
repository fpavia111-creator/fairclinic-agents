# Agentes Fairclinic para clínicas dentales y veterinarias

*Traducido por Claude; pendiente de revisión por un hablante nativo. La [README](README.md) en inglés es la de referencia.*

Treinta y dos pequeños agentes MCP para la administración de una clínica dental o veterinaria. Cada uno hace **un solo trabajo**: ordenar por antigüedad las reclamaciones de seguro pendientes, cruzar un archivo 835 con lo registrado, encontrar tratamientos nunca programados o comparar el registro de sustancias controladas con el recuento. Leen los archivos que la clínica ya exporta (Dentrix, Eaglesoft, Open Dental, Curve, Denticon; AVImark, Cornerstone, ezyVet, Covetrus Pulse, Shepherd; avisos de pago, lotes de tarjeta, banco, nómina, reseñas), ocultan los nombres de pacientes, mascotas y clientes antes de que el modelo de IA vea un resultado, escriben listas de trabajo en su equipo y esperan a una persona designada antes de facturar, enviar, presentar, reembolsar o pagar nada.

Licencia MIT · Node 20 o superior · solo archivos locales · sin credenciales · sin dependencias · solo datos de prueba ficticios

Los expedientes dentales son información de salud protegida: se firma un acuerdo de socio comercial (business associate agreement) antes de recibir cualquier archivo.

## Probar

```bash
npx -y fairclinic-claims-aging demo
npx -y fairclinic-controlled-drugs demo
```

Cada agente tiene `demo`, `eval` y servidor MCP (`npx -y <agente> mcp --root <carpeta>`). Se leen exportaciones en español (nombres de columna, `1.234,56`, fechas día/mes); informes en español con `--lang es`.

## Los agentes

**Seguro dental:** `fairclinic-claims-aging`, `fairclinic-era-posting`, `fairclinic-preauthorizations`, `fairclinic-ppo-fees`, `fairclinic-ppo-writeoffs`.
**Pacientes y producción dental:** `fairclinic-unscheduled-treatment`, `fairclinic-recall-gaps`, `fairclinic-patient-balances`, `fairclinic-membership-plans`, `fairclinic-provider-production`, `fairclinic-hygiene-production`, `fairclinic-lab-cases`, `fairclinic-sterilization-logs` (solo huecos en el registro, nunca un juicio de cumplimiento).
**Veterinaria, cargos y farmacia:** `fairclinic-missed-charges`, `fairclinic-reference-labs`, `fairclinic-estimate-variance`, `fairclinic-boarding-grooming`, `fairclinic-staff-discounts`, `fairclinic-controlled-drugs`, `fairclinic-inventory-expiry`, `fairclinic-pharmacy-margins`.
**Veterinaria, clientes:** `fairclinic-vaccine-reminders`, `fairclinic-wellness-plans`, `fairclinic-pet-insurance-claims`, `fairclinic-client-balances`.
**Ambas:** `fairclinic-card-deposits`, `fairclinic-payroll-production`, `fairclinic-credential-expiry`, `fairclinic-referral-tracking`, `fairclinic-review-replies`, `fairclinic-no-shows`, `fairclinic-supply-costs`.

## Lo que nunca hacen

No presentan nada a aseguradoras, aseguradoras de mascotas, autoridades ni a la DEA; no reembolsan, cobran ni pagan; no cambian el sistema de la clínica; no envían cartas, mensajes ni respuestas públicas (los borradores esperan el clic de una persona designada); no diagnostican, no recomiendan tratamientos ni deciden si se cumple una norma.

Controles, cifras y pendientes: [REVIEW-ver1.md](REVIEW-ver1.md). Informes de ejemplo: [sample-reports](sample-reports/index.html). No es asesoramiento médico, legal, fiscal ni de cumplimiento.
