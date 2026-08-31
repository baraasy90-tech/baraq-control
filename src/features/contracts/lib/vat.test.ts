import { describe, it, expect } from "vitest";
import { computeVat } from "@/features/contracts/lib/vat";

describe("computeVat", () => {
  it("adds VAT on top when the value is VAT-exclusive", () => {
    const r = computeVat(100_000, false, 15);
    expect(r.valueExcludingVat).toBe(100_000);
    expect(r.vatAmount).toBe(15_000);
    expect(r.valueIncludingVat).toBe(115_000);
  });

  it("extracts VAT from the total when the value is VAT-inclusive", () => {
    const r = computeVat(115_000, true, 15);
    expect(r.valueIncludingVat).toBe(115_000);
    expect(r.valueExcludingVat).toBeCloseTo(100_000, 6);
    expect(r.vatAmount).toBeCloseTo(15_000, 6);
  });

  it("returns the same value in all three fields when the rate is 0", () => {
    const r = computeVat(50_000, false, 0);
    expect(r.valueExcludingVat).toBe(50_000);
    expect(r.vatAmount).toBe(0);
    expect(r.valueIncludingVat).toBe(50_000);
  });
});
