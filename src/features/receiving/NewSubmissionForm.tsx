import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FieldLabel, TextInput, PrimaryButton, SecondaryButton, ErrorText } from "@/components/ui";
import { ChecklistConfirmRow, type ChecklistRowState } from "@/features/receiving/ChecklistConfirmRow";
import { uploadFile, uniqueFileName } from "@/lib/supabase/storage";
import { useAuth } from "@/features/auth/AuthContext";
import type { Activity, Decision, Submission } from "@/types/domain";

const DECISION_OPTIONS: { value: Decision; label: string }[] = [
  { value: "approved", label: "معتمد نهائي" },
  { value: "approvedWithNotes", label: "معتمد بملاحظات" },
  { value: "rejected", label: "مرفوض" },
];

interface ChecklistDraftState extends ChecklistRowState {
  file: File | null;
}

export function NewSubmissionForm({
  activity,
  defaultManagerName,
  defaultSignatureUrl,
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  activity: Activity;
  defaultManagerName: string;
  defaultSignatureUrl: string | null;
  initial?: Submission | null;
  onSubmit: (payload: {
    managerName: string;
    managerSignatureUrl: string | null;
    decision: Decision;
    notes: string | null;
    checklistResults: { checklistItemId: string; checked: boolean; imageUrl: string | null }[];
    images: string[];
  }) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEditing = !!initial;
  const managerSignatureUrl = initial?.managerSignatureUrl ?? defaultSignatureUrl;
  const [managerName, setManagerName] = useState(initial?.managerName ?? defaultManagerName);
  const [checklistState, setChecklistState] = useState<Record<string, ChecklistDraftState>>(() =>
    Object.fromEntries(
      activity.checklist.map((c) => {
        const existing = initial?.checklistResults.find((r) => r.checklistItemId === c.id);
        return [c.id, { checked: existing?.checked ?? false, imagePreview: existing?.imageUrl ?? null, file: null }];
      })
    )
  );
  const [generalImages, setGeneralImages] = useState<{ file: File | null; preview: string }[]>(
    (initial?.images ?? []).map((url) => ({ file: null, preview: url }))
  );
  const [decision, setDecision] = useState<Decision>(initial?.decision ?? "approved");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const missingRequiredPhoto = activity.checklist.some(
    (c) => c.photoRequired && !checklistState[c.id]?.imagePreview
  );
  const missingName = managerName.trim().length === 0;
  const missingSignature = !managerSignatureUrl;
  const canSubmit = !missingName && !missingSignature && !missingRequiredPhoto;

  const missingReasons = [
    missingName && "اكتب اسم مدير المشروع",
    missingSignature && "لا يوجد توقيع مسجَّل لمدير المشروع — أضفه من إعدادات المشروع",
    missingRequiredPhoto && "أضف الصور الإلزامية للاستلامات الفرعية المطلوبة",
  ].filter(Boolean) as string[];

  const toggleItem = (id: string) => {
    setChecklistState((prev) => ({ ...prev, [id]: { ...prev[id], checked: !prev[id].checked } }));
  };

  const setItemImage = (id: string, file: File) => {
    const preview = URL.createObjectURL(file);
    setChecklistState((prev) => ({ ...prev, [id]: { ...prev[id], file, imagePreview: preview } }));
  };

  const removeItemImage = (id: string) => {
    setChecklistState((prev) => ({ ...prev, [id]: { ...prev[id], file: null, imagePreview: null } }));
  };

  const addGeneralImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setGeneralImages((prev) => [...prev, { file, preview: URL.createObjectURL(file) }]);
  };

  const removeGeneralImage = (index: number) => {
    setGeneralImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !user) return;
    setError("");
    setUploading(true);
    try {
      const checklistResults = await Promise.all(
        activity.checklist.map(async (item) => {
          const state = checklistState[item.id];
          const imageUrl = state.file
            ? await uploadFile("checklist-photos", `${user.id}/${uniqueFileName(state.file.name)}`, state.file)
            : state.imagePreview;
          return { checklistItemId: item.id, checked: state.checked, imageUrl };
        })
      );

      const images = await Promise.all(
        generalImages.map((g) =>
          g.file ? uploadFile("checklist-photos", `${user.id}/${uniqueFileName(g.file.name)}`, g.file) : g.preview
        )
      );

      await onSubmit({
        managerName: managerName.trim(),
        managerSignatureUrl,
        decision,
        notes: notes.trim() || null,
        checklistResults,
        images,
      });
    } catch {
      setError("تعذّر إرسال التقديم — تحقق من الاتصال وحاول مجدداً");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <FieldLabel>اسم مدير المشروع</FieldLabel>
        <TextInput value={managerName} onChange={(e) => setManagerName(e.target.value)} />
      </div>

      {activity.checklist.length > 0 && (
        <div>
          <FieldLabel>قائمة الاستلامات الفرعية</FieldLabel>
          <div className="border border-line rounded-lg px-3">
            {activity.checklist.map((item) => (
              <ChecklistConfirmRow
                key={item.id}
                item={item}
                state={checklistState[item.id]}
                onToggle={() => toggleItem(item.id)}
                onImage={(file) => setItemImage(item.id, file)}
                onRemoveImage={() => removeItemImage(item.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <FieldLabel>صور إضافية (اختياري)</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {generalImages.map((g, i) => (
            <div key={i} className="relative">
              <img src={g.preview} alt="" className="w-16 h-16 object-cover rounded-lg border border-line" />
              <button
                type="button"
                onClick={() => removeGeneralImage(i)}
                className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-critical text-white text-xs leading-none cursor-pointer border-none"
                aria-label="حذف الصورة"
              >
                ×
              </button>
            </div>
          ))}
          <label className="w-16 h-16 flex items-center justify-center text-xs text-primary cursor-pointer border border-dashed border-primary rounded-lg">
            + صورة
            <input type="file" accept="image/*" capture="environment" onChange={addGeneralImage} className="hidden" />
          </label>
        </div>
      </div>

      <div>
        <FieldLabel>القرار</FieldLabel>
        <div className="flex gap-2">
          {DECISION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDecision(opt.value)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${decision === opt.value ? "border-primary bg-primary-bg text-ink" : "border-line bg-transparent text-ink-soft"}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>ملاحظات (اختياري)</FieldLabel>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans box-border resize-none"
        />
      </div>

      <div>
        <FieldLabel>توقيع مدير المشروع</FieldLabel>
        {managerSignatureUrl ? (
          <div className="border border-line rounded-lg bg-white p-2 flex items-center justify-between gap-3">
            <img src={managerSignatureUrl} alt="التوقيع المعتمد" className="h-12 object-contain" />
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-xs text-primary bg-transparent border-none cursor-pointer shrink-0"
            >
              تغييره من لوحة المشاريع
            </button>
          </div>
        ) : (
          <div className="text-xs text-warn bg-warn-bg rounded-lg p-3">
            <p className="mb-2">
              لا يوجد توقيع مسجَّل لمدير المشروع بعد. أضفه مرة واحدة من نموذج تعديل المشروع، وسيُستخدم تلقائياً في كل
              تقديم استلام بدون الحاجة للتوقيع كل مرة.
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-primary bg-transparent border-none cursor-pointer font-semibold"
            >
              الذهاب للوحة المشاريع لإضافته
            </button>
          </div>
        )}
      </div>

      <ErrorText>{error}</ErrorText>
      {missingReasons.length > 0 && (
        <div className="text-xs text-warn bg-warn-bg rounded-lg p-3">
          <p className="font-semibold mb-1">لإتمام الإرسال، تحتاج:</p>
          <ul className="list-disc pr-4">
            {missingReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 pt-3 pb-1 sticky bottom-0 bg-panel border-t border-line/60 -mx-1 px-1 mt-2">
        <SecondaryButton type="button" onClick={onCancel} className="flex-1">
          إلغاء
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={!canSubmit || uploading || submitting} className="flex-1">
          {uploading || submitting ? "جارٍ الحفظ..." : isEditing ? "حفظ التعديلات" : "إرسال التقديم"}
        </PrimaryButton>
      </div>
    </form>
  );
}
