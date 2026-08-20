import { fmtMoney } from "@/utils/money";
import { openPrintWindow } from "@/utils/printWindow";
import type { PrintSettings } from "@/types/domain";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export interface RetentionLedgerRow {
  title: string;
  paidDate: string | null;
  gross: number;
  retentionAmount: number;
}

export function printRetentionCertificate({
  companyName,
  projectName,
  contractName,
  retentionPercentage,
  released,
  releaseNote,
  ledger,
  print,
}: {
  companyName: string;
  projectName: string;
  contractName: string;
  retentionPercentage: number;
  released: boolean;
  releaseNote: string | null;
  ledger: RetentionLedgerRow[];
  print: PrintSettings;
}) {
  const total = ledger.reduce((s, r) => s + r.retentionAmount, 0);

  const rows = ledger
    .map(
      (r) => `
        <tr>
          <td>${escapeHtml(r.title)}</td>
          <td>${r.paidDate ? new Date(r.paidDate).toLocaleDateString("ar-SA") : "—"}</td>
          <td>${fmtMoney(r.gross)}</td>
          <td>${fmtMoney(r.retentionAmount)}</td>
        </tr>`
    )
    .join("");

  const hasHeaderFooter = print.mode === "header_footer" && (print.headerUrl || print.footerUrl);
  const isFullPage = print.mode === "full_page" && print.fullPageUrl;
  const pageMargin = `${print.marginTop}mm ${print.marginRight}mm ${print.marginBottom}mm ${print.marginLeft}mm`;

  const html = `
<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>شهادة ضمان الأعمال — ${escapeHtml(contractName)}</title>
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
    display: inline-block; border: 3px solid ${released ? "#2E9E52" : "#DFA22E"};
    color: ${released ? "#2E9E52" : "#DFA22E"}; border-radius: 999px; padding: 10px 18px;
    font-weight: 700; transform: rotate(-6deg); font-size: 13px; margin-bottom: 14px;
  }
  .summary { display: flex; gap: 10mm; margin-bottom: 14px; }
  .summary-box { background: #F1EFEA; border-radius: 8px; padding: 10px 14px; font-size: 13px; }
  .summary-label { color: #5B6472; font-size: 11px; margin-bottom: 2px; }
  .summary-value { font-weight: 700; font-size: 15px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
  th, td { border: 1px solid #E5E2DA; padding: 6px 8px; text-align: center; }
  th { background: #F1EFEA; }
  .notes-box { background: #F1EFEA; border-radius: 8px; padding: 10px; font-size: 13px; margin-top: 12px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  ${isFullPage ? `<div class="fullpage-bg"></div>` : ""}
  ${print.mode === "header_footer" && print.headerUrl ? `<img src="${print.headerUrl}" class="header-img" />` : ""}
  ${print.mode === "header_footer" && print.footerUrl ? `<img src="${print.footerUrl}" class="footer-img" />` : ""}
  <div class="content">
    <div class="meta">${escapeHtml(companyName)} — ${escapeHtml(projectName)}</div>
    <h1>شهادة ضمان الأعمال — ${escapeHtml(contractName)}</h1>
    <div class="meta">تاريخ الإصدار: ${new Date().toLocaleDateString("ar-SA")}</div>
    <div class="stamp">${released ? "تم استرداد الضمان" : "الضمان قيد الاستقطاع"}</div>

    <div class="summary">
      <div class="summary-box">
        <div class="summary-label">نسبة الاستقطاع</div>
        <div class="summary-value">${retentionPercentage}%</div>
      </div>
      <div class="summary-box">
        <div class="summary-label">إجمالي المستقطع</div>
        <div class="summary-value">${fmtMoney(total)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr><th>المستخلص</th><th>تاريخ الدفع</th><th>الإجمالي</th><th>المستقطع (الضمان)</th></tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="4">لا توجد مستخلصات مدفوعة بعد</td></tr>`}</tbody>
    </table>

    ${releaseNote ? `<div class="notes-box">ملاحظة الاسترداد: ${escapeHtml(releaseNote)}</div>` : ""}
  </div>
</body>
</html>`;

  openPrintWindow(html);
}
