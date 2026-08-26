import { openPrintWindow } from "@/utils/printWindow";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export interface OrgChartMember {
  fullName: string;
  roleLabel: string;
  isHead: boolean;
  levelName: string | null;
  classificationName: string | null;
  children: OrgChartMember[];
}

export interface OrgChartNode {
  id: string;
  name: string;
  typeLabel: string;
  typeColor: string;
  members: OrgChartMember[];
  children: OrgChartNode[];
}

function renderMember(m: OrgChartMember): string {
  const childrenHtml =
    m.children.length > 0 ? `<div class="member-children">${m.children.map(renderMember).join("")}</div>` : "";
  return `
    <div class="member-node">
      <div class="member ${m.isHead ? "member-head" : ""}">
        <span class="member-name">${escapeHtml(m.fullName)}</span>
        <span class="member-role">${escapeHtml(m.roleLabel)}</span>
        ${m.levelName ? `<span class="badge badge-level">${escapeHtml(m.levelName)}</span>` : ""}
        ${m.classificationName ? `<span class="badge badge-classification">${escapeHtml(m.classificationName)}</span>` : ""}
      </div>
      ${childrenHtml}
    </div>`;
}

function renderNode(node: OrgChartNode, depth: number): string {
  const head = node.members.find((m) => m.isHead);
  const rest = node.members.filter((m) => !m.isHead);

  const childrenHtml = node.children.map((c) => renderNode(c, depth + 1)).join("");

  return `
    <div class="node" style="margin-right: ${depth * 22}mm;">
      <div class="node-card" style="border-right-color: ${node.typeColor};">
        <div class="node-head">
          <span class="node-dot" style="background: ${node.typeColor};"></span>
          <span class="node-name">${escapeHtml(node.name)}</span>
          <span class="node-type">${escapeHtml(node.typeLabel)}</span>
        </div>
        ${
          node.members.length === 0
            ? `<p class="empty">لا يوجد أعضاء بعد</p>`
            : `${head ? renderMember(head) : ""}${rest.length > 0 ? `<div class="members">${rest.map(renderMember).join("")}</div>` : ""}`
        }
      </div>
      ${childrenHtml}
    </div>`;
}

export function printOrgChart({ companyName, roots }: { companyName: string; roots: OrgChartNode[] }) {
  const bodyHtml = roots.map((r) => renderNode(r, 0)).join("");

  const html = `
<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>الهيكل التنظيمي — ${escapeHtml(companyName)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: 'IBM Plex Sans Arabic', Tahoma, sans-serif; color: #1A2332; margin: 0; }
  h1 { font-size: 19px; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #5B6472; margin-bottom: 18px; }
  .company-root {
    background: #171B26; color: #fff; border-radius: 10px; padding: 10px 16px;
    font-weight: 700; font-size: 14px; display: inline-block; margin-bottom: 14px;
  }
  .node { margin-bottom: 8px; }
  .node-card {
    background: #fff; border: 1px solid #E5E2DA; border-right-width: 4px; border-radius: 8px;
    padding: 8px 12px; margin-bottom: 6px; page-break-inside: avoid;
  }
  .node-head { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .node-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .node-name { font-weight: 700; font-size: 13px; }
  .node-type { font-size: 10px; color: #5B6472; background: #F1EFEA; border-radius: 999px; padding: 1px 8px; margin-right: auto; }
  .members { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: flex-start; }
  .member-node { page-break-inside: avoid; }
  .member { display: flex; align-items: baseline; gap: 6px; font-size: 12px; flex-wrap: wrap; }
  .member-name { font-weight: 600; }
  .member-head .member-name::before { content: "★ "; color: #E86B2C; }
  .member-role { font-size: 10px; color: #5B6472; }
  .member-children { margin-right: 16px; margin-top: 4px; padding-right: 8px; border-right: 1px dashed #DCD8CF; display: flex; flex-direction: column; gap: 4px; }
  .badge { font-size: 9px; border-radius: 999px; padding: 1px 7px; }
  .badge-level { color: #1F6F5C; background: #E3F0EA; }
  .badge-classification { color: #A9700F; background: #F6ECD7; }
  .empty { font-size: 11px; color: #5B6472; margin: 2px 0 0; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <h1>الهيكل التنظيمي</h1>
  <div class="meta">${escapeHtml(companyName)} — ${new Date().toLocaleDateString("ar-SA")}</div>
  <div class="company-root">${escapeHtml(companyName)}</div>
  ${bodyHtml}
</body>
</html>`;

  openPrintWindow(html);
}
