import type { Activity, Project, Schedule } from "@/types/domain";

/**
 * مُصدِّر ملف XER (صيغة تبادل بيانات Primavera P6) — يبني ملفاً نصياً يمكن استيراده مباشرة
 * بـ P6 عبر File → Import. يغطي الجداول الأساسية فقط (المشروع، التقويم، WBS، الأنشطة،
 * والتبعيات) بحقول مختزلة لكنها كافية للاستيراد الأساسي — وليس كل الحقول الممكنة بمواصفة
 * XER الكاملة (اللي تتجاوز 50 عموداً لبعض الجداول). التواريخ والمدد المُصدَّرة هي نفسها
 * المحسوبة داخل التطبيق بالفعل (تراعي التقويمات المخصصة)، فتبقى صحيحة حتى لو كان تقويم
 * P6 المُصدَّر عاماً (7 أيام) لعرض الشريط فقط.
 *
 * ⚠️ لم يُختبر الاستيراد الفعلي بنسخة P6 حقيقية (غير متوفرة هنا) — قد يحتاج تعديلاً طفيفاً
 * لو رفض P6 حقلاً معيّناً بأول محاولة استيراد فعلية.
 */

const TAB = "\t";

function fmtDate(iso: string): string {
  return `${iso} 08:00`;
}

function xerRow(fields: (string | number)[]): string {
  return "%R" + TAB + fields.join(TAB);
}

function xerTable(name: string, columns: string[], rows: (string | number)[][]): string {
  const lines = ["%T" + TAB + name, "%F" + TAB + columns.join(TAB)];
  for (const row of rows) lines.push(xerRow(row));
  return lines.join("\n");
}

const CALENDAR_DATA =
  "(0||CalendarData()(DaysOfWeek()(1()())(2(0||08:00|17:00|)())(3(0||08:00|17:00|)())(4(0||08:00|17:00|)())(5(0||08:00|17:00|)())(6(0||08:00|17:00|)())(7()())))";

export function exportPrimaveraXer(project: Project, activities: Activity[], schedule: Schedule): string {
  const today = new Date().toISOString().slice(0, 10);
  const projId = 1;
  const clndrId = 1;

  // خريطة أرقام تسلسلية (XER يتطلب معرّفات رقمية) لكل نشاط — تُستخدم لكل من عقد WBS والأنشطة.
  const idByActivity = new Map<string, number>();
  activities.forEach((a, i) => idByActivity.set(a.id, i + 2)); // 1 محجوز لعقدة المشروع الجذرية بـ WBS

  const leafIds = new Set(activities.filter((a) => !activities.some((c) => c.parentId === a.id)).map((a) => a.id));
  const taskIdByActivity = new Map<string, number>();
  let taskCounter = 1;
  for (const a of activities) {
    if (leafIds.has(a.id) && schedule[a.id]) taskIdByActivity.set(a.id, taskCounter++);
  }

  const scheduledDates = activities.map((a) => schedule[a.id]).filter((sc): sc is { start: string; end: string } => !!sc);
  const planStart = scheduledDates.length > 0 ? scheduledDates.reduce((min, sc) => (sc.start < min ? sc.start : min), scheduledDates[0].start) : today;
  const planEnd = scheduledDates.length > 0 ? scheduledDates.reduce((max, sc) => (sc.end > max ? sc.end : max), scheduledDates[0].end) : today;

  const header = ["ERMHDR", "18.8", today, "Project", "baraq", "baraq_control", "Project Management", "SAR", "Global"].join(TAB);

  const currtype = xerTable(
    "CURRTYPE",
    ["curr_id", "decimal_digit_cnt", "curr_symbol", "decimal_symbol", "digit_group_symbol", "pos_curr_fmt_type", "neg_curr_fmt_type", "curr_type", "curr_short_name", "group_digit_cnt", "base_exch_rate"],
    [[1, 2, "SR", ".", ",", "#1.1", "(#1.1)", "Saudi Riyal", "SAR", 3, 1]]
  );

  const projectTable = xerTable(
    "PROJECT",
    ["proj_id", "proj_short_name", "plan_start_date", "plan_end_date", "clndr_id", "def_duration_type", "guid", "add_date", "last_recalc_date"],
    [[projId, project.name.slice(0, 30), fmtDate(planStart), fmtDate(planEnd), clndrId, "DT_FixedDrtn", project.id, fmtDate(today), fmtDate(today)]]
  );

  const calendarTable = xerTable(
    "CALENDAR",
    ["clndr_id", "default_flag", "clndr_name", "proj_id", "clndr_type", "day_hr_cnt", "week_hr_cnt", "month_hr_cnt", "year_hr_cnt", "clndr_data"],
    [[clndrId, "Y", "تقويم المشروع", projId, "CA_Project", 8, 48, 192, 2000, CALENDAR_DATA]]
  );

  // WBS: عقدة جذر للمشروع + عقدة لكل نشاط (يحافظ على نفس التسلسل الهرمي الحالي بالتطبيق).
  const wbsRows: (string | number)[][] = [[1, projId, "", project.name.slice(0, 30), "N", 1]];
  for (const a of activities) {
    const wbsId = idByActivity.get(a.id)!;
    const parentWbsId = a.parentId ? (idByActivity.get(a.parentId) ?? 1) : 1;
    wbsRows.push([wbsId, projId, parentWbsId, a.name.slice(0, 100), "N", wbsId]);
  }
  const wbsTable = xerTable("PROJWBS", ["wbs_id", "proj_id", "parent_wbs_id", "wbs_name", "status_code", "seq_num"], wbsRows);

  // الأنشطة الطرفية فقط (بدون أبناء) تُصدَّر كبنود TASK فعلية — الأنشطة اللي لها أبناء تبقى
  // عقد تجميع (WBS) فقط، بما يطابق مفهوم P6 نفسه (WBS للتجميع، Activity للعمل الفعلي).
  const taskRows: (string | number)[][] = [];
  for (const a of activities) {
    const taskId = taskIdByActivity.get(a.id);
    const sc = schedule[a.id];
    if (taskId === undefined || !sc) continue;
    const isMilestone = a.durationDays === 0;
    const taskType = isMilestone ? "TT_Mile" : "TT_Task";
    const statusCode = a.done ? "TK_Complete" : sc.start <= today && today <= sc.end ? "TK_Active" : "TK_NotStart";
    const durationHrs = a.durationDays * 8;
    const wbsId = idByActivity.get(a.id)!;

    taskRows.push([
      taskId,
      projId,
      wbsId,
      clndrId,
      taskType,
      statusCode,
      `A${taskId.toString().padStart(4, "0")}`,
      a.name.slice(0, 100),
      "DT_FixedDrtn",
      durationHrs,
      a.done ? 0 : durationHrs,
      fmtDate(sc.start),
      fmtDate(sc.end),
      fmtDate(sc.start),
      fmtDate(sc.end),
      fmtDate(sc.start),
      fmtDate(sc.end),
      a.done ? 100 : 0,
      "CP_Drtn",
      "PT_Normal",
    ]);
  }
  const taskTable = xerTable(
    "TASK",
    [
      "task_id",
      "proj_id",
      "wbs_id",
      "clndr_id",
      "task_type",
      "status_code",
      "task_code",
      "task_name",
      "duration_type",
      "target_drtn_hr_cnt",
      "remain_drtn_hr_cnt",
      "target_start_date",
      "target_end_date",
      "early_start_date",
      "early_end_date",
      "late_start_date",
      "late_end_date",
      "phys_complete_pct",
      "complete_pct_type",
      "priority_type",
    ],
    taskRows
  );

  // التبعيات — فقط بين بندين طرفيين (لهما صف TASK فعلي)؛ أي رابط يشمل بنداً تجميعياً (WBS
  // فقط بلا TASK) يُستبعد لأن P6 لا يمثّل تبعية على عقدة WBS.
  const predRows: (string | number)[][] = [];
  let predCounter = 1;
  for (const a of activities) {
    if (!a.dependsOn) continue;
    const succTaskId = taskIdByActivity.get(a.id);
    const predTaskId = taskIdByActivity.get(a.dependsOn);
    if (succTaskId === undefined || predTaskId === undefined) continue;
    const predType = a.depType === "SS" ? "PR_SS" : "PR_FS";
    const lagHrs = (a.lagDays || 0) * (a.lagUnit === "month" ? 8 * 30 : 8);
    predRows.push([predCounter++, succTaskId, predTaskId, projId, projId, predType, lagHrs]);
  }
  const predTable = xerTable(
    "TASKPRED",
    ["task_pred_id", "task_id", "pred_task_id", "proj_id", "pred_proj_id", "pred_type", "lag_hr_cnt"],
    predRows
  );

  return [header, currtype, projectTable, calendarTable, wbsTable, taskTable, predTable, "%E"].join("\n");
}

export function downloadXerFile(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
