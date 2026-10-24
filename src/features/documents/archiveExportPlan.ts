import type { DocumentFolder, ProjectDocument } from '@/types/domain';
export const EXPORT_ITEM_LIMIT = 10000;
export interface ExportFolder {
    folder: DocumentFolder;
    path: string[];
}
export interface ExportFile {
    document: ProjectDocument;
    path: string[];
    status: 'pending' | 'copying' | 'done' | 'error';
    bytes?: number;
    crc32?: string;
    error?: string;
}
export interface ExportPlan {
    folders: ExportFolder[];
    files: ExportFile[];
}
// Paths are local names, never remote URLs. Keep a shared namespace for files and folders.
export function safeExportName(original: string): string {
    // eslint-disable-next-line no-control-regex -- strip control characters from local names.
    let name = original.normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, '_').replace(/[. ]+$/g, '').trim();
    if (!name || name === '.' || name === '..')
        name = 'عنصر';
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name))
        name = '_' + name;
    if (new TextEncoder().encode(name).length > 150) {
        const extension = name.match(/\.[a-z0-9]{1,12}$/i)?.[0] ?? '';
        let stem = '';
        for (const point of name.slice(0, extension ? -extension.length : undefined)) {
            if (new TextEncoder().encode(stem + point).length > 130)
                break;
            stem += point;
        }
        name = stem + extension;
    }
    return name;
}
const nameKey = (name: string) => name.normalize('NFKC').toLowerCase();
export function planArchiveExport(folders: DocumentFolder[], documents: ProjectDocument[], scope: string | null): ExportPlan {
    if (folders.length + documents.length > EXPORT_ITEM_LIMIT)
        throw new Error('الأرشيف يتجاوز 10000 عنصر. نزّل مجلدات أصغر على دفعات.');
    const byId = new Map(folders.map(folder => [folder.id, folder]));
    if (byId.size !== folders.length || new Set(documents.map(doc => doc.id)).size !== documents.length)
        throw new Error('تكررت معرفات الأرشيف؛ أعد تحميله.');
    if (scope && !byId.has(scope))
        throw new Error('المجلد المطلوب غير متاح.');
    const selected = new Set<string>();
    for (const folder of folders) {
        const visited = new Set<string>();
        let current: DocumentFolder | undefined = folder, include = !scope;
        while (current) {
            if (visited.has(current.id) || visited.size >= 32)
                throw new Error('شجرة المجلدات غير صالحة أو أعمق من 32 مستوى.');
            visited.add(current.id);
            if (current.id === scope)
                include = true;
            if (current.parentFolderId && !byId.has(current.parentFolderId))
                throw new Error('يوجد مجلد دون مجلد أب متاح؛ لم يبدأ التنزيل.');
            current = current.parentFolderId ? byId.get(current.parentFolderId) : undefined;
        }
        if (include)
            selected.add(folder.id);
    }
    const used = new Map<string, Set<string>>(), paths = new Map<string, string[]>();
    const allocate = (parent: string | null, name: string, id: string) => {
        const key = parent ?? '', names = used.get(key) ?? new Set<string>();
        used.set(key, names);
        let result = safeExportName(name), attempt = 0;
        const extension = result.match(/\.[a-z0-9]{1,12}$/i)?.[0] ?? '';
        const stem = extension ? result.slice(0, -extension.length) : result;
        while (names.has(nameKey(result)))
            result = `${stem} (${id.slice(0, 8)}${attempt++ ? '-' + attempt : ''})${extension}`;
        names.add(nameKey(result));
        return result;
    };
    const folderPath = (id: string): string[] => {
        const cached = paths.get(id);
        if (cached)
            return cached;
        const folder = byId.get(id)!;
        const parent = folder.parentFolderId && selected.has(folder.parentFolderId) ? folder.parentFolderId : null;
        const path = [...(parent ? folderPath(parent) : []), allocate(parent, folder.name, folder.id)];
        paths.set(id, path);
        return path;
    };
    const result: ExportPlan = { folders: [], files: [] };
    for (const id of [...selected].sort())
        folderPath(id);
    for (const id of selected)
        result.folders.push({ folder: byId.get(id)!, path: paths.get(id)! });
    result.folders.sort((a, b) => a.path.length - b.path.length || a.folder.id.localeCompare(b.folder.id));
    for (const document of [...documents].sort((a, b) => a.id.localeCompare(b.id))) {
        if (!byId.has(document.folderId))
            throw new Error('يوجد مستند دون مجلد متاح؛ لم يبدأ التنزيل.');
        if (selected.has(document.folderId))
            result.files.push({ document, path: [...paths.get(document.folderId)!, allocate(document.folderId, document.name, document.id)], status: 'pending' });
    }
    return result;
}
// Incremental CRC detects accidental transfer/disk corruption; it is not a security signature.
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit++)
        value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
});
export function updateCrc32(state: number, chunk: Uint8Array): number {
    for (const byte of chunk)
        state = crcTable[(state ^ byte) & 255] ^ (state >>> 8);
    return state >>> 0;
}
export const finishCrc32 = (state: number) => ((state ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
export function archiveExportManifest(plan: ExportPlan, project: {
    id: string;
    name: string;
}, scope: string | null, complete: boolean, createdAt: string) {
    return { format: 'baraq-document-copy', version: 1, project, scopeFolderId: scope, createdAt, recordedAt: new Date().toISOString(), complete,
        checksum: 'CRC32 (transfer integrity only)',
        folders: plan.folders.map(({ folder, path }) => ({ id: folder.id, parentId: folder.parentFolderId, name: folder.name, localPath: ['الملفات', ...path].join('/') })),
        documents: plan.files.map(({ document: d, path, status, bytes, crc32, error }) => ({ id: d.id, folderId: d.folderId, name: d.name, localPath: ['الملفات', ...path].join('/'), category: d.category ?? null, referenceNumber: d.referenceNumber ?? null, documentDate: d.documentDate ?? null, description: d.description ?? null, rowVersion: d.rowVersion ?? 0, uploadedAt: d.uploadedAt, status, bytes, crc32, error })) };
}
