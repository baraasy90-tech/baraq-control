import { DECISION_META } from "@/features/receiving/decisionMeta";
import type { ChecklistItem, PrintSettings, Submission } from "@/types/domain";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function printSubmissionReport({
  projectName,
  activityName,
  submission,
  checklistItems,
  print,
}: {
  projectName: string;
  activityName: string;
  submission: Submission;
  checklistItems: ChecklistItem[];
  print: PrintSettings;
}) {
  const decisionMeta = DECISION_META[submission.decision];
  const checklistById = new Map(checklistItems.map((c) => [c.id, c]));

  const checklistRows = submission.checklistResults
    .map((r) => {
      const item = r.checklistItemId ? checklistById.get(r.checklistItemId) : null;
      return `
        <div class="checklist-row">
          <div class="checklist-row-head"><span>${r.checked ? "✅" : "⬜"}</span><span class="checklist-text">${escapeHtml(item?.text ?? "")}</span></div>
          ${r.imageUrl ? `<img src="${r.imageUrl}" class="thumb" />` : ""}
        </div>`;
    })
    .join("");

  const imagesRow = submission.images.map((url) => `<img src="${url}" class="thumb" />`).join("");

  const hasHeaderFooter = print.mode === "header_footer" && (print.headerUrl || print.footerUrl);
  const isFullPage = print.mode === "full_page" && print.fullPageUrl;

  const pageMargin = `${print.marginTop}mm ${print.marginRight}mm ${print.marginBottom}mm ${print.marginLeft}mm`;

  const html = `
<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>تقرير الاستلام — ${escapeHtml(activityName)}</title>
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
    display: inline-block; border: 3px solid ${decisionColor(submission.decision)};
    color: ${decisionColor(submission.decision)}; border-radius: 999px; padding: 10px 18px;
    font-weight: 700; transform: rotate(-6deg); font-size: 13px; margin-bottom: 14px;
  }
  .section { margin-bottom: 14px; }
  .section-title { font-size: 12px; color: #5B6472; margin-bottom: 6px; font-weight: 700; }
  .notes-box { background: #F1EFEA; border-radius: 8px; padding: 10px; font-size: 13px; }
  .checklist-row { font-size: 13px; margin-bottom: 12px; }
  .checklist-row-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .checklist-text { flex: 1; font-weight: 600; }
  .thumb, .general-images .thumb { width: 90mm; height: 90mm; object-fit: cover; border-radius: 8px; border: 1px solid #E5E2DA; }
  .general-images { display: flex; flex-wrap: wrap; gap: 6mm; }
  .sig-img { height: 60px; object-fit: contain; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  ${isFullPage ? `<div class="fullpage-bg"></div>` : ""}
  ${print.mode === "header_footer" && print.headerUrl ? `<img src="${print.headerUrl}" class="header-img" />` : ""}
  ${print.mode === "header_footer" && print.footerUrl ? `<img src="${print.footerUrl}" class="footer-img" />` : ""}
  <div class="content">
    <div class="meta">${escapeHtml(projectName)}</div>
    <h1>تقرير الاستلام — ${escapeHtml(activityName)}</h1>
    <div class="meta">
      مدير المشروع: ${escapeHtml(submission.managerName)} ·
      التاريخ: ${new Date(submission.createdAt).toLocaleDateString("ar-SA")}
    </div>
    <div class="stamp">${decisionMeta.label}</div>

    ${
      submission.notes
        ? `<div class="section"><div class="section-title">ملاحظات</div><div class="notes-box">${escapeHtml(submission.notes)}</div></div>`
        : ""
    }

    ${
      submission.checklistResults.length > 0
        ? `<div class="section"><div class="section-title">الاستلامات الفرعية</div>${checklistRows}</div>`
        : ""
    }

    ${submission.images.length > 0 ? `<div class="section"><div class="section-title">صور إضافية</div><div class="general-images">${imagesRow}</div></div>` : ""}

    ${
      submission.managerSignatureUrl
        ? `<div class="section"><div class="section-title">التوقيع</div><img src="${submission.managerSignatureUrl}" class="sig-img" /></div>`
        : ""
    }
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const triggerPrint = () => {
    printWindow.focus();
    printWindow.print();
  };
  printWindow.onload = triggerPrint;
  setTimeout(triggerPrint, 800);
}

function decisionColor(decision: Submission["decision"]): string {
  return decision === "approved" ? "#2E9E52" : decision === "approvedWithNotes" ? "#DFA22E" : "#D64545";
}
