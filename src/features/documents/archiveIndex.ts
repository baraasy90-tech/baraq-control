import type { DocumentFolder, ProjectDocument } from "@/types/domain";

export type ArchiveFileType = "all" | "pdf" | "image" | "office" | "other";

export function normalizeArchiveText(text: string) {
  return text.normalize("NFKC").toLocaleLowerCase("ar")
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي");
}

export function archiveMatches(text: string, query: string) {
  const value = normalizeArchiveText(text);
  return normalizeArchiveText(query).trim().split(/\s+/).every(word => value.includes(word));
}

export function folderPath(folders: DocumentFolder[], id: string | null): DocumentFolder[] {
  const byId = new Map(folders.map(folder => [folder.id, folder]));
  return pathFromMap(byId, id);
}

function pathFromMap(byId: Map<string, DocumentFolder>, id: string | null): DocumentFolder[] {
  const visited = new Set<string>();
  const path: DocumentFolder[] = [];
  let folder = id ? byId.get(id) : undefined;
  while (folder && !visited.has(folder.id)) {
    visited.add(folder.id);
    path.push(folder);
    folder = folder.parentFolderId ? byId.get(folder.parentFolderId) : undefined;
  }
  return path.reverse();
}

/** Iterative traversal handles deep legacy folders and damaged parent links without recursion. */
export function folderTreeRows(folders: DocumentFolder[]) {
  const sorted = [...folders].sort((a, b) => a.name.localeCompare(b.name, "ar") || a.id.localeCompare(b.id));
  const ids = new Set(sorted.map(folder => folder.id));
  const children = new Map<string | null, DocumentFolder[]>();
  for (const folder of sorted) {
    const parent = folder.parentFolderId && ids.has(folder.parentFolderId) ? folder.parentFolderId : null;
    const siblings = children.get(parent) ?? [];
    siblings.push(folder);
    children.set(parent, siblings);
  }
  const seen = new Set<string>();
  const rows: { folder: DocumentFolder; depth: number; hasChildren: boolean }[] = [];
  const visit = (root: DocumentFolder) => {
    const stack = [{ folder: root, depth: 0 }];
    while (stack.length) {
      const item = stack.pop()!;
      if (seen.has(item.folder.id)) continue;
      seen.add(item.folder.id);
      const descendants = children.get(item.folder.id) ?? [];
      rows.push({ ...item, hasChildren: descendants.length > 0 });
      for (let i = descendants.length - 1; i >= 0; i--) stack.push({ folder: descendants[i], depth: item.depth + 1 });
    }
  };
  for (const root of children.get(null) ?? []) visit(root);
  for (const folder of sorted) if (!seen.has(folder.id)) visit(folder);
  return rows;
}

export function archiveFileType(name: string): Exclude<ArchiveFileType, "all"> {
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "heic", "tif", "tiff", "bmp"].includes(extension ?? "")) return "image";
  if (["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "csv"].includes(extension ?? "")) return "office";
  return "other";
}

export function searchArchive(folders: DocumentFolder[], documents: ProjectDocument[], query: string, type: ArchiveFileType) {
  const byId = new Map(folders.map(folder => [folder.id, folder]));
  const paths = new Map(folders.map(folder => [folder.id, pathFromMap(byId, folder.id).map(part => part.name).join(" / ")]));
  return {
    folders: type === "all" ? folders.filter(folder => archiveMatches(paths.get(folder.id) ?? folder.name, query)) : [],
    documents: documents.filter(doc => paths.has(doc.folderId) && (type === "all" || archiveFileType(doc.name) === type)
      && archiveMatches(`${doc.name} ${paths.get(doc.folderId)}`, query)),
    paths,
  };
}
