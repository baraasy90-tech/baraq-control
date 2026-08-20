import { openPrintWindow } from "@/utils/printWindow";
import type { PrintSettings } from "@/types/domain";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export interface ExecutiveReportRow {
  project: string;
  detail: string;
}

export function printExecutiveReport({
  companyName,
  kpis,
  latePhases,
  criticalItems,
  overdueApprovals,
  print,
}: {
  companyName: string;
  kpis: { label: string; value: string }[];
  latePhases: ExecutiveReportRow[];
  criticalItems: ExecutiveReportRow[];
  overdueApprovals: ExecutiveReportRow[];
  print: PrintSettings;
}) {
  const kpiBoxes = kpis
    .map(
      (k) => `
        <div class="kpi">
          <div class="kpi-label">${escapeHtml(k.label)}</div>
          <div class="kpi-value">${escapeHtml(k.value)}</div>
        </div>`
    )
    .join("");

  const listSection = (title: string, rows: ExecutiveReportRow[]) => `
    <h2>${escapeHtml(title)}</h2>
    ${
      rows.length === 0
        ? `<p class="empty">لا توجد بنود</p>`
        : `<table>
            <thead><tr><th>المشروع</th><th>التفاصيل</th></tr></thead>
            <tbody>${rows
              .map((r) => `<tr><td>${escapeHtml(r.project)}</td><td>${escapeHtml(r.detail)}</td></tr>`)
              .join("")}</tbody>
          </table>`
    }`;

  const hasHeaderFooter = print.mode === "header_footer" && (print.headerUrl || print.footerUrl);
  const isFullPage = print.mode === "full_page" && print.fullPageUrl;
  const pageMargin = `${print.marginTop}mm ${print.marginRight}mm ${print.marginBottom}mm ${print.marginLeft}mm`;

  const html = `
<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>التقرير التنفيذي — ${escapeHtml(companyName)}</title>
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
  h1 { font-size: 19px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 18px 0 8px; }
  .meta { font-size: 12px; color: #5B6472; margin-bottom: 14px; }
  .kpis { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
  .kpi { background: #F1EFEA; border-radius: 8px; padding: 8px 12px; min-width: 130px; }
  .kpi-label { font-size: 10px; color: #5B6472; margin-bottom: 2px; }
  .kpi-value { font-size: 15px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #E5E2DA; padding: 6px 8px; text-align: right; }
  th { background: #F1EFEA; }
  .empty { font-size: 12px; color: #5B6472; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  ${isFullPage ? `<div class="fullpage-bg"></div>` : ""}
  ${print.mode === "header_footer" && print.headerUrl ? `<img src="${print.headerUrl}" class="header-img" />` : ""}
  ${print.mode === "header_footer" && print.footerUrl ? `<img src="${print.footerUrl}" class="footer-img" />` : ""}
  <div class="content">
    <h1>التقرير التنفيذي</h1>
    <div class="meta">${escapeHtml(companyName)} — ${new Date().toLocaleDateString("ar-SA")}</div>

    <div class="kpis">${kpiBoxes}</div>

    ${listSection("مراحل متأخرة عن موعدها", latePhases)}
    ${listSection("بنود تحتاج طلباً وتوريداً قريباً", criticalItems)}
    ${listSection("اعتمادات متأخرة (5+ أيام)", overdueApprovals)}
  </div>
</body>
</html>`;

  openPrintWindow(html);
}
