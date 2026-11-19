# Agentes Fairclinic para consultórios odontológicos e clínicas veterinárias

*Traduzido pelo Claude; revisão por falante nativo pendente. A [README](README.md) em inglês é a de referência.*

Trinta e dois pequenos agentes MCP para a administração de um consultório odontológico ou de uma clínica veterinária. Cada um faz **um único trabalho**: ordenar por idade as guias de convênio em aberto, conferir um arquivo 835 com os lançamentos, encontrar tratamentos nunca agendados ou comparar o livro de controlados com a contagem. Leem os arquivos que a clínica já exporta (Dentrix, Eaglesoft, Open Dental, Curve, Denticon; AVImark, Cornerstone, ezyVet, Covetrus Pulse, Shepherd; avisos de pagamento, lotes de cartão, banco, folha, avaliações), mascaram nomes de pacientes, pets e tutores antes que o modelo de IA veja qualquer resultado, gravam listas de trabalho no seu computador e esperam uma pessoa nomeada antes de cobrar, enviar, protocolar, reembolsar ou pagar qualquer coisa.

Licença MIT · Node 20 ou mais recente · somente arquivos locais · sem credenciais · sem dependências · somente dados fictícios

Prontuários odontológicos são informação de saúde protegida: um acordo de operador de dados (business associate agreement) é assinado antes de recebermos qualquer arquivo.

## Experimente

```bash
npx -y fairclinic-claims-aging demo
npx -y fairclinic-controlled-drugs demo
```

Cada agente tem `demo`, `eval` e servidor MCP (`npx -y <agente> mcp --root <pasta>`). Exportações em português são lidas (nomes de colunas, `1.234,56`, datas dia/mês); relatórios em português com `--lang pt`.

## Os agentes

**Convênio odontológico:** `fairclinic-claims-aging`, `fairclinic-era-posting`, `fairclinic-preauthorizations`, `fairclinic-ppo-fees`, `fairclinic-ppo-writeoffs`.
**Pacientes e produção odontológica:** `fairclinic-unscheduled-treatment`, `fairclinic-recall-gaps`, `fairclinic-patient-balances`, `fairclinic-membership-plans`, `fairclinic-provider-production`, `fairclinic-hygiene-production`, `fairclinic-lab-cases`, `fairclinic-sterilization-logs` (apenas lacunas no registro, nunca um parecer de conformidade).
**Veterinária, cobranças e farmácia:** `fairclinic-missed-charges`, `fairclinic-reference-labs`, `fairclinic-estimate-variance`, `fairclinic-boarding-grooming`, `fairclinic-staff-discounts`, `fairclinic-controlled-drugs`, `fairclinic-inventory-expiry`, `fairclinic-pharmacy-margins`.
**Veterinária, tutores:** `fairclinic-vaccine-reminders`, `fairclinic-wellness-plans`, `fairclinic-pet-insurance-claims`, `fairclinic-client-balances`.
**Ambas:** `fairclinic-card-deposits`, `fairclinic-payroll-production`, `fairclinic-credential-expiry`, `fairclinic-referral-tracking`, `fairclinic-review-replies`, `fairclinic-no-shows`, `fairclinic-supply-costs`.

## O que nunca fazem

Não enviam nada a convênios, seguradoras pet, autoridades ou à DEA; não reembolsam, cobram nem pagam; não alteram o sistema da clínica; não enviam cartas, mensagens ou respostas públicas (rascunhos esperam o clique de uma pessoa nomeada); não diagnosticam, não recomendam tratamento nem dizem se uma regra é cumprida.

Verificações, números e pendências: [REVIEW-ver1.md](REVIEW-ver1.md). Relatórios de exemplo: [sample-reports](sample-reports/index.html). Não é aconselhamento médico, jurídico, tributário ou de conformidade.
