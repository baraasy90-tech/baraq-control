import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, Folder } from "lucide-react";
import type { DocumentFolder } from "@/types/domain";
import { folderPath, folderTreeRows } from "./archiveIndex";

export function ArchiveFolderTree({ folders, currentFolderId, onOpen }: {
  folders: DocumentFolder[]; currentFolderId: string | null; onOpen: (id: string | null) => void;
}) {
  const [expanded, setExpanded] = useState<Map<string, boolean>>(new Map());
  const rows = useMemo(() => folderTreeRows(folders), [folders]);
  const ancestors = new Set(folderPath(folders, currentFolderId).slice(0, -1).map(folder => folder.id));
  const isExpanded = (id: string) => expanded.get(id) ?? ancestors.has(id);
  const visible = new Set<string>();
  return <nav aria-label="شجرة مجلدات المشروع" className="bg-panel border border-line/60 rounded-xl p-3 min-w-0 lg:sticky lg:top-4">
    <h2 className="text-sm font-bold mb-3">شجرة المجلدات <span className="text-ink-soft font-normal">({folders.length})</span></h2>
    <button type="button" aria-label="فتح جذر الأرشيف" aria-current={currentFolderId === null ? "page" : undefined}
      onClick={() => onOpen(null)} className={`w-full text-right text-sm border-0 rounded-lg p-2 cursor-pointer ${currentFolderId === null ? "bg-primary-bg text-primary font-bold" : "bg-transparent text-ink"}`}>كل مجلدات المشروع</button>
    <ul className="list-none m-0 p-0 max-h-72 lg:max-h-[65vh] overflow-y-auto overflow-x-hidden">
      {rows.map(({ folder, depth, hasChildren }) => {
        const parentVisible = depth === 0 || (visible.has(folder.parentFolderId!) && isExpanded(folder.parentFolderId!));
        if (!parentVisible) return null;
        visible.add(folder.id);
        const open = isExpanded(folder.id);
        return <li key={folder.id} style={{ paddingInlineStart: Math.min(depth, 8) * 12 }}>
          <div className={`flex gap-1 items-center rounded-lg ${folder.id === currentFolderId ? "bg-primary-bg text-primary" : "text-ink"}`}>
            {hasChildren ? <button type="button" aria-label={`${open ? "طي" : "توسيع"} ${folder.name}`} aria-expanded={open}
              onClick={() => setExpanded(previous => new Map(previous).set(folder.id, !open))}
              className="bg-transparent border-0 p-1 cursor-pointer shrink-0">{open ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}</button> : <span className="w-5 shrink-0" />}
            <button type="button" aria-label={`فتح مجلد ${folder.name}`} aria-current={folder.id === currentFolderId ? "page" : undefined}
              onClick={() => { setExpanded(new Map()); onOpen(folder.id); }} title={folder.name} className="flex items-center gap-1.5 min-w-0 flex-1 bg-transparent border-0 py-2 text-right text-xs cursor-pointer text-inherit">
              <Folder size={14} className="shrink-0" /><span className="truncate">{folder.name}</span>
            </button>
          </div>
        </li>;
      })}
    </ul>
    {!folders.length && <p className="text-xs text-ink-soft px-2">ابدأ بإنشاء مجلد لمستندات المشروع.</p>}
  </nav>;
}
