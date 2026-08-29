/** المبلغ الصافي لدفعة عقد بعد خصم الدفعة المقدمة والضمان — نفس الحساب المستخدم بشاشة
 * العقد لعرض تفصيل كل دفعة، مُستخرَج هنا ليُستخدم أيضاً عند تجميع "إجمالي المدفوع فعلياً"
 * عبر كل عقود المشروع (شاشة الميزانية) دون تكرار المنطق. */
export function computeNetPaymentAmount(
  payment: { amount: number | null; isAdvancePayment: boolean },
  contract: { hasAdvancePayment: boolean; advanceDeductionPercentage: number | null; retentionPercentage: number | null }
): number {
  const gross = payment.amount ?? 0;
  const advanceDeduction =
    !payment.isAdvancePayment && contract.hasAdvancePayment ? (gross * (contract.advanceDeductionPercentage ?? 0)) / 100 : 0;
  const retentionDeduction = !payment.isAdvancePayment ? (gross * (contract.retentionPercentage ?? 0)) / 100 : 0;
  return gross - advanceDeduction - retentionDeduction;
}
