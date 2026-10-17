import { describe, expect, it } from "vitest";
import { archiveFileType, archiveMatches, folderPath, folderTreeRows, searchArchive } from "./archiveIndex";
import type { DocumentFolder, ProjectDocument } from "@/types/domain";
const folder = (id: string, parentFolderId: string | null, name = id): DocumentFolder => ({ id, parentFolderId, name, projectId: "project" });
const doc = (id: string, folderId: string, name: string): ProjectDocument => ({ id, folderId, name, fileUrl: "private/path", uploadedAt: "2026-10-17T00:00:00Z" });

describe("project archive navigation and search", () => {
  it("finds Arabic text without hamza or vocalization and matches every query word", () => {
    expect(archiveMatches("إعْتماد مخططات الإنشاء", "اعتماد انشاء")).toBe(true);
    expect(archiveMatches("إعتماد مخططات", "اعتماد مالي")).toBe(false);
  });
  it("treats wildcard and regex characters literally", () => {
    expect(archiveMatches("Cost 100% [final].PDF", "100% [final]")).toBe(true);
    expect(archiveMatches("Cost 100 final", "100%")).toBe(false);
  });
  it("orders parents before their descendants and includes detached folders", () => {
    const folders = [folder("child", "root"), folder("root", null), folder("detached", "missing")];
    expect(folderPath(folders, "child").map(f => f.id)).toEqual(["root", "child"]);
    const rows = folderTreeRows(folders);
    expect(rows.find(r => r.folder.id === "child")?.depth).toBe(1);
    expect(rows.map(r => r.folder.id)).toContain("detached");
  });
  it("terminates on cycles, self references and absent links", () => {
    const folders = [folder("a", "b"), folder("b", "a"), folder("self", "self")];
    expect(folderTreeRows(folders)).toHaveLength(3);
    expect(folderPath(folders, "a")).toHaveLength(2);
    expect(folderPath(folders, "missing")).toEqual([]);
  });
  it("handles deep trees without overflowing the stack", () => {
    const folders = Array.from({ length: 12000 }, (_, i) => folder(String(i), i ? String(i - 1) : null));
    expect(folderTreeRows(folders)).toHaveLength(12000);
    expect(folderPath(folders, "11999")).toHaveLength(12000);
  });
  it("finds files by parent path and excludes files outside the available folder set", () => {
    const result = searchArchive([folder("root", null, "العقود"), folder("child", "root", "استشاري")],
      [doc("inside", "child", "Final.PDF"), doc("outside", "foreign", "العقود.pdf")], "عقود استشاري", "pdf");
    expect(result.documents.map(d => d.id)).toEqual(["inside"]);
    expect(result.paths.get("child")).toBe("العقود / استشاري");
  });
  it("filters extensions case insensitively and keeps unknown formats", () => {
    expect(archiveFileType("DRAWING.PDF")).toBe("pdf");
    expect(archiveFileType("meeting.DOCX")).toBe("office");
    expect(archiveFileType("photo.JPEG")).toBe("image");
    expect(archiveFileType("model.ifc")).toBe("other");
    expect(searchArchive([folder("f", null)], [doc("pdf", "f", "a.pdf"), doc("ifc", "f", "a.ifc")], "", "other").documents.map(d => d.id)).toEqual(["ifc"]);
  });
});
