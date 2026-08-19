/** يبني ملف Excel حقيقي (.xlsx) عبر SheetJS — الصيغة تخزّن النصوص كـ UTF-8 داخلياً
 * (بخلاف CSV/الصيغ القديمة)، فلا حاجة لأي معالجة ترميز يدوية والعربية تظهر صحيحة
 * تلقائياً. يفعّل اتجاه الورقة من اليمين لليسار ليطابق باقي الواجهة. */
export async function exportToExcel(fileName: string, sheets: { name: string; rows: Record<string, unknown>[] }[]): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  // ملاحظة: اتجاه اليمين-لليسار خاصية على مستوى الملف كاملاً (workbookView) في تنسيق
  // xlsx، وليست خاصية لكل ورقة على حدة رغم وجود اسم مشابه (!views) لا يعمل فعلياً.
  workbook.Workbook = { Views: [{ RTL: true }] };

  for (const sheet of sheets) {
    const rows = sheet.rows.length > 0 ? sheet.rows : [{ " ": "لا توجد بيانات" }];
    const worksheet = XLSX.utils.json_to_sheet(rows);

    const colWidths = Object.keys(rows[0]).map((key) => ({
      wch: Math.max(key.length, ...rows.map((r) => String(r[key] ?? "").length)) + 2,
    }));
    worksheet["!cols"] = colWidths;

    const safeName = sheet.name.replace(/[[\]:*?/\\]/g, "").slice(0, 31) || "ورقة";
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
  }

  XLSX.writeFile(workbook, fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`);
}
