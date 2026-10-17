import { useMemo, useState } from "react";
import { FileText, Folder } from "lucide-react";
import { SecondaryButton } from "@/components/ui";
import type { DocumentFolder, ProjectDocument } from "@/types/domain";
import { searchArchive, type ArchiveFileType } from "./archiveIndex";

export function ArchiveSearchResults({ folders, documents, query, type, opening, onOpenFolder, onOpenFile }: {
  folders: DocumentFolder[]; documents: ProjectDocument[]; query: string; type: ArchiveFileType; opening: boolean;
  onOpenFolder: (id: string) => void; onOpenFile: (doc: ProjectDocument) => void;
}) {
  const [limit, setLimit] = useState(50);
  const results = useMemo(() => searchArchive(folders, documents, query, type), [folders, documents, query, type]);
  const rows = [
    ...results.folders.map(folder => ({ kind: "folder" as const, item: folder })),
    ...results.documents.map(doc => ({ kind: "document" as const, item: doc })),
  ];
  return <section aria-label="نتائج بحث الأرشيف">
    <p role="status" className="text-sm text-ink-soft mb-3">{rows.length} نتيجة في مجلدات المشروع المتاحة لك</p>
    {!rows.length && <div className="border border-dashed border-line rounded-xl p-8 text-center text-sm text-ink-soft">لا توجد نتائج. جرّب جزءاً من اسم الملف أو اسم المجلد.</div>}
    <ul className="list-none p-0 m-0 flex flex-col gap-2">
      {rows.slice(0, limit).map(row => <li key={`${row.kind}-${row.item.id}`} className="bg-panel border border-line/60 rounded-lg p-3 min-w-0">
        {row.kind === "folder" ? <button type="button" onClick={() => onOpenFolder(row.item.id)} className="flex gap-2 items-center w-full min-w-0 text-right bg-transparent border-0 cursor-pointer text-sm font-semibold">
          <Folder size={18} className="text-primary shrink-0" /><span className="truncate">{row.item.name}</span><span className="text-xs text-ink-soft mr-auto">مجلد</span>
        </button> : <button type="button" disabled={opening} onClick={() => onOpenFile(row.item)} className="flex gap-2 items-center w-full min-w-0 text-right bg-transparent border-0 cursor-pointer text-sm font-semibold disabled:opacity-50">
          <FileText size={18} className="text-ink-soft shrink-0" /><span className="truncate">{row.item.name}</span>
        </button>}
        <p className="text-xs text-ink-soft break-words mt-2 mb-0">{results.paths.get(row.kind === "folder" ? row.item.id : row.item.folderId)}</p>
        {row.kind === "document" && <button type="button" onClick={() => onOpenFolder(row.item.folderId)} className="text-xs text-primary mt-2 bg-transparent border-0 cursor-pointer">فتح المجلد الحاوي</button>}
      </li>)}
    </ul>
    {rows.length > limit && <SecondaryButton className="mt-4" onClick={() => setLimit(value => value + 50)}>عرض المزيد ({rows.length - limit})</SecondaryButton>}
  </section>;
}
