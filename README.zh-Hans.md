# 面向牙科诊所和宠物医院的 Fairclinic 智能体

*由 Claude 翻译，尚待母语人士审校。以英文 [README](README.md) 为准。*

三十二个小型 MCP 智能体，用于牙科诊所或宠物医院的后台事务。每个智能体只做**一件事**，例如按账龄整理未结的保险理赔、将 835 文件与入账核对、找出从未预约的治疗计划、把管制药品记录与盘点数量核对。它们读取诊所已经导出的文件（Dentrix、Eaglesoft、Open Dental、Curve、Denticon；AVImark、Cornerstone、ezyVet、Covetrus Pulse、Shepherd；汇款通知、刷卡批次、银行、工资、评价），在结果到达 AI 模型之前隐去患者、宠物和客户的姓名，把工作清单写在您的电脑上，并在任何收费、发送、提交、退款或付款之前等待一位指定人员确认。

MIT 许可 · Node 20 或更高 · 仅本地文件 · 无需凭据 · 无依赖 · 仅虚构测试数据

牙科记录属于受保护的健康信息：在接收任何文件之前，先签署业务伙伴协议（business associate agreement）。

## 试用

```bash
npx -y fairclinic-claims-aging demo
npx -y fairclinic-controlled-drugs demo
```

每个智能体都有 `demo`、`eval` 和 MCP 服务器（`npx -y <agent> mcp --root <folder>`）。可读取中文导出（列名、GBK/Big5 编码、`2026-11-03`）；使用 `--lang zh` 输出中文报告。

## 智能体

**牙科保险：** `fairclinic-claims-aging`、`fairclinic-era-posting`、`fairclinic-preauthorizations`、`fairclinic-ppo-fees`、`fairclinic-ppo-writeoffs`。
**牙科患者与产值：** `fairclinic-unscheduled-treatment`、`fairclinic-recall-gaps`、`fairclinic-patient-balances`、`fairclinic-membership-plans`、`fairclinic-provider-production`、`fairclinic-hygiene-production`、`fairclinic-lab-cases`、`fairclinic-sterilization-logs`（只指出记录缺口，从不判断是否合规）。
**宠物医院收费与药房：** `fairclinic-missed-charges`、`fairclinic-reference-labs`、`fairclinic-estimate-variance`、`fairclinic-boarding-grooming`、`fairclinic-staff-discounts`、`fairclinic-controlled-drugs`、`fairclinic-inventory-expiry`、`fairclinic-pharmacy-margins`。
**宠物医院客户：** `fairclinic-vaccine-reminders`、`fairclinic-wellness-plans`、`fairclinic-pet-insurance-claims`、`fairclinic-client-balances`。
**通用：** `fairclinic-card-deposits`、`fairclinic-payroll-production`、`fairclinic-credential-expiry`、`fairclinic-referral-tracking`、`fairclinic-review-replies`、`fairclinic-no-shows`、`fairclinic-supply-costs`。

## 绝不会做的事

不向保险公司、宠物保险公司、监管机构或 DEA 提交任何内容；不退款、不扣款、不付款；不修改诊所系统；不发送信件、消息或评价回复（草稿等待一位指定人员点击）；不做诊断、不推荐治疗，也不判断是否符合任何规定。

检查、数据和未检查事项：[REVIEW-ver1.md](REVIEW-ver1.md)。示例报告：[sample-reports](sample-reports/index.html)。不构成医疗、法律、税务或合规建议。
