import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { storedFilePath } from '@/lib/supabase/storagePath';
import { mapDocument, mapFolder } from './api/mapDocument';
import { archiveExportManifest, EXPORT_ITEM_LIMIT, finishCrc32, planArchiveExport, safeExportName, updateCrc32, type ExportPlan } from './archiveExportPlan';
import type { DocumentFolder, ProjectDocument } from '@/types/domain';
type Client = SupabaseClient<Database>;
interface Snapshot {
    folders: DocumentFolder[];
    documents: ProjectDocument[];
}
export interface ArchiveExportRun {
    ownerId: string;
    project: {
        id: string;
        name: string;
    };
    scope: string | null;
    createdAt: string;
    plan: ExportPlan;
    snapshot: string;
    destination: FileSystemDirectoryHandle;
    files: FileSystemDirectoryHandle;
    manifests: FileSystemDirectoryHandle;
    directoryName: string;
    manifestName?: string;
    complete: boolean;
}
export interface ExportControl {
    stopped: () => boolean;
    signal: AbortSignal;
    changed: () => void;
}
export async function exportClient(ownerId: string, signal: AbortSignal): Promise<Client> {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session || session.user.id !== ownerId)
        throw new Error('انتهت جلسة الحساب الذي بدأ التنزيل.');
    return createClient<Database>(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: `Bearer ${session.access_token}` }, fetch: (input,init) => fetch(input,{...init,signal:AbortSignal.any([signal,...(init?.signal?[init.signal]:[])])}) }
    });
}
async function assertIdentity(ownerId: string, signal: AbortSignal) {
    signal.throwIfAborted();
    const session = (await supabase.auth.getSession()).data.session;
    if (!session || session.user.id !== ownerId)
        throw new Error('تغير الحساب أو انتهت الجلسة؛ توقف التنزيل.');
}
async function loadSnapshot(client: Client, projectId: string, scope: string | null, ownerId: string, signal: AbortSignal): Promise<Snapshot> {
    const folders: DocumentFolder[] = [];
    let cursor = '';
    while (true) {
        await assertIdentity(ownerId, signal);
        let query = client.from('document_folders').select('*').eq('project_id', projectId).is('trashed_at', null).order('id').limit(500).abortSignal(signal);
        if (cursor)
            query = query.gt('id', cursor);
        const result = await query;
        if (result.error)
            throw result.error;
        folders.push(...result.data.map(mapFolder));
        if (folders.length > EXPORT_ITEM_LIMIT)
            throw new Error('عدد المجلدات يتجاوز 10000؛ قسّم الأرشيف قبل التنزيل.');
        if (result.data.length < 500)
            break;
        cursor = result.data.at(-1)!.id;
    }
    const selection = planArchiveExport(folders, [], scope), ids = selection.folders.map(item => item.folder.id), documents: ProjectDocument[] = [];
    for (let index = 0; index < ids.length; index += 50) {
        cursor = '';
        const batch = ids.slice(index, index + 50);
        while (true) {
            await assertIdentity(ownerId, signal);
            let query = client.from('documents').select('*').in('folder_id', batch).is('trashed_at', null).order('id').limit(500).abortSignal(signal);
            if (cursor)
                query = query.gt('id', cursor);
            const result = await query;
            if (result.error)
                throw result.error;
            documents.push(...result.data.map(mapDocument));
            if (folders.length + documents.length > EXPORT_ITEM_LIMIT || JSON.stringify(result.data).length > 4000000)
                throw new Error('الأرشيف كبير لهذه الدفعة؛ نزّل مجلدات أصغر.');
            if (result.data.length < 500)
                break;
            cursor = result.data.at(-1)!.id;
        }
    }
    const snapshot = { folders, documents };
    if (JSON.stringify(snapshot).length > 24000000)
        throw new Error('بيانات الأرشيف كبيرة؛ نزّل مجلدات أصغر.');
    return snapshot;
}
const fingerprint = (snapshot: Snapshot) => JSON.stringify({ folders: [...snapshot.folders].sort((a, b) => a.id.localeCompare(b.id)), documents: [...snapshot.documents].sort((a, b) => a.id.localeCompare(b.id)) });
async function exists(directory: FileSystemDirectoryHandle, name: string): Promise<boolean> {
    try {
        await directory.getFileHandle(name);
        return true;
    }
    catch (error) {
        if (error instanceof DOMException && error.name === 'NotFoundError')
            return false;
        if (error instanceof DOMException && error.name === 'TypeMismatchError')
            return true;
        throw error;
    }
}
async function freshDirectory(parent: FileSystemDirectoryHandle, name: string) {
    for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = safeExportName(name) + '-' + crypto.randomUUID();
        if (!await exists(parent, candidate))
            return parent.getDirectoryHandle(candidate, { create: true });
    }
    throw new Error('تعذّر إنشاء مجلد مستقل للتنزيل.');
}
async function freshFile(directory: FileSystemDirectoryHandle, name: string) {
    let candidate = name;
    for (let attempt = 0; attempt < 5; attempt++) {
        if (!await exists(directory, candidate))
            return directory.getFileHandle(candidate, { create: true });
        const ext = name.match(/\.[a-z0-9]{1,12}$/i)?.[0] ?? '', stem = ext ? name.slice(0, -ext.length) : name;
        candidate = safeExportName(stem) + '-' + crypto.randomUUID() + ext;
    }
    throw new Error('تعذّر إيجاد اسم ملف متاح دون استبدال.');
}
async function directoryAt(root: FileSystemDirectoryHandle, parts: string[], create = true) {
    let directory = root;
    for (const part of parts)
        directory = await directory.getDirectoryHandle(part, { create });
    return directory;
}
export async function startArchiveExport(parent: FileSystemDirectoryHandle, project: {
    id: string;
    name: string;
}, scope: string | null, ownerId: string, signal: AbortSignal): Promise<ArchiveExportRun> {
    const client = await exportClient(ownerId,signal), snapshot = await loadSnapshot(client, project.id, scope, ownerId, signal), plan = planArchiveExport(snapshot.folders, snapshot.documents, scope);
    if (!plan.folders.length)
        throw new Error('لا توجد مجلدات متاحة للتنزيل.');
    await assertIdentity(ownerId, signal);
    const destination = await freshDirectory(parent, project.name + '-' + new Date().toISOString().slice(0, 10));
    const run: ArchiveExportRun = { ownerId, project, scope, createdAt: new Date().toISOString(), plan, snapshot: fingerprint(snapshot), destination,
        files: await destination.getDirectoryHandle('الملفات', { create: true }), manifests: await destination.getDirectoryHandle('الفهارس', { create: true }), directoryName: destination.name, complete: false };
    await writeManifest(run, false);
    return run;
}
async function writeManifest(run: ArchiveExportRun, complete: boolean) {
    const file = await freshFile(run.manifests, 'فهرس-' + Date.now() + '.json'), writer = await file.createWritable();
    try {
        await writer.write(JSON.stringify(archiveExportManifest(run.plan, run.project, run.scope, complete, run.createdAt), null, 2));
        await writer.close();
        run.manifestName = file.name;
    }
    catch (error) {
        await writer.abort().catch(() => { });
        throw error;
    }
}
async function verifyFile(file: FileSystemFileHandle, signal: AbortSignal) {
    const reader = (await file.getFile()).stream().getReader();
    let state = 0xffffffff, bytes = 0;
    try {
        while (true) {
            signal.throwIfAborted();
            const result = await reader.read();
            if (result.done)
                break;
            state = updateCrc32(state, result.value);
            bytes += result.value.byteLength;
        }
    }
    finally {
        await reader.cancel().catch(() => { });
        reader.releaseLock();
    }
    return { bytes, crc32: finishCrc32(state) };
}
export async function resumeArchiveExport(run: ArchiveExportRun, control: ExportControl): Promise<void> {
    run.complete = false;
    const client = await exportClient(run.ownerId,control.signal);
    let active: ExportPlan['files'][number] | undefined;
    const work = async () => {
        if (fingerprint(await loadSnapshot(client, run.project.id, run.scope, run.ownerId, control.signal)) !== run.snapshot)
            throw new Error('تغير الأرشيف منذ بداية التنزيل؛ احتفظ بالنسخة الجزئية وابدأ تنزيلاً جديداً.');
        for (const item of run.plan.folders) {
            if (control.stopped())
                return;
            await directoryAt(run.files, item.path);
        }
        for (const item of run.plan.files) {
            if (control.stopped())
                return;
            if (item.status === 'done') {
                try {
                    const directory = await directoryAt(run.files, item.path.slice(0, -1), false), handle = await directory.getFileHandle(item.path.at(-1)!);
                    const verified = await verifyFile(handle, control.signal);
                    if (verified.bytes !== item.bytes || verified.crc32 !== item.crc32)
                        throw new Error('changed');
                    continue;
                }
                catch {
                    control.signal.throwIfAborted();
                    item.status = 'error';
                    item.error = 'تغير الملف المحفوظ أو لم يعد متاحاً. ستنشأ نسخة باسم جديد عند الاستكمال.';
                    control.changed();
                    throw new Error(item.error);
                }
            }
            active = item;
            item.status = 'copying';
            item.error = undefined;
            control.changed();
            await assertIdentity(run.ownerId, control.signal);
            const source = await client.from('documents').select('*').eq('id', item.document.id).is('trashed_at', null).abortSignal(control.signal).single();
            if (source.error)
                throw source.error;
            if (JSON.stringify(mapDocument(source.data)) !== JSON.stringify(item.document))
                throw new Error('تغير المستند أو موقعه؛ ابدأ تنزيلاً جديداً للأرشيف.');
            const signed = await client.storage.from('documents').createSignedUrl(storedFilePath('documents', item.document.fileUrl), 600);
            if (signed.error || !signed.data?.signedUrl)
                throw new Error('تعذّر الحصول على صلاحية تنزيل الملف.');
            const response = await fetch(signed.data.signedUrl, { signal: control.signal });
            if (!response.ok || !response.body)
                throw new Error('تعذّر تنزيل الملف؛ تحقق من الاتصال ثم أعد المحاولة.');
            const folder = await directoryAt(run.files, item.path.slice(0, -1)), handle = await freshFile(folder, item.path.at(-1)!);
            item.path = [...item.path.slice(0, -1), handle.name];
            const writer = await handle.createWritable(), reader = response.body.getReader();
            let state = 0xffffffff, bytes = 0;
            try {
                while (true) {
                    control.signal.throwIfAborted();
                    const chunk = await reader.read();
                    if (chunk.done)
                        break;
                    await writer.write(chunk.value as Uint8Array<ArrayBuffer>);
                    state = updateCrc32(state, chunk.value);
                    bytes += chunk.value.byteLength;
                }
                await writer.close();
            }
            catch (error) {
                await writer.abort().catch(() => { });
                throw error;
            }
            finally {
                await reader.cancel().catch(() => { });
                reader.releaseLock();
            }
            const verified = await verifyFile(handle, control.signal);
            if (verified.bytes !== bytes || verified.crc32 !== finishCrc32(state))
                throw new Error('لم يتطابق الملف المحفوظ مع البيانات المنزلة. أعد محاولة هذا الملف.');
            await assertIdentity(run.ownerId, control.signal);
            item.bytes = bytes;
            item.crc32 = verified.crc32;
            item.status = 'done';
            active = undefined;
            control.changed();
        }
        await assertIdentity(run.ownerId, control.signal);
        if (fingerprint(await loadSnapshot(client, run.project.id, run.scope, run.ownerId, control.signal)) !== run.snapshot)
            throw new Error('تغير الأرشيف أثناء التنزيل؛ الفهرس غير مكتمل. ابدأ نسخة جديدة عند استقرار التعديلات.');
        run.complete = true;
    };
    let failure: unknown;
    try {
        await work();
    }
    catch (error) {
        if (active) {
            active.status = 'error';
            active.error = exportError(error);
        }
        failure = error;
    }
    // A failed final index must never turn a partial copy into a confirmed export.
    try {
        await writeManifest(run, run.complete);
    }
    catch (error) {
        run.complete = false;
        failure = new Error('تعذّر حفظ فهرس النتيجة. احتفظ بالملفات وأعد محاولة التأكيد. ' + exportError(error));
    }
    control.changed();
    if (failure !== undefined)
        throw failure;
}
export function exportError(error: unknown): string {
    const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
    if (/[\u0600-\u06ff]/.test(message))
        return message;
    if (error instanceof DOMException && error.name === 'AbortError')
        return 'توقف التنزيل. الملفات المكتملة محفوظة؛ يمكنك الاستكمال من هذه الصفحة.';
    if (error instanceof DOMException && error.name === 'QuotaExceededError')
        return 'المساحة المتاحة على الجهاز غير كافية.';
    if (error instanceof DOMException && error.name === 'NotAllowedError')
        return 'لم تتوفر صلاحية الكتابة على المجلد المختار. اسمح بها ثم أعد المحاولة.';
    return 'تعذّر إكمال التنزيل أو التحقق. الملفات المكتملة محفوظة؛ أعد المحاولة من هذه الصفحة.';
}
