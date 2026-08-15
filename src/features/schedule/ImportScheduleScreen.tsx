import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SecondaryButton, PrimaryButton, ErrorText } from "@/components/ui";
import { useCreateActivity } from "@/features/schedule/api/useCreateActivity";
import { useActivities } from "@/features/schedule/api/useActivities";
import {
  parsePrimaveraXer,
  parsePrimaveraXml,
  readTextSmart,
  type ParsedScheduleRow,
} from "@/features/schedule/lib/importParsers";
import { getErrorMessage } from "@/utils/errors";

const SUPPORTED_EXTENSIONS = ["xlsx", "xls", "csv", "xer", "xml"];

const NAME_KEYWORDS = ["اسم", "name", "activity", "task", "بند", "مرحلة"];
const DURATION_KEYWORDS = ["مدة", "duration", "days", "أيام"];
const PREDECESSOR_KEYWORDS = ["سابق", "predecessor", "يعتمد"];

function guessColumn(headers: string[], keywords: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw.toLowerCase()));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

export function ImportScheduleScreen({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const createActivity = useCreateActivity();
  const activitiesQuery = useActivities(projectId);

  // وضع الجدول الممتد (Excel/CSV) — يحتاج ربط أعمدة يدوياً
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [nameCol, setNameCol] = useState<string>("");
  const [durationCol, setDurationCol] = useState<string>("");
  const [predecessorCol, setPredecessorCol] = useState<string>("");

  // وضع الملفات المهيكلة (Primavera XER/XML) — تُحلَّل مباشرة بدون ربط أعمدة
  const [structuredRows, setStructuredRows] = useState<ParsedScheduleRow[] | null>(null);

  const [error, setError] = useState("");
  const [committing, setCommitting] = useState(false);

  const resetParsedState = () => {
    setRows([]);
    setHeaders([]);
    setStructuredRows(null);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    resetParsedState();
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (!ext || !SUPPORTED_EXTENSIONS.includes(ext)) {
      setError(
        ext === "pdf"
          ? 'ملفات PDF غير مدعومة للاستيراد التلقائي — راجع الملاحظة أعلاه، وصدّر من Primavera بصيغة XER أو XML بدلاً منها.'
          : `صيغة "${ext ?? "غير معروفة"}" غير مدعومة. الصيغ المدعومة: Excel، CSV، XER، XML.`
      );
      return;
    }

    try {
      if (ext === "xer") {
        const text = await readTextSmart(file);
        setStructuredRows(parsePrimaveraXer(text));
        return;
      }
      if (ext === "xml") {
        const text = await readTextSmart(file);
        setStructuredRows(parsePrimaveraXml(text));
        return;
      }

      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      if (data.length === 0) {
        setError("الملف فارغ أو غير مقروء");
        return;
      }
      const cols = Object.keys(data[0]);
      setHeaders(cols);
      setRows(data);
      setNameCol(guessColumn(cols, NAME_KEYWORDS) ?? cols[0]);
      setDurationCol(guessColumn(cols, DURATION_KEYWORDS) ?? cols[1] ?? cols[0]);
      setPredecessorCol(guessColumn(cols, PREDECESSOR_KEYWORDS) ?? "");
    } catch (err) {
      setError(getErrorMessage(err, "تعذّر قراءة الملف"));
    }
  };

  const spreadsheetRows: ParsedScheduleRow[] = rows
    .map((row) => ({
      name: String(row[nameCol] ?? "").trim(),
      durationDays: Number(row[durationCol]) || 1,
      predecessorName: predecessorCol ? String(row[predecessorCol] ?? "").trim() || null : null,
    }))
    .filter((r) => r.name.length > 0);

  const parsedRows = structuredRows ?? spreadsheetRows;

  const handleCommit = async () => {
    setError("");
    setCommitting(true);
    try {
      const existing = activitiesQuery.data ?? [];
      const baseOrder = existing.filter((a) => a.parentId === null).length;
      const nameToId = new Map<string, string>();

      for (let i = 0; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        const dependsOn = row.predecessorName ? (nameToId.get(row.predecessorName) ?? null) : null;
        const created = await createActivity.mutateAsync({
          projectId,
          parentId: null,
          name: row.name,
          order: baseOrder + i + 1,
          durationDays: row.durationDays,
          calendarType: "workdays",
          startDate: dependsOn ? null : new Date().toISOString().slice(0, 10),
          dependsOn,
          depType: dependsOn ? "FS" : null,
          lagDays: 0,
          lagUnit: "day",
          critical: false,
          alertLeadDays: 7,
          requiresReceiving: false,
          scopeType: "project",
          scopeRef: null,
          budgetType: null,
          plannedAmount: null,
          boqQty: null,
          boqUnit: null,
          boqUnitPrice: null,
        });
        nameToId.set(row.name, created.id);
      }
      navigate(`/projects/${id}/admin`);
    } catch {
      setError("تعذّر استيراد بعض البنود، حاول مجدداً");
    } finally {
      setCommitting(false);
    }
  };

  const hasParsedFile = headers.length > 0 || structuredRows !== null;

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-ink">إرفاق الجدول الزمني</h1>
        <SecondaryButton onClick={() => navigate(`/projects/${id}/admin`)}>رجوع</SecondaryButton>
      </div>

      <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-6 mb-4">
        <p className="text-sm text-ink-soft mb-2">
          يدعم ملفات <strong>Excel</strong> (.xlsx/.xls)، <strong>CSV</strong>، وملفات تصدير <strong>Primavera P6</strong>{" "}
          (.xer أو .xml) — تُقرأ مباشرة وتُربط الاعتماديات تلقائياً من الملف نفسه.
        </p>
        <p className="text-xs text-warn bg-warn-bg rounded-lg px-3 py-2 mb-4">
          ملفات PDF غير مدعومة للاستيراد التلقائي — PDF ملف عرض بصري وليس بيانات مهيكلة، فلا توجد طريقة موثوقة
          لاستخراج جدول أنشطة دقيق منه آلياً. إذا عندك جدول بصيغة PDF، صدّره من Primavera بصيغة XER أو XML بدلاً
          من ذلك، أو ارفعه كملف مرجعي فقط من شاشة "المستندات".
        </p>
        <input type="file" accept=".xlsx,.xls,.csv,.xer,.xml" onChange={handleFile} className="text-sm" />
        <ErrorText>{error}</ErrorText>
      </div>

      {hasParsedFile && (
        <>
          {headers.length > 0 && (
            <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-6 mb-4">
              <h2 className="text-sm font-bold text-ink mb-4">ربط الأعمدة</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">عمود الاسم</label>
                  <select
                    value={nameCol}
                    onChange={(e) => setNameCol(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white"
                  >
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">عمود المدة (أيام)</label>
                  <select
                    value={durationCol}
                    onChange={(e) => setDurationCol(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white"
                  >
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-soft mb-1.5">عمود البند السابق (اختياري)</label>
                  <select
                    value={predecessorCol}
                    onChange={(e) => setPredecessorCol(e.target.value)}
                    className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-white"
                  >
                    <option value="">بدون</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {structuredRows !== null && (
            <p className="text-xs text-ink-soft mb-4">
              تم تحليل الملف تلقائياً (الاسم، المدة، الاعتماديات) — تأكد من صحة المدد بالمعاينة قبل الاستيراد، فقد
              تحتاج مراجعة حسب إعدادات التصدير من Primavera.
            </p>
          )}

          <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-6 mb-4 overflow-x-auto">
            <h2 className="text-sm font-bold text-ink mb-4">معاينة ({parsedRows.length} بند)</h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-ink-soft text-right border-b border-line">
                  <th className="pb-2 pl-2">الاسم</th>
                  <th className="pb-2 pl-2">المدة</th>
                  <th className="pb-2">السابق</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 20).map((r, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="py-1.5 pl-2 text-ink">{r.name}</td>
                    <td className="py-1.5 pl-2 text-ink-soft">{r.durationDays}</td>
                    <td className="py-1.5 text-ink-soft">{r.predecessorName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 20 && (
              <p className="text-xs text-ink-soft mt-2">و{parsedRows.length - 20} بند إضافي...</p>
            )}
          </div>

          <PrimaryButton onClick={handleCommit} disabled={committing || parsedRows.length === 0} className="w-auto px-6">
            {committing ? "جارٍ الاستيراد..." : `استيراد ${parsedRows.length} بند`}
          </PrimaryButton>
        </>
      )}
    </div>
  );
}
