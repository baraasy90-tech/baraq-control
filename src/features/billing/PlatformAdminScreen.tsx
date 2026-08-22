import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, SecondaryButton, PrimaryButton, Modal, FieldLabel, TextInput, ErrorText } from "@/components/ui";
import { useCompaniesBilling, useSetCompanySubscription } from "@/features/billing/api/useCompaniesBilling";
import { fmt } from "@/utils/dates";
import type { CompanyBillingRow, SubscriptionStatus } from "@/types/domain";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trial: "تجربة مجانية",
  active: "نشط (مدفوع)",
  expired: "منتهي",
  canceled: "ملغى",
};

const STATUS_TONE: Record<SubscriptionStatus, string> = {
  trial: "text-warn",
  active: "text-primary",
  expired: "text-critical",
  canceled: "text-ink-soft",
};

function isTrialEndingSoon(row: CompanyBillingRow): boolean {
  if (row.subscriptionStatus !== "trial") return false;
  const daysLeft = (new Date(row.trialEndsAt).getTime() - Date.now()) / 86400000;
  return daysLeft <= 5;
}

function EditSubscriptionModal({ row, onClose }: { row: CompanyBillingRow; onClose: () => void }) {
  const [status, setStatus] = useState<SubscriptionStatus>(row.subscriptionStatus);
  const [trialEndsAt, setTrialEndsAt] = useState(row.trialEndsAt.slice(0, 10));
  const [note, setNote] = useState(row.subscriptionNote ?? "");
  const [error, setError] = useState("");
  const setSubscription = useSetCompanySubscription();

  const handleSave = async () => {
    setError("");
    try {
      await setSubscription.mutateAsync({
        companyId: row.id,
        status,
        trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
        note: note.trim() || null,
      });
      onClose();
    } catch {
      setError("تعذّر حفظ التغيير، حاول مجدداً");
    }
  };

  return (
    <Modal title={`اشتراك ${row.name}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <FieldLabel>الحالة</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUS_LABEL) as SubscriptionStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer border ${
                  status === s ? "border-primary bg-primary-bg text-ink" : "border-line/60 bg-panel text-ink-soft"
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <FieldLabel>تاريخ انتهاء التجربة/الاشتراك</FieldLabel>
          <TextInput type="date" value={trialEndsAt} onChange={(e) => setTrialEndsAt(e.target.value)} />
        </div>
        <div>
          <FieldLabel>ملاحظة (مثال: دُفع عبر تحويل بنكي، فاتورة رقم...)</FieldLabel>
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" />
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="flex gap-2">
          <SecondaryButton onClick={onClose} className="flex-1">
            إلغاء
          </SecondaryButton>
          <PrimaryButton onClick={handleSave} disabled={setSubscription.isPending} className="flex-1">
            {setSubscription.isPending ? "جارٍ الحفظ..." : "حفظ"}
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}

export function PlatformAdminScreen() {
  const navigate = useNavigate();
  const companiesQuery = useCompaniesBilling();
  const [editing, setEditing] = useState<CompanyBillingRow | null>(null);

  const companies = companiesQuery.data ?? [];
  const trialCount = companies.filter((c) => c.subscriptionStatus === "trial").length;
  const endingSoonCount = companies.filter(isTrialEndingSoon).length;

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-ink truncate">إدارة اشتراكات المنصة</h1>
        <SecondaryButton onClick={() => navigate("/")}>رجوع</SecondaryButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Card>
          <div className="text-xs text-ink-soft font-semibold mb-1.5">إجمالي الشركات</div>
          <div className="text-base font-bold text-ink">{companies.length}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-soft font-semibold mb-1.5">تجربة مجانية نشطة</div>
          <div className="text-base font-bold text-ink">{trialCount}</div>
        </Card>
        <Card>
          <div className="text-xs text-ink-soft font-semibold mb-1.5">تنتهي خلال 5 أيام</div>
          <div className={`text-base font-bold ${endingSoonCount > 0 ? "text-warn" : "text-ink"}`}>{endingSoonCount}</div>
        </Card>
      </div>

      {companiesQuery.isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
      {companiesQuery.isError && <p className="text-sm text-critical">تعذّر تحميل قائمة الشركات (تأكد أن حسابك مفعّل كمدير منصة)</p>}

      <div className="flex flex-col gap-2">
        {companies.map((row) => (
          <Card key={row.id} className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink truncate">{row.name}</div>
              <div className="text-xs text-ink-soft mt-0.5">
                {row.memberCount} عضو · أُنشئت {fmt(row.createdAt)}
              </div>
              {row.subscriptionNote && <div className="text-xs text-ink-soft mt-0.5">{row.subscriptionNote}</div>}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-left">
                <div className={`text-xs font-bold ${STATUS_TONE[row.subscriptionStatus]}`}>
                  {STATUS_LABEL[row.subscriptionStatus]}
                </div>
                <div className={`text-xs mt-0.5 ${isTrialEndingSoon(row) ? "text-warn font-semibold" : "text-ink-soft"}`}>
                  حتى {fmt(row.trialEndsAt)}
                </div>
              </div>
              <SecondaryButton onClick={() => setEditing(row)} className="text-xs px-3 py-2">
                تعديل
              </SecondaryButton>
            </div>
          </Card>
        ))}
      </div>

      {editing && <EditSubscriptionModal row={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
