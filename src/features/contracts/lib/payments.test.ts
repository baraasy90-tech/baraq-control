import { describe, it, expect } from "vitest";
import { computeNetPaymentAmount } from "@/features/contracts/lib/payments";

const contractWithAdvanceAndRetention = {
  hasAdvancePayment: true,
  advanceDeductionPercentage: 10,
  retentionPercentage: 5,
};

describe("computeNetPaymentAmount", () => {
  it("deducts both advance recoupment and retention from a regular payment", () => {
    const net = computeNetPaymentAmount({ amount: 100_000, isAdvancePayment: false }, contractWithAdvanceAndRetention);
    // 100,000 - 10% (استرداد الدفعة المقدمة) - 5% (ضمان الأعمال) = 85,000
    expect(net).toBe(85_000);
  });

  it("does not deduct advance recoupment or retention from the advance payment itself", () => {
    const net = computeNetPaymentAmount({ amount: 200_000, isAdvancePayment: true }, contractWithAdvanceAndRetention);
    expect(net).toBe(200_000);
  });

  it("skips the advance deduction when the contract has no advance payment", () => {
    const net = computeNetPaymentAmount(
      { amount: 100_000, isAdvancePayment: false },
      { hasAdvancePayment: false, advanceDeductionPercentage: 10, retentionPercentage: 5 }
    );
    // فقط ضمان الأعمال 5%
    expect(net).toBe(95_000);
  });

  it("treats a null amount as 0", () => {
    const net = computeNetPaymentAmount({ amount: null, isAdvancePayment: false }, contractWithAdvanceAndRetention);
    expect(net).toBe(0);
  });
});
