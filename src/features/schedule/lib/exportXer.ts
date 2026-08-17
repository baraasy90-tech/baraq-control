import type { Activity, Project, Schedule } from "@/types/domain";

/**
 * مُصدِّر ملف XER (صيغة تبادل بيانات Primavera P6) — يبني ملفاً نصياً يمكن استيراده مباشرة
 * بـ P6 عبر File → Import. أسماء الجداول والحقول وقيمها الافتراضية هنا مأخوذة بالضبط من فحص
 * ملف XER حقيقي مُصدَّر من P6 (وليس تخميناً)، بما يشمل نص "بيانات التقويم" (clndr_data) المعقّد
 * — نُعيد استخدامه حرفياً كما هو بدل محاولة إعادة بنائه يدوياً، تفادياً لأي خطأ صياغي قد يمنع
 * استيراد الملف بالكامل. تواريخ ومدد الأنشطة المُصدَّرة هي نفسها المحسوبة داخل التطبيق (تراعي
 * التقويمات المخصصة) — فتبقى صحيحة حتى لو كان تقويم P6 المُصدَّر عاماً لعرض الشريط فقط.
 */

const TAB = "\t";

function fmtDate(iso: string): string {
  return `${iso} 08:00`;
}

function xerRow(fields: (string | number)[]): string {
  return "%R" + TAB + fields.map((f) => (f === null || f === undefined ? "" : f)).join(TAB);
}

function xerTable(name: string, columns: string[], rows: (string | number)[][]): string {
  const lines = ["%T" + TAB + name, "%F" + TAB + columns.join(TAB)];
  for (const row of rows) lines.push(xerRow(row));
  return lines.join("\n");
}

// منسوخة حرفياً من تقويم "Corporate - Standard Full Time" بملف XER حقيقي — أحد وسبت عطلة،
// الاثنين للجمعة عمل من 08:00 حتى 16:00، بدون استثناءات (أعياد) مُدرجة بالتقويم نفسه.
const VERIFIED_CALENDAR_DATA =
  "(0||CalendarData()((0||DaysOfWeek()((0||1()())(0||2()((0||0(f|16:00|s|08:00)())))(0||3()((0||0(f|16:00|s|08:00)())))(0||4()((0||0(f|16:00|s|08:00)())))(0||5()((0||0(f|16:00|s|08:00)())))(0||6()((0||0(f|16:00|s|08:00)())))(0||7()())))(0||Exceptions()())))";

function guidFor(id: string): string {
  return id.replace(/-/g, "").slice(0, 22);
}

export function exportPrimaveraXer(project: Project, activities: Activity[], schedule: Schedule): string {
  const today = new Date().toISOString().slice(0, 10);
  const projId = 1;
  const clndrId = 1;
  const obsId = 1;
  const rootWbsId = 1;

  const idByActivity = new Map<string, number>();
  activities.forEach((a, i) => idByActivity.set(a.id, i + 2)); // 1 محجوز لعقدة WBS الجذرية

  const leafIds = new Set(activities.filter((a) => !activities.some((c) => c.parentId === a.id)).map((a) => a.id));
  const taskIdByActivity = new Map<string, number>();
  let taskCounter = 1;
  for (const a of activities) {
    if (leafIds.has(a.id) && schedule[a.id]) taskIdByActivity.set(a.id, taskCounter++);
  }

  const scheduledDates = activities.map((a) => schedule[a.id]).filter((sc): sc is { start: string; end: string } => !!sc);
  const planStart = scheduledDates.length > 0 ? scheduledDates.reduce((min, sc) => (sc.start < min ? sc.start : min), scheduledDates[0].start) : today;
  const planEnd = scheduledDates.length > 0 ? scheduledDates.reduce((max, sc) => (sc.end > max ? sc.end : max), scheduledDates[0].end) : today;

  const header = ["ERMHDR", "17.7", today, "Project", "baraq", "baraq_control", "dbxDatabaseNoName", "Project Management", "SAR"].join(TAB);

  const currtype = xerTable(
    "CURRTYPE",
    ["curr_id", "decimal_digit_cnt", "curr_symbol", "decimal_symbol", "digit_group_symbol", "pos_curr_fmt_type", "neg_curr_fmt_type", "curr_type", "curr_short_name", "group_digit_cnt", "base_exch_rate"],
    [[1, 2, "SR", ".", ",", "#1.1", "(#1.1)", "Saudi Riyal", "SAR", 3, 1]]
  );

  const obs = xerTable(
    "OBS",
    ["obs_id", "parent_obs_id", "guid", "seq_num", "obs_name", "obs_descr"],
    [[obsId, "", "", 0, "Enterprise", ""]]
  );

  const projectTable = xerTable(
    "PROJECT",
    [
      "proj_id", "fy_start_month_num", "rsrc_self_add_flag", "allow_complete_flag", "rsrc_multi_assign_flag",
      "checkout_flag", "project_flag", "step_complete_flag", "cost_qty_recalc_flag", "batch_sum_flag",
      "name_sep_char", "def_complete_pct_type", "proj_short_name", "acct_id", "orig_proj_id", "source_proj_id",
      "base_type_id", "clndr_id", "sum_base_proj_id", "task_code_base", "task_code_step", "priority_num",
      "wbs_max_sum_level", "strgy_priority_num", "last_checksum", "critical_drtn_hr_cnt", "def_cost_per_qty",
      "last_recalc_date", "plan_start_date", "plan_end_date", "scd_end_date", "add_date", "last_tasksum_date",
      "fcst_start_date", "def_duration_type", "task_code_prefix", "guid", "def_qty_type", "add_by_name",
      "web_local_root_path", "proj_url", "def_rate_type", "add_act_remain_flag", "act_this_per_link_flag",
      "def_task_type", "act_pct_link_flag", "critical_path_type", "task_code_prefix_flag", "def_rollup_dates_flag",
      "use_project_baseline_flag", "rem_target_link_flag", "reset_planned_flag", "allow_neg_act_flag",
      "sum_assign_level", "last_fin_dates_id", "last_baseline_update_date", "cr_external_key", "apply_actuals_date",
      "location_id", "loaded_scope_level", "export_flag", "new_fin_dates_id", "baselines_to_export",
      "baseline_names_to_export", "next_data_date", "close_period_flag", "sum_refresh_date", "trsrcsum_loaded",
    ],
    [
      [
        projId, 1, "Y", "Y", "Y", "N", "Y", "N", "N", "Y", ".", "CP_Drtn", project.name.slice(0, 30), "", "", "", "",
        clndrId, "", 1000, 10, 10, 2, 500, "", 0, "0.0000", fmtDate(today), fmtDate(planStart), fmtDate(planEnd),
        fmtDate(planEnd), fmtDate(today), "", "", "DT_FixedDUR2", "A", guidFor(project.id), "QT_Hour", "baraq", "",
        "", "COST_PER_QTY", "N", "Y", "TT_Task", "Y", "CT_TotFloat", "Y", "Y", "Y", "Y", "N", "N", "SL_Taskrsrc",
        "", "", "", "", "", 7, "Y", "", "", "", "", "", "", "",
      ],
    ]
  );

  const calendarTable = xerTable(
    "CALENDAR",
    ["clndr_id", "default_flag", "clndr_name", "proj_id", "base_clndr_id", "last_chng_date", "clndr_type", "day_hr_cnt", "week_hr_cnt", "month_hr_cnt", "year_hr_cnt", "rsrc_private", "clndr_data"],
    [[clndrId, "Y", "تقويم المشروع", projId, "", fmtDate(today), "CA_Project", 8, 40, 172, 2000, "N", VERIFIED_CALENDAR_DATA]]
  );

  const schedoptions = xerTable(
    "SCHEDOPTIONS",
    [
      "schedoptions_id", "proj_id", "sched_outer_depend_type", "sched_open_critical_flag", "sched_lag_early_start_flag",
      "sched_retained_logic", "sched_setplantoforecast", "sched_float_type", "sched_calendar_on_relationship_lag",
      "sched_use_expect_end_flag", "sched_progress_override", "level_float_thrs_cnt", "level_outer_assign_flag",
      "level_outer_assign_priority", "level_over_alloc_pct", "level_within_float_flag", "level_keep_sched_date_flag",
      "level_all_rsrc_flag", "sched_use_project_end_date_for_float", "enable_multiple_longest_path_calc",
      "limit_multiple_longest_path_calc", "max_multiple_longest_path", "use_total_float_multiple_longest_paths",
      "key_activity_for_multiple_longest_paths", "LevelPriorityList",
    ],
    [
      [
        1, projId, "SD_Both", "N", "Y", "Y", "N", "FT_FF", "rcal_Predecessor", "Y", "N", 0, "N", 5, 25, "N", "Y",
        "Y", "Y", "N", "Y", 10, "Y", "", "priority_type,ASC",
      ],
    ]
  );

  // WBS: عقدة جذر للمشروع + عقدة لكل نشاط (يحافظ على نفس التسلسل الهرمي الحالي بالتطبيق).
  const wbsRows: (string | number)[][] = [
    [rootWbsId, projId, obsId, 100, 1, "Y", "N", "WS_Open", project.name.slice(0, 30), project.name.slice(0, 100), "", "", "", "", "0.0000", "0.0000", "", "", "", "", "", "EC_Cmp_pct", "EE_PF_cpi", guidFor(project.id), "", ""],
  ];
  for (const a of activities) {
    const wbsId = idByActivity.get(a.id)!;
    const parentWbsId = a.parentId ? (idByActivity.get(a.parentId) ?? rootWbsId) : rootWbsId;
    wbsRows.push([
      wbsId, projId, obsId, wbsId * 10, 1, "N", "N", "WS_Open", a.name.slice(0, 30), a.name.slice(0, 100), "",
      parentWbsId, "", "", "0.0000", "0.0000", "", "", "", "", "", "EC_Cmp_pct", "EE_PF_cpi", guidFor(a.id), "", "",
    ]);
  }
  const wbsTable = xerTable(
    "PROJWBS",
    [
      "wbs_id", "proj_id", "obs_id", "seq_num", "est_wt", "proj_node_flag", "sum_data_flag", "status_code",
      "wbs_short_name", "wbs_name", "phase_id", "parent_wbs_id", "ev_user_pct", "ev_etc_user_value", "orig_cost",
      "indep_remain_total_cost", "ann_dscnt_rate_pct", "dscnt_period_type", "indep_remain_work_qty",
      "anticip_start_date", "anticip_end_date", "ev_compute_type", "ev_etc_compute_type", "guid", "tmpl_guid",
      "plan_open_state",
    ],
    wbsRows
  );

  // الأنشطة الطرفية فقط (بدون أبناء) تُصدَّر كبنود TASK فعلية — الأنشطة اللي لها أبناء تبقى
  // عقد تجميع (WBS) فقط، بما يطابق مفهوم P6 نفسه (WBS للتجميع، Activity للعمل الفعلي).
  const taskRows: (string | number)[][] = [];
  for (const a of activities) {
    const taskId = taskIdByActivity.get(a.id);
    const sc = schedule[a.id];
    if (taskId === undefined || !sc) continue;
    const isMilestone = a.durationDays === 0;
    const taskType = isMilestone ? "TT_Mile" : "TT_Task";
    const durationType = isMilestone ? "DT_FixedDrtn" : "DT_FixedDUR2";
    const statusCode = a.done ? "TK_Complete" : sc.start <= today && today <= sc.end ? "TK_Active" : "TK_NotStart";
    const durationHrs = a.durationDays * 8;
    const remainHrs = a.done ? 0 : durationHrs;
    const wbsId = idByActivity.get(a.id)!;
    const start = fmtDate(sc.start);
    const end = fmtDate(sc.end);

    taskRows.push([
      taskId, projId, wbsId, clndrId, a.done ? 100 : 0, "N", 1, "N", "N", "CP_Drtn", taskType, durationType,
      statusCode, `A${taskId.toString().padStart(4, "0")}`, a.name.slice(0, 100), "", 0, 0, remainHrs, 0, 0, 0,
      durationHrs, 0, 0, 0, "", a.done ? start : "", a.done ? end : "", start, end, "", start, end, start, end,
      start, end, start, end, "", "PT_Normal", "", "", "", "", guidFor(a.id), "", "", "", "N", 0, 0, "", "",
      fmtDate(today), fmtDate(today), "baraq", "baraq", "",
    ]);
  }
  const taskTable = xerTable(
    "TASK",
    [
      "task_id", "proj_id", "wbs_id", "clndr_id", "phys_complete_pct", "rev_fdbk_flag", "est_wt", "lock_plan_flag",
      "auto_compute_act_flag", "complete_pct_type", "task_type", "duration_type", "status_code", "task_code",
      "task_name", "rsrc_id", "total_float_hr_cnt", "free_float_hr_cnt", "remain_drtn_hr_cnt", "act_work_qty",
      "remain_work_qty", "target_work_qty", "target_drtn_hr_cnt", "target_equip_qty", "act_equip_qty",
      "remain_equip_qty", "cstr_date", "act_start_date", "act_end_date", "late_start_date", "late_end_date",
      "expect_end_date", "early_start_date", "early_end_date", "restart_date", "reend_date", "target_start_date",
      "target_end_date", "rem_late_start_date", "rem_late_end_date", "cstr_type", "priority_type", "suspend_date",
      "resume_date", "float_path", "float_path_order", "guid", "tmpl_guid", "cstr_date2", "cstr_type2",
      "driving_path_flag", "act_this_per_work_qty", "act_this_per_equip_qty", "external_early_start_date",
      "external_late_end_date", "create_date", "update_date", "create_user", "update_user", "location_id",
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
    predRows.push([predCounter++, succTaskId, predTaskId, projId, projId, predType, lagHrs, "", "", ""]);
  }
  const predTable = xerTable(
    "TASKPRED",
    ["task_pred_id", "task_id", "pred_task_id", "proj_id", "pred_proj_id", "pred_type", "lag_hr_cnt", "float_path", "aref", "arls"],
    predRows
  );

  return [header, currtype, obs, projectTable, calendarTable, schedoptions, wbsTable, taskTable, predTable, "%E"].join("\n");
}

export function downloadXerFile(content: string, fileName: string): void {
  // BOM إلزامي هنا — بدونه يفترض P6 ترميزاً محلياً (ANSI) بدل UTF-8 الفعلي، فيظهر أي نص
  // غير إنجليزي (كالعربية) مشوّهاً رغم أن باقي بنية الملف تبقى سليمة تماماً.
  const BOM = "﻿";
  const blob = new Blob([BOM + content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
