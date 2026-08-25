import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, SecondaryButton, PrimaryButton, IconButton, ErrorText, FieldLabel, TextInput, Modal } from "@/components/ui";
import {
  useOrganizationalLevels,
  useSaveOrganizationalLevel,
  useDeleteOrganizationalLevel,
} from "@/features/company/api/useOrganizationalLevels";
import {
  useOrganizationalClassifications,
  useSaveOrganizationalClassification,
  useDeleteOrganizationalClassification,
} from "@/features/company/api/useOrganizationalClassifications";
import { useJobTitles, useSaveJobTitle, useDeleteJobTitle } from "@/features/company/api/useJobTitles";
import { getErrorMessage } from "@/utils/errors";
import type { OrganizationalLevel, OrganizationalClassification, JobTitle } from "@/types/domain";

function LevelsSection({ companyId, canEdit }: { companyId: string; canEdit: boolean }) {
  const levelsQuery = useOrganizationalLevels(companyId);
  const levels = levelsQuery.data ?? [];
  const save = useSaveOrganizationalLevel();
  const del = useDeleteOrganizationalLevel(companyId);

  const [editing, setEditing] = useState<OrganizationalLevel | "new" | null>(null);
  const [name, setName] = useState("");
  const [orderIndex, setOrderIndex] = useState("0");
  const [isManagement, setIsManagement] = useState(false);
  const [isEmployee, setIsEmployee] = useState(false);
  const [isWorker, setIsWorker] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<OrganizationalLevel | null>(null);

  const openNew = () => {
    setName("");
    setOrderIndex(String(levels.length));
    setIsManagement(false);
    setIsEmployee(false);
    setIsWorker(false);
    setError("");
    setEditing("new");
  };
  const openEdit = (l: OrganizationalLevel) => {
    setName(l.name);
    setOrderIndex(String(l.orderIndex));
    setIsManagement(l.isManagementLevel);
    setIsEmployee(l.isEmployeeLevel);
    setIsWorker(l.isWorkerLevel);
    setError("");
    setEditing(l);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setError("");
    try {
      await save.mutateAsync({
        id: editing !== "new" && editing ? editing.id : undefined,
        companyId,
        name: name.trim(),
        orderIndex: Number(orderIndex) || 0,
        isManagementLevel: isManagement,
        isEmployeeLevel: isEmployee,
        isWorkerLevel: isWorker,
      });
      setEditing(null);
    } catch (err) {
      setError(getErrorMessage(err, "تعذّر الحفظ، حاول مجدداً"));
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-ink">المستويات الإدارية</h2>
          <p className="text-xs text-ink-soft mt-0.5">تحدد من هو "إدارة" ومن هو "موظف" ومن هو "عامل" — بلا حد لعدد المستويات</p>
        </div>
        {canEdit && (
          <SecondaryButton onClick={openNew} className="text-xs px-3 py-1.5 inline-flex items-center gap-1 shrink-0">
            <Plus size={14} /> إضافة مستوى
          </SecondaryButton>
        )}
      </div>

      {levels.length === 0 ? (
        <p className="text-sm text-ink-soft">لا توجد مستويات بعد.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {levels.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 bg-bg border border-line/60 rounded-lg px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">{l.name}</div>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {l.isManagementLevel && <span className="text-[10px] text-accent bg-accent-bg rounded-full px-2 py-0.5">إدارة</span>}
                  {l.isEmployeeLevel && <span className="text-[10px] text-warn bg-warn-bg rounded-full px-2 py-0.5">موظفين</span>}
                  {l.isWorkerLevel && <span className="text-[10px] text-ink-soft bg-panel rounded-full px-2 py-0.5">عمال</span>}
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <IconButton icon={Pencil} label="تعديل" onClick={() => openEdit(l)} />
                  <IconButton icon={Trash2} label="حذف" tone="critical" onClick={() => setConfirmDelete(l)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing === "new" ? "إضافة مستوى إداري" : "تعديل المستوى"} onClose={() => setEditing(null)}>
          <FieldLabel>اسم المستوى</FieldLabel>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: الإدارة العليا" />
          <div className="mb-3" />
          <FieldLabel>الترتيب (الأصغر يظهر أولاً)</FieldLabel>
          <TextInput type="number" value={orderIndex} onChange={(e) => setOrderIndex(e.target.value)} />
          <div className="mb-3" />
          <FieldLabel>طبيعة المستوى</FieldLabel>
          <div className="flex flex-col gap-2 text-sm text-ink">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isManagement} onChange={(e) => setIsManagement(e.target.checked)} /> مستوى إداري
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isEmployee} onChange={(e) => setIsEmployee(e.target.checked)} /> مستوى موظفين
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isWorker} onChange={(e) => setIsWorker(e.target.checked)} /> مستوى عمال
            </label>
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2 mt-4">
            <PrimaryButton onClick={handleSave} disabled={!name.trim() || save.isPending} className="flex-1">
              {save.isPending ? "جارٍ الحفظ..." : "حفظ"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setEditing(null)} className="flex-1">إلغاء</SecondaryButton>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="تأكيد الحذف" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-ink-soft mb-5">هل أنت متأكد من حذف مستوى "{confirmDelete.name}"؟</p>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setConfirmDelete(null)} className="flex-1">إلغاء</SecondaryButton>
            <button
              onClick={async () => {
                await del.mutateAsync(confirmDelete.id);
                setConfirmDelete(null);
              }}
              className="flex-1 py-2.5 rounded-lg bg-critical text-white border-none font-bold text-sm cursor-pointer"
            >
              حذف نهائياً
            </button>
          </div>
        </Modal>
      )}
    </Card>
  );
}

function ClassificationsSection({ companyId, canEdit }: { companyId: string; canEdit: boolean }) {
  const query = useOrganizationalClassifications(companyId);
  const items = query.data ?? [];
  const save = useSaveOrganizationalClassification();
  const del = useDeleteOrganizationalClassification(companyId);

  const [editing, setEditing] = useState<OrganizationalClassification | "new" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<OrganizationalClassification | null>(null);

  const openNew = () => {
    setName("");
    setDescription("");
    setError("");
    setEditing("new");
  };
  const openEdit = (c: OrganizationalClassification) => {
    setName(c.name);
    setDescription(c.description ?? "");
    setError("");
    setEditing(c);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setError("");
    try {
      await save.mutateAsync({
        id: editing !== "new" && editing ? editing.id : undefined,
        companyId,
        name: name.trim(),
        description: description.trim() || null,
      });
      setEditing(null);
    } catch (err) {
      setError(getErrorMessage(err, "تعذّر الحفظ، حاول مجدداً"));
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-ink">التصنيفات التنظيمية</h2>
          <p className="text-xs text-ink-soft mt-0.5">مثال: تنفيذي، إدارة، إشراف، موظفين، عمال — حسب ما يناسب شركتك</p>
        </div>
        {canEdit && (
          <SecondaryButton onClick={openNew} className="text-xs px-3 py-1.5 inline-flex items-center gap-1 shrink-0">
            <Plus size={14} /> إضافة تصنيف
          </SecondaryButton>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">لا توجد تصنيفات بعد.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 bg-bg border border-line/60 rounded-lg px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">{c.name}</div>
                {c.description && <div className="text-xs text-ink-soft mt-0.5">{c.description}</div>}
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  <IconButton icon={Pencil} label="تعديل" onClick={() => openEdit(c)} />
                  <IconButton icon={Trash2} label="حذف" tone="critical" onClick={() => setConfirmDelete(c)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing === "new" ? "إضافة تصنيف" : "تعديل التصنيف"} onClose={() => setEditing(null)}>
          <FieldLabel>اسم التصنيف</FieldLabel>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: الإدارة التنفيذية" />
          <div className="mb-3" />
          <FieldLabel>وصف (اختياري)</FieldLabel>
          <TextInput value={description} onChange={(e) => setDescription(e.target.value)} />
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2 mt-4">
            <PrimaryButton onClick={handleSave} disabled={!name.trim() || save.isPending} className="flex-1">
              {save.isPending ? "جارٍ الحفظ..." : "حفظ"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setEditing(null)} className="flex-1">إلغاء</SecondaryButton>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="تأكيد الحذف" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-ink-soft mb-5">هل أنت متأكد من حذف تصنيف "{confirmDelete.name}"؟</p>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setConfirmDelete(null)} className="flex-1">إلغاء</SecondaryButton>
            <button
              onClick={async () => {
                await del.mutateAsync(confirmDelete.id);
                setConfirmDelete(null);
              }}
              className="flex-1 py-2.5 rounded-lg bg-critical text-white border-none font-bold text-sm cursor-pointer"
            >
              حذف نهائياً
            </button>
          </div>
        </Modal>
      )}
    </Card>
  );
}

function JobTitlesSection({ companyId, canEdit }: { companyId: string; canEdit: boolean }) {
  const query = useJobTitles(companyId);
  const items = query.data ?? [];
  const save = useSaveJobTitle();
  const del = useDeleteJobTitle(companyId);

  const [editing, setEditing] = useState<JobTitle | "new" | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<JobTitle | null>(null);

  const openNew = () => {
    setName("");
    setError("");
    setEditing("new");
  };
  const openEdit = (j: JobTitle) => {
    setName(j.name);
    setError("");
    setEditing(j);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setError("");
    try {
      await save.mutateAsync({ id: editing !== "new" && editing ? editing.id : undefined, companyId, name: name.trim() });
      setEditing(null);
    } catch (err) {
      setError(getErrorMessage(err, "تعذّر الحفظ، حاول مجدداً"));
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-ink">المسمّيات الوظيفية</h2>
          <p className="text-xs text-ink-soft mt-0.5">قائمة مسمّيات الشركة — منفصلة تماماً عن المستوى الإداري والتصنيف</p>
        </div>
        {canEdit && (
          <SecondaryButton onClick={openNew} className="text-xs px-3 py-1.5 inline-flex items-center gap-1 shrink-0">
            <Plus size={14} /> إضافة مسمّى
          </SecondaryButton>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">لا توجد مسمّيات وظيفية بعد.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((j) => (
            <div key={j.id} className="flex items-center gap-1.5 bg-bg border border-line/60 rounded-full pr-1 pl-3 py-1">
              <span className="text-sm text-ink">{j.name}</span>
              {canEdit && (
                <div className="flex items-center">
                  <IconButton icon={Pencil} label="تعديل" onClick={() => openEdit(j)} />
                  <IconButton icon={Trash2} label="حذف" tone="critical" onClick={() => setConfirmDelete(j)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal title={editing === "new" ? "إضافة مسمّى وظيفي" : "تعديل المسمّى"} onClose={() => setEditing(null)}>
          <FieldLabel>المسمّى الوظيفي</FieldLabel>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: مهندس مشروع" />
          <ErrorText>{error}</ErrorText>
          <div className="flex gap-2 mt-4">
            <PrimaryButton onClick={handleSave} disabled={!name.trim() || save.isPending} className="flex-1">
              {save.isPending ? "جارٍ الحفظ..." : "حفظ"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setEditing(null)} className="flex-1">إلغاء</SecondaryButton>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="تأكيد الحذف" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-ink-soft mb-5">هل أنت متأكد من حذف مسمّى "{confirmDelete.name}"؟</p>
          <div className="flex gap-2">
            <SecondaryButton onClick={() => setConfirmDelete(null)} className="flex-1">إلغاء</SecondaryButton>
            <button
              onClick={async () => {
                await del.mutateAsync(confirmDelete.id);
                setConfirmDelete(null);
              }}
              className="flex-1 py-2.5 rounded-lg bg-critical text-white border-none font-bold text-sm cursor-pointer"
            >
              حذف نهائياً
            </button>
          </div>
        </Modal>
      )}
    </Card>
  );
}

export function OrgTaxonomyScreen({ companyId, canEdit }: { companyId: string; canEdit: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-ink-soft">
        هذه القوائم مستقلة عن الأقسام والموظفين حالياً — تجهيز أولي لربطها لاحقاً بكل عضو. لا شيء هنا يغيّر عمل الأقسام أو الفريق اليوم.
      </p>
      <LevelsSection companyId={companyId} canEdit={canEdit} />
      <ClassificationsSection companyId={companyId} canEdit={canEdit} />
      <JobTitlesSection companyId={companyId} canEdit={canEdit} />
    </div>
  );
}
