import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, SecondaryButton, PrimaryButton, Modal, FieldLabel, TextInput, ErrorText } from "@/components/ui";
import { useCompaniesBilling, useSetCompanySubscription, useSubscriptionAudit } from "@/features/billing/api/useCompaniesBilling";
import { fmt } from "@/utils/dates";
import type { CompanyBillingRow, SubscriptionStatus } from "@/types/domain";
import { POLICY_LABELS, previewSubscriptionPolicy } from "./subscriptionPolicy";
import { getUserErrorMessage } from "@/utils/errors";

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
  return daysLeft > 0 && daysLeft <= 5;
}

function EditSubscriptionModal({ row, onClose }: { row: CompanyBillingRow; onClose: () => void }) {
  const [status, setStatus] = useState<SubscriptionStatus>(row.subscriptionStatus);
  const [trialEndsAt, setTrialEndsAt] = useState(row.trialEndsAt.slice(0, 10));
  const [note, setNote] = useState(row.subscriptionNote ?? "");
  const [error, setError] = useState("");
  const setSubscription = useSetCompanySubscription();
  const history = useSubscriptionAudit(row.id);
  const preview = previewSubscriptionPolicy(status, trialEndsAt ? `${trialEndsAt}T00:00:00.000Z` : row.trialEndsAt);

  const handleSave = async () => {
    setError("");
    if (note.length > 2000 || !trialEndsAt || !Number.isFinite(Date.parse(trialEndsAt))) {
      setError("أدخل تاريخ انتهاء صحيحاً وملاحظة لا تتجاوز 2000 حرف."); return;
    }
    try {
      await setSubscription.mutateAsync({
        companyId: row.id,
        status,
        // An unchanged date must preserve the existing instant, not reset it to midnight.
        trialEndsAt: trialEndsAt === row.trialEndsAt.slice(0, 10) ? row.trialEndsAt : new Date(`${trialEndsAt}T00:00:00.000Z`).toISOString(),
        note: note.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(getUserErrorMessage(err, "تعذّر حفظ التغيير، حاول مجدداً"));
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
          <TextInput value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} placeholder="اختياري" />
        </div>
        <div className="rounded-lg bg-bg p-3 text-xs">
          <p className="font-bold">معاينة السياسة المقترحة: {POLICY_LABELS[preview.stage]}</p>
          {preview.graceEndsAt && <p>نهاية مهلة السماح: {fmt(preview.graceEndsAt)}</p>}
          <p>هذه معاينة؛ قيود القراءة فقط وعلامات التصدير لم تُفعّل بعد.</p>
        </div>
        <ErrorText>{error}</ErrorText>
        <div className="flex gap-2">
          <SecondaryButton onClick={onClose} disabled={setSubscription.isPending} className="flex-1">
            إلغاء
          </SecondaryButton>
          <PrimaryButton onClick={handleSave} disabled={setSubscription.isPending} className="flex-1">
            {setSubscription.isPending ? "جارٍ الحفظ..." : "حفظ"}
          </PrimaryButton>
        </div>
        <div className="border-t border-line/60 pt-3">
          <h2 className="font-bold text-sm">آخر تعديلات الاشتراك</h2>
          {history.isPending && <p className="text-xs">جارٍ تحميل السجل...</p>}
          {history.isError && <SecondaryButton onClick={() => void history.refetch()}>تعذّر تحميل السجل — إعادة المحاولة</SecondaryButton>}
          {history.data?.length === 0 && <p className="text-xs">لا توجد تعديلات مسجلة منذ تفعيل سجل التدقيق.</p>}
          <div className="max-h-48 overflow-auto space-y-2 mt-2">{history.data?.map(entry => <div key={entry.id} className="text-xs bg-bg p-2 rounded">
            <p>{new Date(entry.changed_at).toLocaleString("ar-SA")} · {STATUS_LABEL[entry.previous_status as SubscriptionStatus]} ← {STATUS_LABEL[entry.next_status as SubscriptionStatus]}</p>
            <p>الانتهاء: {fmt(entry.previous_ends_at)} ← {fmt(entry.next_ends_at)}</p>
            {entry.note && <p className="break-words">{entry.note}</p>}
          </div>)}</div>
        </div>
      </div>
    </Modal>
  );
}

function CompanyRow({ row, onEdit }: { row: CompanyBillingRow; onEdit: () => void }) {
  return (
    <Card className="flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <div className="text-sm font-bold text-ink truncate">{row.name}</div>
        <div className="text-xs text-ink-soft mt-0.5">
          {row.memberCount} {row.isIndividual ? "مستخدم" : "حساب فرعي"} · أُنشئت {fmt(row.createdAt)}
        </div>
        {row.subscriptionNote && <div className="text-xs text-ink-soft mt-0.5">{row.subscriptionNote}</div>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-left">
          <div className={`text-xs font-bold ${STATUS_TONE[row.subscriptionStatus]}`}>{STATUS_LABEL[row.subscriptionStatus]}</div>
          <div className={`text-xs mt-0.5 ${isTrialEndingSoon(row) ? "text-warn font-semibold" : "text-ink-soft"}`}>
            حتى {fmt(row.trialEndsAt)}
          </div>
        </div>
        <SecondaryButton onClick={onEdit} className="text-xs px-3 py-2">
          تعديل
        </SecondaryButton>
      </div>
    </Card>
  );
}

export function PlatformAdminScreen() {
  const navigate = useNavigate();
  const companiesQuery = useCompaniesBilling();
  const [editing, setEditing] = useState<CompanyBillingRow | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<SubscriptionStatus | "all">("all");

  const allRows = companiesQuery.data ?? [];
  const visible = allRows.filter(c => (filter === "all" || c.subscriptionStatus === filter) && c.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const companies = visible.filter((c) => !c.isIndividual);
  const individuals = visible.filter((c) => c.isIndividual);
  const trialCount = allRows.filter((c) => c.subscriptionStatus === "trial" && new Date(c.trialEndsAt).getTime() > Date.now()).length;
  const endingSoonCount = allRows.filter(isTrialEndingSoon).length;

  return (
    <div className="min-h-screen p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-ink truncate">إدارة اشتراكات المنصة</h1>
        <SecondaryButton onClick={() => navigate("/")}>رجوع</SecondaryButton>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Card>
          <div className="text-xs text-ink-soft font-semibold mb-1.5">إجمالي الشركات</div>
          <div className="text-base font-bold text-ink">{allRows.filter(c => !c.isIndividual).length}</div>
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

      <Card className="mb-4">
        <FieldLabel>البحث عن حساب</FieldLabel>
        <TextInput value={search} onChange={event => setSearch(event.target.value)} placeholder="اسم الشركة أو الحساب الفردي" />
        <label className="block mt-3 text-xs font-semibold">حالة الاشتراك
          <select value={filter} onChange={event => setFilter(event.target.value as SubscriptionStatus | "all")} className="block mt-1 p-2 bg-panel border border-line rounded-lg w-full">
            <option value="all">جميع الحالات</option>{(Object.keys(STATUS_LABEL) as SubscriptionStatus[]).map(status => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
          </select>
        </label>
      </Card>
      {companiesQuery.isLoading && <p className="text-sm text-ink-soft">جارٍ التحميل...</p>}
      {companiesQuery.isError && <p className="text-sm text-critical">تعذّر تحميل قائمة الشركات (تأكد أن حسابك مفعّل كمدير منصة)</p>}

      <h2 className="text-sm font-bold text-ink-soft mb-2">الشركات</h2>
      <div className="flex flex-col gap-2 mb-8">
        {companiesQuery.isSuccess && companies.length === 0 && (
          <p className="text-sm text-ink-soft">لا توجد شركات بعد</p>
        )}
        {companies.map((row) => (
          <CompanyRow key={row.id} row={row} onEdit={() => setEditing(row)} />
        ))}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-sm font-bold text-ink-soft">الحسابات الفردية</h2>
        <span className="text-xs text-ink-soft bg-panel border border-line/60 rounded-full px-2 py-0.5">{individuals.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {companiesQuery.isSuccess && individuals.length === 0 && (
          <p className="text-sm text-ink-soft">لا توجد حسابات فردية بعد</p>
        )}
        {individuals.map((row) => (
          <CompanyRow key={row.id} row={row} onEdit={() => setEditing(row)} />
        ))}
      </div>

      {editing && <EditSubscriptionModal row={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
