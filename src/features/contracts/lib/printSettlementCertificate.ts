import { fmtMoney } from "@/utils/money";
import { openPrintWindow } from "@/utils/printWindow";
import type { PrintSettings } from "@/types/domain";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export interface SettlementSigner {
  label: string;
  fullName: string;
  title: string;
  signatureUrl: string | null;
  at: string | null;
}

export function printSettlementCertificate({
  companyName,
  projectName,
  contractName,
  originalValue,
  approvedExtraWorks,
  totalDeductions,
  totalPaid,
  retentionHeld,
  finalBalance,
  settledAt,
  signers,
  print,
}: {
  companyName: string;
  projectName: string;
  contractName: string;
  originalValue: number;
  approvedExtraWorks: number;
  totalDeductions: number;
  totalPaid: number;
  retentionHeld: number;
  finalBalance: number;
  settledAt: string | null;
  signers: SettlementSigner[];
  print: PrintSettings;
}) {
  const hasHeaderFooter = print.mode === "header_footer" && (print.headerUrl || print.footerUrl);
  const isFullPage = print.mode === "full_page" && print.fullPageUrl;
  const pageMargin = `${print.marginTop}mm ${print.marginRight}mm ${print.marginBottom}mm ${print.marginLeft}mm`;

  const signerRows = signers
    .map(
      (s) => `
        <div class="signer">
          ${s.signatureUrl ? `<img src="${s.signatureUrl}" class="sig-img" />` : `<div class="sig-empty">بدون توقيع</div>`}
          <div class="signer-label">${escapeHtml(s.label)}</div>
          <div class="signer-name">${escapeHtml(s.fullName)}</div>
          <div class="signer-title">${escapeHtml(s.title)}${s.at ? ` — ${new Date(s.at).toLocaleDateString("ar-SA")}` : ""}</div>
        </div>`
    )
    .join("");

  const html = `
<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>شهادة التصفية النهائية — ${escapeHtml(contractName)}</title>
<style>
  @page { size: A4; margin: ${pageMargin}; }
  * { box-sizing: border-box; }
  body {
    font-family: 'IBM Plex Sans Arabic', Tahoma, sans-serif;
    color: #1A2332;
    margin: 0;
    ${isFullPage ? `-webkit-print-color-adjust: exact; print-color-adjust: exact;` : ""}
  }
  .fullpage-bg {
    position: fixed; top: 0; right: 0; left: 0; bottom: 0;
    background-image: url('${print.fullPageUrl ?? ""}');
    background-size: 210mm 297mm;
    background-position: top right;
    background-repeat: no-repeat;
    z-index: -1;
  }
  .header-img { position: fixed; top: 0; right: 0; left: 0; width: 100%; }
  .footer-img { position: fixed; bottom: 0; right: 0; left: 0; width: 100%; }
  .content { ${hasHeaderFooter ? "margin-top: 2mm;" : ""} }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #5B6472; margin-bottom: 12px; }
  .stamp {
    display: inline-block; border: 3px solid #2E9E52; color: #2E9E52; border-radius: 999px;
    padding: 10px 18px; font-weight: 700; transform: rotate(-6deg); font-size: 13px; margin-bottom: 14px;
  }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  td { border: 1px solid #E5E2DA; padding: 8px 10px; }
  td.label { background: #F1EFEA; width: 60%; }
  td.value { text-align: left; font-weight: 700; font-family: monospace; }
  tr.final td { background: #EAF1FD; font-size: 15px; }
  .signers { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 24px; }
  .signer { width: 46%; border-top: 1px solid #E5E2DA; padding-top: 8px; }
  .sig-img { height: 46px; max-width: 140px; object-fit: contain; }
  .sig-empty { height: 46px; display: flex; align-items: center; color: #5B6472; font-size: 11px; }
  .signer-label { font-size: 10px; color: #5B6472; margin-top: 4px; }
  .signer-name { font-size: 13px; font-weight: 700; }
  .signer-title { font-size: 11px; color: #5B6472; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  ${isFullPage ? `<div class="fullpage-bg"></div>` : ""}
  ${print.mode === "header_footer" && print.headerUrl ? `<img src="${print.headerUrl}" class="header-img" />` : ""}
  ${print.mode === "header_footer" && print.footerUrl ? `<img src="${print.footerUrl}" class="footer-img" />` : ""}
  <div class="content">
    <div class="meta">${escapeHtml(companyName)} — ${escapeHtml(projectName)}</div>
    <h1>شهادة التصفية النهائية — ${escapeHtml(contractName)}</h1>
    <div class="meta">تاريخ الإصدار: ${new Date().toLocaleDateString("ar-SA")}${settledAt ? ` — تاريخ التصفية: ${new Date(settledAt).toLocaleDateString("ar-SA")}` : ""}</div>
    <div class="stamp">تمت التصفية النهائية</div>

    <table>
      <tbody>
        <tr><td class="label">القيمة الأصلية للعقد</td><td class="value">${fmtMoney(originalValue)}</td></tr>
        <tr><td class="label">الأعمال الإضافية المعتمدة</td><td class="value">${fmtMoney(approvedExtraWorks)}</td></tr>
        <tr><td class="label">إجمالي الخصومات (مخالفات/أضرار)</td><td class="value">-${fmtMoney(totalDeductions)}</td></tr>
        <tr><td class="label">ضمان الأعمال المحتجز</td><td class="value">-${fmtMoney(retentionHeld)}</td></tr>
        <tr><td class="label">إجمالي المدفوع فعلياً</td><td class="value">-${fmtMoney(totalPaid)}</td></tr>
        <tr class="final"><td class="label">الرصيد النهائي المستحق</td><td class="value">${fmtMoney(finalBalance)}</td></tr>
      </tbody>
    </table>

    <div class="signers">${signerRows}</div>
  </div>
</body>
</html>`;

  openPrintWindow(html);
}
