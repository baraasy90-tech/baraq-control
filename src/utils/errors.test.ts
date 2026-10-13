import { describe, expect, it } from "vitest";
import { getUserErrorMessage } from "./errors";

describe("user error messages", () => {
  it("keeps specific workflow explanations", () => {
    expect(getUserErrorMessage({ code: "P0001", message: "سبق اعتماد هذه الدفعة" })).toBe("سبق اعتماد هذه الدفعة");
  });
  it("does not display internal table names for failed row mutations", () => {
    const message = getUserErrorMessage({ code: "PGRST116", message: "JSON object requested, zero rows returned" });
    expect(message).toContain("السجل غير موجود");
    expect(message).not.toContain("JSON");
  });
  it("does not hide uncertain network outcomes behind a success or automatic retry", () => {
    expect(getUserErrorMessage(new TypeError("Failed to fetch"))).toContain("نتيجة العملية");
    expect(getUserErrorMessage({ code: "23505", message: "duplicate key in private_table" })).not.toContain("private_table");
  });
});
