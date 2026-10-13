import { describe, expect, it } from "vitest";
import { passwordValidationMessage } from "./passwordRecovery";

describe("password recovery validation", () => {
  it("rejects a matching short password", () => expect(passwordValidationMessage("short", "short")).toContain("8"));
  it("rejects mismatched confirmation", () => expect(passwordValidationMessage("strong-password", "another-password")).toContain("غير متطابقتين"));
  it("accepts a matching long password without silently trimming it", () => expect(passwordValidationMessage("  strong password  ", "  strong password  ")).toBeNull());
});
