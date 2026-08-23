import { useState } from "react";
import { Copy, Trash2, Plus, Pencil, ArrowUp } from "lucide-react";
import { FieldLabel, TextInput, PrimaryButton, IconButton, ErrorText, Modal, SecondaryButton } from "@/components/ui";
import { useDepartments } from "@/features/company/api/useDepartments";
import { useDepartmentMembers } from "@/features/company/api/useDepartmentMembers";
import { useInvites } from "@/features/company/api/useInvites";
import { useCreateInvite } from "@/features/company/api/useCreateInvite";
import { useRevokeInvite } from "@/features/company/api/useRevokeInvite";
import { useCreateDepartment } from "@/features/company/api/useCreateDepartment";
import { useUpdateDepartmentMember } from "@/features/company/api/useUpdateDepartmentMember";
import { useUpdateDepartment } from "@/features/company/api/useUpdateDepartment";
import { useDeleteDepartment } from "@/features/company/api/useDeleteDepartment";
import { useCompany } from "@/features/company/useCompany";
import { DEPARTMENT_TYPE_LABEL } from "@/features/company/departmentTypeLabels";
import { PRESET_MEMBER_TITLES } from "@/features/company/memberTitles";
import type { Department, DepartmentMember, DepartmentType, MemberRole } from "@/types/domain";

const ROLE_LABEL: Record<MemberRole, string> = { member: "عضو", head: "رئيس القسم" };

function roleLabel(dept: Department | undefined, role: MemberRole): string {
  if (!dept) return ROLE_LABEL[role];
  if (role === "head") return dept.headLabel || ROLE_LABEL.head;
  return dept.memberLabel || ROLE_LABEL.member;
}

const CUSTOM_TITLE_VALUE = "__custom__";

/** محرر مسمى وظيفي لعضو واحد: قائمة جاهزة + خيار "مسمى آخر..." يفتح حقل نص حر. */
function MemberTitleEditor({
  member,
  onSave,
}: {
  member: DepartmentMember;
  onSave: (title: string | null) => void;
}) {
  const isPreset = member.title === null || PRESET_MEMBER_TITLES.includes(member.title);
  const [customMode, setCustomMode] = useState(!isPreset);
  const [customValue, setCustomValue] = useState(isPreset ? "" : member.title ?? "");

  if (customMode) {
    return (
      <div className="flex items-center gap-1">
        <TextInput
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onBlur={() => onSave(customValue.trim() || null)}
          placeholder="اكتب المسمى الوظيفي"
          className="!w-32 !py-1 !text-xs"
        />
        <button
          type="button"
          onClick={() => {
            setCustomMode(false);
            setCustomValue("");
          }}
          className="text-[10px] text-ink-soft bg-transparent border-none cursor-pointer underline"
        >
          قائمة
        </button>
      </div>
    );
  }

  return (
    <select
      value={member.title ?? ""}
      onChange={(e) => {
        if (e.target.value === CUSTOM_TITLE_VALUE) {
          setCustomMode(true);
          return;
        }
        onSave(e.target.value || null);
      }}
      className="text-xs px-2 py-1 border border-line rounded-lg bg-white"
    >
      <option value="">بدون مسمى محدد</option>
      {PRESET_MEMBER_TITLES.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
      <option value={CUSTOM_TITLE_VALUE}>مسمى آخر...</option>
    </select>
  );
}

function getDescendantIds(departments: Department[], rootId: string): Set<string> {
  const result = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const d of departments) {
      if (d.parentDepartmentId === id && !result.has(d.id)) {
        result.add(d.id);
        queue.push(d.id);
      }
    }
  }
  return result;
}

export function TeamSection({ companyId }: { companyId: string }) {
  const { company, profile } = useCompany();
  const departmentsQuery = useDepartments(companyId);
  const departments = departmentsQuery.data ?? [];
  const membersQuery = useDepartmentMembers(departments.map((d) => d.id));
  const members = membersQuery.data ?? [];
  const invitesQuery = useInvites(companyId);
  const invites = (invitesQuery.data ?? []).filter((i) => i.status === "pending");
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite(companyId);
  const createDepartment = useCreateDepartment();
  const updateMember = useUpdateDepartmentMember();
  const updateDepartment = useUpdateDepartment();
  const deleteDepartment = useDeleteDepartment(companyId);

  const isOwner = company.createdBy === profile.id;
  const isExecutive = members.some(
    (m) => m.userId === profile.id && departments.find((d) => d.id === m.departmentId)?.type === "executive"
  );
  const canManage = isOwner || isExecutive;
  const headDepartmentIds = new Set(
    members.filter((m) => m.userId === profile.id && m.role === "head").map((m) => m.departmentId)
  );
  const canManageDept = (departmentId: string) => canManage || headDepartmentIds.has(departmentId);
  const manageableDepartments = departments.filter((d) => canManageDept(d.id));

  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [role, setRole] = useState<MemberRole>("member");
  const [error, setError] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptType, setNewDeptType] = useState<DepartmentType>("custom");
  const [deptError, setDeptError] = useState("");

  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editHeadLabel, setEditHeadLabel] = useState("");
  const [editMemberLabel, setEditMemberLabel] = useState("");
  const [editParentId, setEditParentId] = useState("");

  const [newDeptParentId, setNewDeptParentId] = useState("");
  const [confirmDeleteDept, setConfirmDeleteDept] = useState<Department | null>(null);
  const [deleteDeptError, setDeleteDeptError] = useState("");
  const [draggingDeptId, setDraggingDeptId] = useState<string | null>(null);
  const [dragOverDeptId, setDragOverDeptId] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);

  const dropOnDept = (targetDept: Department) => {
    if (!draggingDeptId || draggingDeptId === targetDept.id) return;
    if (getDescendantIds(departments, draggingDeptId).has(targetDept.id)) return;
    updateDepartment.mutate({ id: draggingDeptId, companyId, parentDepartmentId: targetDept.id });
  };

  const dropAsRoot = () => {
    if (!draggingDeptId) return;
    updateDepartment.mutate({ id: draggingDeptId, companyId, parentDepartmentId: null });
  };

  const raiseDeptLevel = (dept: Department) => {
    if (!dept.parentDepartmentId) return;
    const parent = departments.find((d) => d.id === dept.parentDepartmentId);
    updateDepartment.mutate({ id: dept.id, companyId, parentDepartmentId: parent?.parentDepartmentId ?? null });
  };

  const handleDeleteDept = async () => {
    if (!confirmDeleteDept) return;
    setDeleteDeptError("");
    try {
      await deleteDepartment.mutateAsync(confirmDeleteDept.id);
      setConfirmDeleteDept(null);
    } catch (err) {
      setDeleteDeptError(err instanceof Error ? err.message : "تعذّر حذف القسم، حاول مجدداً");
    }
  };

  const startEditDept = (dept: Department) => {
    setEditingDeptId(dept.id);
    setEditName(dept.name);
    setEditHeadLabel(dept.headLabel || "");
    setEditMemberLabel(dept.memberLabel || "");
    setEditParentId(dept.parentDepartmentId || "");
  };

  const saveEditDept = async () => {
    if (!editingDeptId || !editName.trim()) return;
    await updateDepartment.mutateAsync({
      id: editingDeptId,
      companyId,
      name: editName.trim(),
      headLabel: editHeadLabel.trim() || null,
      memberLabel: editMemberLabel.trim() || null,
      parentDepartmentId: editParentId || null,
    });
    setEditingDeptId(null);
  };

  const effectiveDepartmentId = departmentId || manageableDepartments[0]?.id || "";

  const handleInvite = async () => {
    if (!email.trim() || !effectiveDepartmentId) return;
    setError("");
    setGeneratedLink(null);
    try {
      const dept = departments.find((d) => d.id === effectiveDepartmentId);
      const result = await createInvite.mutateAsync({
        companyId,
        departmentId: effectiveDepartmentId,
        role,
        email,
        companyName: company.name,
        departmentName: dept?.name ?? "",
        inviterName: profile.fullName,
      });
      setGeneratedLink(`${window.location.origin}/join/${result.token}`);
      setEmailSent(result.emailSent);
      setEmail("");
    } catch {
      setError("تعذّر إرسال الدعوة، حاول مجدداً");
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link).catch(() => {});
  };

  const handleCreateDepartment = async () => {
    if (!newDeptName.trim()) return;
    setDeptError("");
    try {
      await createDepartment.mutateAsync({
        companyId,
        name: newDeptName.trim(),
        type: newDeptType,
        parentDepartmentId: newDeptParentId || null,
      });
      setNewDeptName("");
      setNewDeptType("custom");
      setNewDeptParentId("");
    } catch {
      setDeptError("تعذّر إنشاء القسم، حاول مجدداً");
    }
  };

  return (
    <div className="bg-panel border border-line/60 shadow-sm rounded-xl p-6 mb-4">
      <h2 className="text-sm font-bold text-ink mb-4">الفريق والأقسام</h2>

      {canManage && (
        <p className="text-xs text-ink-soft mb-2">
          اسحب القسم الذي تريد جعله <strong>فرعياً</strong> وأفلته فوق القسم الذي سيصبح <strong>مسؤولاً عنه</strong> (القسم
          الذي تسحبه هو الذي ينتقل تحت الآخر)، أو أفلته في الشريط أسفل ليصبح مستقلاً.
        </p>
      )}

      <div className="flex flex-col gap-4 mb-6">
        {departments.map((dept) => {
          const deptMembers = members.filter((m) => m.departmentId === dept.id);
          const isEditing = editingDeptId === dept.id;
          const isDragOver = dragOverDeptId === dept.id;
          return (
            <div
              key={dept.id}
              className={`bg-bg border rounded-lg p-3 transition-colors ${
                isDragOver ? "border-primary bg-primary-bg" : "border-line/60"
              }`}
              draggable={canManage}
              onDragStart={() => setDraggingDeptId(dept.id)}
              onDragEnd={() => {
                setDraggingDeptId(null);
                setDragOverDeptId(null);
              }}
              onDragOver={(e) => {
                if (!canManage) return;
                e.preventDefault();
                setDragOverDeptId(dept.id);
              }}
              onDragLeave={() => setDragOverDeptId((prev) => (prev === dept.id ? null : prev))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverDeptId(null);
                dropOnDept(dept);
              }}
            >
              {isEditing ? (
                <div className="flex flex-col gap-2 mb-3 bg-panel border border-line/60 rounded-lg p-3">
                  <div>
                    <FieldLabel>اسم القسم</FieldLabel>
                    <TextInput value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FieldLabel>مسمى رئيس القسم</FieldLabel>
                      <TextInput
                        value={editHeadLabel}
                        onChange={(e) => setEditHeadLabel(e.target.value)}
                        placeholder={ROLE_LABEL.head}
                      />
                    </div>
                    <div>
                      <FieldLabel>مسمى العضو</FieldLabel>
                      <TextInput
                        value={editMemberLabel}
                        onChange={(e) => setEditMemberLabel(e.target.value)}
                        placeholder={ROLE_LABEL.member}
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>القسم الأعلى (لجعله قسماً فرعياً)</FieldLabel>
                    <select
                      value={editParentId}
                      onChange={(e) => setEditParentId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border"
                    >
                      <option value="">بلا — قسم رئيسي</option>
                      {departments
                        .filter((d) => d.id !== dept.id && !getDescendantIds(departments, dept.id).has(d.id))
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <PrimaryButton
                      onClick={saveEditDept}
                      disabled={!editName.trim() || updateDepartment.isPending}
                      className="w-auto px-4 py-2 text-xs"
                    >
                      حفظ
                    </PrimaryButton>
                    <button
                      onClick={() => setEditingDeptId(null)}
                      className="text-xs text-ink-soft bg-transparent border-none cursor-pointer px-2"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-ink-soft">{dept.name}</span>
                  <span className="text-[10px] text-ink-soft bg-panel border border-line/60 rounded-full px-1.5 py-0.5">
                    {DEPARTMENT_TYPE_LABEL[dept.type]}
                  </span>
                  {canManage && (
                    <>
                      <IconButton icon={Pencil} label="تعديل اسم القسم ومسمّياته" onClick={() => startEditDept(dept)} />
                      {dept.parentDepartmentId && (
                        <IconButton icon={ArrowUp} label="رفع القسم درجة (تنزيله من التبعية الحالية)" onClick={() => raiseDeptLevel(dept)} />
                      )}
                      <IconButton
                        icon={Trash2}
                        label="حذف القسم"
                        tone="critical"
                        onClick={() => {
                          setDeleteDeptError("");
                          setConfirmDeleteDept(dept);
                        }}
                      />
                    </>
                  )}
                </div>
              )}

              {deptMembers.length === 0 ? (
                <p className="text-xs text-ink-soft">لا يوجد أعضاء بعد</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {deptMembers.map((m) =>
                    canManageDept(dept.id) ? (
                      <div key={m.id} className="flex items-center justify-between gap-2 text-sm flex-wrap">
                        <span className="text-ink truncate">{m.fullName}</span>
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          <MemberTitleEditor member={m} onSave={(title) => updateMember.mutate({ id: m.id, title })} />
                          <select
                            value={m.role}
                            onChange={(e) => updateMember.mutate({ id: m.id, role: e.target.value as MemberRole })}
                            className="text-xs px-2 py-1 border border-line rounded-lg bg-white"
                          >
                            <option value="member">{roleLabel(dept, "member")}</option>
                            <option value="head">{roleLabel(dept, "head")}</option>
                          </select>
                          <select
                            value={m.departmentId}
                            onChange={(e) => updateMember.mutate({ id: m.id, departmentId: e.target.value })}
                            className="text-xs px-2 py-1 border border-line rounded-lg bg-white"
                          >
                            {manageableDepartments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <span className="text-ink">{m.fullName}</span>
                        <span className="text-xs text-ink-soft bg-panel border border-line/60 rounded-full px-2 py-0.5">
                          {m.title || roleLabel(dept, m.role)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canManage && draggingDeptId && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverRoot(true);
          }}
          onDragLeave={() => setDragOverRoot(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverRoot(false);
            dropAsRoot();
          }}
          className={`text-center text-xs font-semibold rounded-lg border-2 border-dashed py-3 mb-6 ${
            dragOverRoot ? "border-primary bg-primary-bg text-primary" : "border-line text-ink-soft"
          }`}
        >
          أفلت هنا ليصبح قسماً رئيسياً مستقلاً
        </div>
      )}

      <div className="border-t border-line/60 pt-4 mb-6">
        <h3 className="text-xs font-bold text-ink-soft mb-3">إنشاء قسم جديد</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div className="sm:col-span-2">
            <FieldLabel>اسم القسم</FieldLabel>
            <TextInput
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              placeholder="مثال: المشتريات، التشغيل والصيانة"
            />
          </div>
          <div>
            <FieldLabel>النوع</FieldLabel>
            <select
              value={newDeptType}
              onChange={(e) => setNewDeptType(e.target.value as DepartmentType)}
              className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border"
            >
              <option value="custom">مخصص</option>
              <option value="finance">مالي</option>
              <option value="hr">موارد بشرية</option>
            </select>
          </div>
          <div className="sm:col-span-3">
            <FieldLabel>القسم الأعلى (اختياري — لجعله قسماً فرعياً)</FieldLabel>
            <select
              value={newDeptParentId}
              onChange={(e) => setNewDeptParentId(e.target.value)}
              className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border"
            >
              <option value="">بلا — قسم رئيسي</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ErrorText>{deptError}</ErrorText>
        <PrimaryButton
          onClick={handleCreateDepartment}
          disabled={!newDeptName.trim() || createDepartment.isPending}
          className="w-auto px-4 py-2 text-sm inline-flex items-center gap-1.5"
        >
          <Plus size={15} strokeWidth={2.5} /> {createDepartment.isPending ? "جارٍ الإنشاء..." : "إنشاء القسم"}
        </PrimaryButton>
      </div>

      <div className="border-t border-line/60 pt-4">
        <h3 className="text-xs font-bold text-ink-soft mb-3">دعوة عضو جديد</h3>
        {manageableDepartments.length === 0 ? (
          <p className="text-xs text-ink-soft">لست رئيساً لأي قسم، فما عندك صلاحية دعوة أعضاء جدد.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div className="sm:col-span-1">
                <FieldLabel>البريد الإلكتروني</FieldLabel>
                <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
              </div>
              <div>
                <FieldLabel>القسم</FieldLabel>
                <select
                  value={effectiveDepartmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border"
                >
                  {manageableDepartments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>الدور</FieldLabel>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as MemberRole)}
                  className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border"
                >
                  <option value="member">{roleLabel(departments.find((d) => d.id === effectiveDepartmentId), "member")}</option>
                  <option value="head">{roleLabel(departments.find((d) => d.id === effectiveDepartmentId), "head")}</option>
                </select>
              </div>
            </div>
            <ErrorText>{error}</ErrorText>
            <PrimaryButton
              onClick={handleInvite}
              disabled={!email.trim() || createInvite.isPending}
              className="w-auto px-4 py-2 text-sm"
            >
              {createInvite.isPending ? "جارٍ الإنشاء..." : "إنشاء رابط دعوة"}
            </PrimaryButton>

            {generatedLink && (
              <>
                <p className={`text-xs mt-3 ${emailSent ? "text-primary" : "text-warn"}`}>
                  {emailSent
                    ? "✅ تم إرسال الدعوة بالبريد الإلكتروني تلقائياً."
                    : "⚠️ تعذّر إرسال البريد تلقائياً (تحقق من إعداد خدمة البريد) — انسخ الرابط وأرسله يدوياً."}
                </p>
                <div className="mt-2 flex items-center gap-2 bg-primary-bg text-primary text-xs rounded-lg px-3 py-2.5">
                  <span className="flex-1 truncate font-mono">{generatedLink}</span>
                  <IconButton icon={Copy} label="نسخ الرابط" onClick={() => copyLink(generatedLink)} />
                </div>
              </>
            )}
          </>
        )}
      </div>

      {invites.length > 0 && (
        <div className="border-t border-line/60 pt-4 mt-4">
          <h3 className="text-xs font-bold text-ink-soft mb-3">دعوات بانتظار القبول</h3>
          <div className="flex flex-col gap-2">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between gap-2 bg-bg border border-line/60 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm text-ink truncate">{inv.email}</div>
                  <div className="text-xs text-ink-soft">
                    {roleLabel(
                      departments.find((d) => d.id === inv.departmentId),
                      inv.role
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <IconButton icon={Copy} label="نسخ الرابط" onClick={() => copyLink(`${window.location.origin}/join/${inv.token}`)} />
                  {canManageDept(inv.departmentId) && (
                    <IconButton icon={Trash2} label="إلغاء الدعوة" tone="critical" onClick={() => revokeInvite.mutate(inv.id)} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmDeleteDept && (
        <Modal title="تأكيد حذف القسم" onClose={() => setConfirmDeleteDept(null)}>
          <p className="text-sm text-ink-soft mb-5">
            هل أنت متأكد من حذف قسم "{confirmDeleteDept.name}"؟ سيفقد أعضاؤه المباشرون عضويتهم في هذا القسم تحديداً
            (حساباتهم تبقى موجودة، ولازم تضيفهم لقسم آخر لاحقاً إذا احتجت)، وأي أقسام فرعية تابعة له ستصبح أقساماً
            رئيسية مستقلة تلقائياً. لن يتأثر أي مشروع.
          </p>
          <ErrorText>{deleteDeptError}</ErrorText>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setConfirmDeleteDept(null)} className="flex-1">
              إلغاء
            </SecondaryButton>
            <button
              onClick={handleDeleteDept}
              disabled={deleteDepartment.isPending}
              className="flex-1 py-2.5 rounded-lg bg-critical text-white border-none font-bold text-sm cursor-pointer disabled:opacity-50"
            >
              {deleteDepartment.isPending ? "جارٍ الحذف..." : "حذف نهائياً"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
