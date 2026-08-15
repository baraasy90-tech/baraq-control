export interface ParsedScheduleRow {
  name: string;
  durationDays: number;
  predecessorName: string | null;
  isMilestone: boolean;
}

export interface ParsedSchedule {
  rows: ParsedScheduleRow[];
  skippedCount: number;
}

/**
 * ملفات XER/XML المصدَّرة من Primavera على أجهزة عربية غالباً لا تكون UTF-8 —
 * إما UTF-16 (مع BOM) أو ترميز Windows-1256 العربي بدون BOM. هذه الدالة تكتشف
 * BOM إن وُجد، وإلا تجرّب UTF-8 وتتحقق من فساد النص (أحرف Replacement كثيرة)
 * قبل الرجوع لـ Windows-1256 — بدلاً من افتراض UTF-8 دائماً كما تفعل file.text().
 */
export async function readTextSmart(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.slice(3));
  }
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.slice(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.slice(2));
  }

  const utf8Text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const replacementCount = (utf8Text.match(/�/g) ?? []).length;
  if (replacementCount > 3) {
    try {
      return new TextDecoder("windows-1256", { fatal: false }).decode(bytes);
    } catch {
      return utf8Text;
    }
  }
  return utf8Text;
}

/** يحوّل قيمة ساعات خام لأيام، مع تمييز صفر حقيقي (معلم) عن قيمة مفقودة (NaN). */
function hoursToDays(raw: string | undefined): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return 1;
  return Math.max(0, Math.round(n / 8));
}

// أنواع بنود Primavera التي ليست أنشطة جدول فعلية (تجميع/رصيد فقط) — تُستبعد من
// الاستيراد لأن التطبيق يحسب تجميعاته الخاصة من شجرة الأنشطة تلقائياً.
const XER_NON_ACTIVITY_TYPES = new Set(["TT_LOE", "TT_WBS"]);
const XML_NON_ACTIVITY_TYPES = new Set(["Level of Effort", "WBS Summary"]);
const MILESTONE_TYPES = new Set(["TT_Mile", "TT_FinMile", "Start Milestone", "Finish Milestone"]);

/**
 * محلّل ملفات XER (تصدير Primavera P6) — صيغة نصية بجداول مفصولة بـ Tab.
 * يقرأ جدولي TASK (الاسم/المدة/النوع) وTASKPRED (الاعتماديات)، ويربطهما بالاسم
 * (نفس أسلوب استيراد Excel) — الاعتماد الأول فقط لكل بند (Finish-to-Start)، بدون مهلة.
 * يستبعد بنود التجميع (WBS/LOE) ويحافظ على مدة صفر الحقيقية لبنود المعالم (Milestones).
 */
export function parsePrimaveraXer(text: string): ParsedSchedule {
  const lines = text.split(/\r?\n/);
  let currentTable = "";
  let fieldIndex: Record<string, number> = {};
  const tasks: { id: string; name: string; durationDays: number; isMilestone: boolean }[] = [];
  const preds: { taskId: string; predTaskId: string }[] = [];
  let skippedCount = 0;

  for (const line of lines) {
    if (!line) continue;
    const cols = line.split("\t");
    const tag = cols[0];
    if (tag === "%T") {
      currentTable = (cols[1] ?? "").trim();
      fieldIndex = {};
    } else if (tag === "%F") {
      fieldIndex = {};
      cols.slice(1).forEach((f, i) => {
        fieldIndex[f.trim()] = i + 1;
      });
    } else if (tag === "%R") {
      if (currentTable === "TASK") {
        const id = cols[fieldIndex["task_id"]] ?? "";
        const name = (cols[fieldIndex["task_name"]] ?? "").trim();
        const type = (cols[fieldIndex["task_type"]] ?? "").trim();
        if (!id || !name) continue;
        if (XER_NON_ACTIVITY_TYPES.has(type)) {
          skippedCount++;
          continue;
        }
        const durationDays = hoursToDays(cols[fieldIndex["target_drtn_hr_cnt"]]);
        tasks.push({ id, name, durationDays, isMilestone: MILESTONE_TYPES.has(type) });
      } else if (currentTable === "TASKPRED") {
        const taskId = cols[fieldIndex["task_id"]] ?? "";
        const predTaskId = cols[fieldIndex["pred_task_id"]] ?? "";
        if (taskId && predTaskId) preds.push({ taskId, predTaskId });
      }
    }
  }

  if (tasks.length === 0) throw new Error("لم يتم العثور على أنشطة فعلية داخل الملف");

  const nameById = new Map(tasks.map((t) => [t.id, t.name]));
  const firstPredByTask = new Map<string, string>();
  for (const p of preds) {
    if (!firstPredByTask.has(p.taskId)) firstPredByTask.set(p.taskId, p.predTaskId);
  }

  const rows = tasks.map((t) => {
    const predId = firstPredByTask.get(t.id);
    return {
      name: t.name,
      durationDays: t.durationDays,
      predecessorName: predId ? (nameById.get(predId) ?? null) : null,
      isMilestone: t.isMilestone,
    };
  });

  return { rows, skippedCount };
}

/**
 * محلّل ملفات XML (تصدير Primavera P6) — عناصر Activity وRelationship القياسية.
 * المدة تُفترض بالساعات (8 ساعات = يوم عمل) ما لم تكن القيمة صغيرة بشكل واضح؛
 * راجع عمود "المدة" بالمعاينة قبل الاستيراد للتأكد. يستبعد بنود التجميع
 * (WBS Summary/Level of Effort) ويحافظ على مدة صفر الحقيقية لبنود المعالم.
 */
export function parsePrimaveraXml(text: string): ParsedSchedule {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("ملف XML غير صالح");
  }

  const getText = (el: Element, tags: string[]): string | null => {
    for (const tag of tags) {
      const found = el.getElementsByTagName(tag)[0];
      if (found?.textContent) return found.textContent.trim();
    }
    return null;
  };

  const activityEls = Array.from(doc.getElementsByTagName("Activity"));
  const idByObjectId = new Map<string, string>();
  const activities: { objectId: string; name: string; durationDays: number; isMilestone: boolean }[] = [];
  let skippedCount = 0;

  for (const el of activityEls) {
    const objectId = getText(el, ["ObjectId"]);
    const name = getText(el, ["Name"]);
    if (!objectId || !name) continue;
    const type = getText(el, ["Type"]) ?? "";
    if (XML_NON_ACTIVITY_TYPES.has(type)) {
      skippedCount++;
      continue;
    }
    const durationRaw = getText(el, ["PlannedDuration", "OriginalDuration", "AtCompletionDuration", "RemainingDuration"]);
    const durationDays = hoursToDays(durationRaw ?? undefined);
    activities.push({ objectId, name, durationDays, isMilestone: MILESTONE_TYPES.has(type) });
    idByObjectId.set(objectId, name);
  }

  if (activities.length === 0) throw new Error("لم يتم العثور على أنشطة فعلية داخل الملف");

  const relEls = Array.from(doc.getElementsByTagName("Relationship"));
  const predByObjectId = new Map<string, string>();
  for (const el of relEls) {
    const predId = getText(el, ["PredecessorActivityObjectId"]);
    const succId = getText(el, ["SuccessorActivityObjectId"]);
    if (predId && succId && !predByObjectId.has(succId)) {
      predByObjectId.set(succId, predId);
    }
  }

  const rows = activities.map((a) => {
    const predId = predByObjectId.get(a.objectId);
    return {
      name: a.name,
      durationDays: a.durationDays,
      predecessorName: predId ? (idByObjectId.get(predId) ?? null) : null,
      isMilestone: a.isMilestone,
    };
  });

  return { rows, skippedCount };
}
