import { describe, expect, it } from "vitest";
import { archiveNameError, renamedArchiveFile, splitArchiveFileName } from "./archiveNames";

describe("archive names", () => {
  it("preserves the original extension and trims only the entered base", () => {
    expect(renamedArchiveFile("Drawing.PDF", "  اعتماد مخطط  ")).toBe("اعتماد مخطط.PDF");
    expect(renamedArchiveFile("package.tar.gz", "package revised.tar")).toBe("package revised.tar.gz");
  });
  it("supports extensionless names and dot files", () => {
    expect(splitArchiveFileName(".notes")).toEqual({ base: ".notes", extension: "" });
    expect(renamedArchiveFile("محضر", "محضر جديد")).toBe("محضر جديد");
  });
  it("rejects empty names, traversal names, separators and control characters", () => {
    for (const name of [" ", ".", "..", "folder/file", "folder\\file", "a\nb", "a\u0000b"]) expect(archiveNameError(name)).not.toBeNull();
    expect(() => renamedArchiveFile("a.pdf", "..")).toThrow();
  });
  it("counts the preserved extension in the name limit", () => {
    expect(() => renamedArchiveFile("a.pdf", "a".repeat(198))).toThrow();
    expect(archiveNameError("أ".repeat(200))).toBeNull();
  });
});
