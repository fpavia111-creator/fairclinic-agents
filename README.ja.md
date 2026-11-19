# 歯科医院・動物病院向け Fairclinic エージェント

*Claude による翻訳です。ネイティブ話者による確認はまだです。正本は英語の [README](README.md) です。*

歯科医院や動物病院の事務作業のための 32 個の小さな MCP エージェントです。各エージェントは**一つの仕事**だけを行います。たとえば未決の保険請求を経過日数で整理する、835 ファイルと入金記帳を照合する、予約されていない治療計画を見つける、管理薬品の記録を実在庫と照合する、などです。医院がすでに書き出しているファイル（Dentrix、Eaglesoft、Open Dental、Curve、Denticon、AVImark、Cornerstone、ezyVet、Covetrus Pulse、Shepherd、支払明細、カード精算、銀行、給与、レビュー）を読み、AI モデルに結果が届く前に患者・ペット・飼い主の名前をマスクし、作業リストをお使いのコンピューターに書き出し、請求・送信・提出・返金・支払いの前には必ず指名された一人の確認を待ちます。

MIT ライセンス · Node 20 以上 · ローカルファイルのみ · 認証情報なし · 依存関係なし · 架空のテストデータのみ

歯科の記録は保護対象の医療情報です。ファイルを預かる前に、業務提携契約（business associate agreement）を締結します。

## 試す

```bash
npx -y fairclinic-claims-aging demo
npx -y fairclinic-controlled-drugs demo
```

各エージェントには `demo`、`eval`、MCP サーバー（`npx -y <agent> mcp --root <folder>`）があります。日本語の書き出し（列名、Shift_JIS、`2026/11/03`）も読めます。`--lang ja` でレポートを日本語で出力します。

## エージェント

**歯科保険:** `fairclinic-claims-aging`、`fairclinic-era-posting`、`fairclinic-preauthorizations`、`fairclinic-ppo-fees`、`fairclinic-ppo-writeoffs`。
**歯科の患者と売上:** `fairclinic-unscheduled-treatment`、`fairclinic-recall-gaps`、`fairclinic-patient-balances`、`fairclinic-membership-plans`、`fairclinic-provider-production`、`fairclinic-hygiene-production`、`fairclinic-lab-cases`、`fairclinic-sterilization-logs`（記録の抜けを示すだけで、適合の判断はしません）。
**動物病院の請求と薬局:** `fairclinic-missed-charges`、`fairclinic-reference-labs`、`fairclinic-estimate-variance`、`fairclinic-boarding-grooming`、`fairclinic-staff-discounts`、`fairclinic-controlled-drugs`、`fairclinic-inventory-expiry`、`fairclinic-pharmacy-margins`。
**動物病院の飼い主:** `fairclinic-vaccine-reminders`、`fairclinic-wellness-plans`、`fairclinic-pet-insurance-claims`、`fairclinic-client-balances`。
**共通:** `fairclinic-card-deposits`、`fairclinic-payroll-production`、`fairclinic-credential-expiry`、`fairclinic-referral-tracking`、`fairclinic-review-replies`、`fairclinic-no-shows`、`fairclinic-supply-costs`。

## 決してしないこと

保険会社・ペット保険会社・行政機関・DEA への提出、返金・請求・支払い、医院システムの変更、手紙・メッセージ・レビュー返信の送信（下書きは指名された一人のクリックを待ちます）、診断や治療の推奨、規則を満たしているかの判断は行いません。

確認内容・数値・未確認事項: [REVIEW-ver1.md](REVIEW-ver1.md)。サンプルレポート: [sample-reports](sample-reports/index.html)。医療・法律・税務・コンプライアンスの助言ではありません。
