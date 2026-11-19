# 치과와 동물병원을 위한 Fairclinic 에이전트

*Claude가 번역했으며 원어민 검토는 아직 하지 않았습니다. 기준 문서는 영어 [README](README.md)입니다.*

치과나 동물병원의 사무 업무를 위한 서른두 개의 작은 MCP 에이전트입니다. 각 에이전트는 **한 가지 일**만 합니다. 예를 들어 미결 보험 청구를 경과 기간별로 정리하고, 835 파일을 입금 기장과 대사하고, 예약되지 않은 치료 계획을 찾고, 마약류 기록을 실제 재고와 대조합니다. 병원이 이미 내보내는 파일(Dentrix, Eaglesoft, Open Dental, Curve, Denticon; AVImark, Cornerstone, ezyVet, Covetrus Pulse, Shepherd; 지급 내역, 카드 정산, 은행, 급여, 리뷰)을 읽고, 결과가 AI 모델에 전달되기 전에 환자·반려동물·보호자 이름을 가리며, 작업 목록을 사용자의 컴퓨터에 저장하고, 청구·전송·제출·환불·지급 전에는 지정된 한 사람의 확인을 기다립니다.

MIT 라이선스 · Node 20 이상 · 로컬 파일만 · 자격 증명 없음 · 의존성 없음 · 가상의 테스트 데이터만

치과 기록은 보호 대상 건강 정보입니다. 파일을 받기 전에 업무 제휴 계약(business associate agreement)을 체결합니다.

## 사용해 보기

```bash
npx -y fairclinic-claims-aging demo
npx -y fairclinic-controlled-drugs demo
```

모든 에이전트에 `demo`, `eval`, MCP 서버(`npx -y <agent> mcp --root <folder>`)가 있습니다. 한국어 내보내기(열 이름, EUC-KR, `2026-11-03`)도 읽으며, `--lang ko`로 보고서를 한국어로 씁니다.

## 에이전트

**치과 보험:** `fairclinic-claims-aging`, `fairclinic-era-posting`, `fairclinic-preauthorizations`, `fairclinic-ppo-fees`, `fairclinic-ppo-writeoffs`.
**치과 환자와 매출:** `fairclinic-unscheduled-treatment`, `fairclinic-recall-gaps`, `fairclinic-patient-balances`, `fairclinic-membership-plans`, `fairclinic-provider-production`, `fairclinic-hygiene-production`, `fairclinic-lab-cases`, `fairclinic-sterilization-logs`(기록의 빈틈만 보여 주며 적합성은 판단하지 않습니다).
**동물병원 청구와 약국:** `fairclinic-missed-charges`, `fairclinic-reference-labs`, `fairclinic-estimate-variance`, `fairclinic-boarding-grooming`, `fairclinic-staff-discounts`, `fairclinic-controlled-drugs`, `fairclinic-inventory-expiry`, `fairclinic-pharmacy-margins`.
**동물병원 보호자:** `fairclinic-vaccine-reminders`, `fairclinic-wellness-plans`, `fairclinic-pet-insurance-claims`, `fairclinic-client-balances`.
**공통:** `fairclinic-card-deposits`, `fairclinic-payroll-production`, `fairclinic-credential-expiry`, `fairclinic-referral-tracking`, `fairclinic-review-replies`, `fairclinic-no-shows`, `fairclinic-supply-costs`.

## 절대 하지 않는 일

보험사, 반려동물 보험사, 규제 기관, DEA에 아무것도 제출하지 않고, 환불·청구·지급을 하지 않으며, 병원 시스템을 바꾸지 않고, 편지·메시지·리뷰 답글을 보내지 않습니다(초안은 지정된 한 사람의 클릭을 기다립니다). 진단, 치료 권고, 규정 충족 여부 판단도 하지 않습니다.

점검 내용, 수치, 미확인 사항: [REVIEW-ver1.md](REVIEW-ver1.md). 예시 보고서: [sample-reports](sample-reports/index.html). 의료·법률·세무·규정 준수 자문이 아닙니다.
