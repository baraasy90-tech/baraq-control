import { useState } from "react";
import { FieldLabel, TextInput, PrimaryButton, SecondaryButton, ErrorText } from "@/components/ui";
import { todayISO } from "@/utils/dates";
import { fmtMoney } from "@/utils/money";
import type { ProjectContractPayment } from "@/features/budget/api/useContractPaymentsForProject";

const SOURCE_OPTIONS = [
  { value: "contract", label: "عقد مقاول" },
  { value: "purchase", label: "شراء مباشر" },
  { value: "other", label: "أخرى" },
];

export function AddActualEntryForm({
  onSubmit,
  onCancel,
  submitting,
  contractPayments,
}: {
  onSubmit: (values: {
    date: string;
    amount: number;
    source: string;
    note: string | null;
    contractRef: string | null;
    contractPaymentId: string | null;
  }) => void;
  onCancel: () => void;
  submitting?: boolean;
  contractPayments: ProjectContractPayment[];
}) {
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState(SOURCE_OPTIONS[0].value);
  const [note, setNote] = useState("");
  const [contractRef, setContractRef] = useState("");
  const [contractPaymentId, setContractPaymentId] = useState("");
  const [error, setError] = useState("");

  const canSubmit = Number(amount) > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) {
      setError("أدخل مبلغاً صحيحاً");
      return;
    }
    setError("");
    onSubmit({
      date,
      amount: Number(amount),
      source,
      note: note.trim() || null,
      contractRef: contractRef.trim() || null,
      contractPaymentId: source === "contract" ? contractPaymentId || null : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>التاريخ</FieldLabel>
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <FieldLabel>المبلغ (ر.س)</FieldLabel>
          <TextInput type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>

      <div>
        <FieldLabel>المصدر</FieldLabel>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border"
        >
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {source === "contract" ? (
        <div>
          <FieldLabel>دفعة العقد المرتبطة</FieldLabel>
          <select
            value={contractPaymentId}
            onChange={(e) => setContractPaymentId(e.target.value)}
            className="w-full px-3 py-2.5 border border-line rounded-lg text-sm font-sans bg-white box-border"
          >
            <option value="">— بلا ربط بدفعة عقد محدَّدة —</option>
            {contractPayments.map((p) => (
              <option key={p.id} value={p.id}>
                {p.contractName} — {p.title} ({fmtMoney(p.amount ?? 0)})
              </option>
            ))}
          </select>
          {contractPayments.length === 0 && (
            <p className="text-[11px] text-warn mt-1">لا توجد دفعات عقد مسجّلة بعد لهذا المشروع.</p>
          )}
        </div>
      ) : (
        <div>
          <FieldLabel>رقم العقد/المرجع (اختياري)</FieldLabel>
          <TextInput value={contractRef} onChange={(e) => setContractRef(e.target.value)} />
        </div>
      )}

      <div>
        <FieldLabel>ملاحظة (اختياري)</FieldLabel>
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <ErrorText>{error}</ErrorText>

      <div className="flex gap-2 pt-2">
        <SecondaryButton type="button" onClick={onCancel} className="flex-1">
          إلغاء
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={!canSubmit || submitting} className="flex-1">
          {submitting ? "جارٍ الحفظ..." : "إضافة الدفعة"}
        </PrimaryButton>
      </div>
    </form>
  );
}
