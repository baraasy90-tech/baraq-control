import { describe, it, expect } from "vitest";
import { getPlannedAmount, getEstimatedAmount, getActualAmount, computeBudgetRollup } from "@/features/budget/lib/budget";
import { makeActivity, makeBudgetEntry, linkedContract } from "@/test/factories";

describe("getPlannedAmount", () => {
  it("returns 0 for an activity with no budget configured", () => {
    expect(getPlannedAmount(makeActivity())).toBe(0);
  });

  it("returns the lumpsum amount when budgetType is lumpsum", () => {
    expect(getPlannedAmount(makeActivity({ budgetType: "lumpsum", plannedAmount: 50000 }))).toBe(50000);
  });

  it("returns qty * unit price when budgetType is boq", () => {
    const a = makeActivity({ budgetType: "boq", boqQty: 10, boqUnitPrice: 250 });
    expect(getPlannedAmount(a)).toBe(2500);
  });

  it("returns the linked contract's value once the contract is approved", () => {
    const a = makeActivity({ budgetType: "lumpsum", plannedAmount: 1000, ...linkedContract("approved", 24_000_000) });
    expect(getPlannedAmount(a)).toBe(24_000_000);
  });

  it("falls back to the manually entered value while the linked contract is still unapproved", () => {
    // هذا بالضبط السلوك الذي طلبه المستخدم: رقم أُدخل يدوياً يجب ألا يختفي (يهبط لصفر)
    // بمجرد ربط النشاط بعقد مسودة لم يُعتمد بعد.
    const a = makeActivity({ budgetType: "lumpsum", plannedAmount: 24_000_000, ...linkedContract("draft", 24_000_000) });
    expect(getPlannedAmount(a)).toBe(24_000_000);
  });

  it("returns 0 when linked to an unapproved contract and there is no manual fallback value", () => {
    const a = makeActivity({ ...linkedContract("pending_pm_approval", 500_000) });
    expect(getPlannedAmount(a)).toBe(0);
  });

  it("does not count an 'estimated' budgetType toward the planned amount", () => {
    // القيمة التقديرية رقم مرجعي مبكر فقط — يجب ألا تُحتسب كأنها "مخطط" رسمي.
    const a = makeActivity({ budgetType: "estimated", plannedAmount: 999_000 });
    expect(getPlannedAmount(a)).toBe(0);
  });
});

describe("getEstimatedAmount", () => {
  it("returns 0 for an activity with no estimated budget", () => {
    expect(getEstimatedAmount(makeActivity())).toBe(0);
  });

  it("returns 0 for a lumpsum/boq activity (estimated is a separate bucket)", () => {
    expect(getEstimatedAmount(makeActivity({ budgetType: "lumpsum", plannedAmount: 10_000 }))).toBe(0);
  });

  it("returns the value when budgetType is 'estimated'", () => {
    expect(getEstimatedAmount(makeActivity({ budgetType: "estimated", plannedAmount: 24_000_000 }))).toBe(24_000_000);
  });
});

describe("getActualAmount", () => {
  it("sums only entries with status 'approved'", () => {
    const a = makeActivity({
      actualEntries: [
        makeBudgetEntry({ amount: 1000, status: "approved" }),
        makeBudgetEntry({ amount: 2000, status: "pending_pm_approval" }),
        makeBudgetEntry({ amount: 3000, status: "draft" }),
        makeBudgetEntry({ amount: 4000, status: "rejected" }),
        makeBudgetEntry({ amount: 500, status: "approved" }),
      ],
    });
    expect(getActualAmount(a)).toBe(1500);
  });

  it("returns 0 when there are no approved entries", () => {
    const a = makeActivity({ actualEntries: [makeBudgetEntry({ amount: 999, status: "pending_finance_approval" })] });
    expect(getActualAmount(a)).toBe(0);
  });
});

describe("computeBudgetRollup", () => {
  it("sums a parent's own value plus every descendant's value", () => {
    const root = makeActivity({ id: "root", parentId: null });
    const child1 = makeActivity({
      id: "child1",
      parentId: "root",
      budgetType: "lumpsum",
      plannedAmount: 1000,
      actualEntries: [makeBudgetEntry({ amount: 400, status: "approved" })],
    });
    const child2 = makeActivity({
      id: "child2",
      parentId: "root",
      budgetType: "lumpsum",
      plannedAmount: 2000,
      actualEntries: [makeBudgetEntry({ amount: 600, status: "approved" })],
    });
    const grandchild = makeActivity({
      id: "grandchild",
      parentId: "child2",
      budgetType: "lumpsum",
      plannedAmount: 500,
    });

    const rollup = computeBudgetRollup("root", [root, child1, child2, grandchild]);
    expect(rollup.planned).toBe(1000 + 2000 + 500);
    expect(rollup.actual).toBe(400 + 600);
    expect(rollup.variance).toBe(rollup.planned - rollup.actual);
  });

  it("computes variancePct as 0 when there is no planned budget yet", () => {
    const root = makeActivity({ id: "root" });
    const rollup = computeBudgetRollup("root", [root]);
    expect(rollup.variancePct).toBe(0);
  });
});
