import {
  createExportCheckpoint,
  loadExportCheckpoint,
  saveExportCheckpointFile,
  clearExportCheckpoint,
} from './archiveExportCheckpoint';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { storedFilePath } from '@/lib/supabase/storagePath';
import { mapDocument, mapFolder } from './api/mapDocument';
import {
  archiveExportManifest,
  EXPORT_ITEM_LIMIT,
  finishCrc32,
  planArchiveExport,
  safeExportName,
  updateCrc32,
  type ExportPlan,
} from './archiveExportPlan';
import type { DocumentFolder, ProjectDocument } from '@/types/domain';
type Client = SupabaseClient<Database>;
interface Snapshot {
  folders: DocumentFolder[];
  documents: ProjectDocument[];
}
export interface ArchiveExportRun {
  ownerId: string;
  companyId: string;
  checkpointId: string;
  sourceFolders: DocumentFolder[];
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
  if (!session || session.user.id !== ownerId) throw new Error('انتهت جلسة الحساب الذي بدأ التنزيل.');
  const verified = await supabase.auth.getUser();
  signal.throwIfAborted();
  if (verified.error || verified.data.user?.id !== ownerId) throw new Error('تعذر التحقق من جلسة صاحب التنزيل.');
  return createClient<Database>(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: { Authorization: `Bearer ${session.access_token}` },
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.any([signal, ...(init?.signal ? [init.signal] : [])]) }),
    },
  });
}
async function assertIdentity(ownerId: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const session = (await supabase.auth.getSession()).data.session;
  if (!session || session.user.id !== ownerId) throw new Error('تغير الحساب أو انتهت الجلسة؛ توقف التنزيل.');
}
async function loadSnapshot(
  client: Client,
  projectId: string,
  scope: string | null,
  ownerId: string,
  signal: AbortSignal,
): Promise<Snapshot> {
  const folders: DocumentFolder[] = [];
  let cursor = '';
  while (true) {
    await assertIdentity(ownerId, signal);
    let query = client
      .from('document_folders')
      .select('*')
      .eq('project_id', projectId)
      .is('trashed_at', null)
      .order('id')
      .limit(500)
      .abortSignal(signal);
    if (cursor) query = query.gt('id', cursor);
    const result = await query;
    if (result.error) throw result.error;
    folders.push(...result.data.map(mapFolder));
    if (folders.length > EXPORT_ITEM_LIMIT) throw new Error('عدد المجلدات يتجاوز 10000؛ قسّم الأرشيف قبل التنزيل.');
    if (result.data.length < 500) break;
    cursor = result.data.at(-1)!.id;
  }
  const selection = planArchiveExport(folders, [], scope),
    ids = selection.folders.map((item) => item.folder.id),
    documents: ProjectDocument[] = [];
  for (let index = 0; index < ids.length; index += 50) {
    cursor = '';
    const batch = ids.slice(index, index + 50);
    while (true) {
      await assertIdentity(ownerId, signal);
      let query = client
        .from('documents')
        .select('*')
        .in('folder_id', batch)
        .is('trashed_at', null)
        .order('id')
        .limit(500)
        .abortSignal(signal);
      if (cursor) query = query.gt('id', cursor);
      const result = await query;
      if (result.error) throw result.error;
      documents.push(...result.data.map(mapExportDocument));
      if (folders.length + documents.length > EXPORT_ITEM_LIMIT || JSON.stringify(result.data).length > 4000000)
        throw new Error('الأرشيف كبير لهذه الدفعة؛ نزّل مجلدات أصغر.');
      if (result.data.length < 500) break;
      cursor = result.data.at(-1)!.id;
    }
  }
  const snapshot = { folders, documents };
  if (JSON.stringify(snapshot).length > 24000000) throw new Error('بيانات الأرشيف كبيرة؛ نزّل مجلدات أصغر.');
  return snapshot;
}
const mapExportDocument = (row: Parameters<typeof mapDocument>[0]) => {
  const document = mapDocument(row);
  return { ...document, fileUrl: storedFilePath('documents', document.fileUrl) };
};
const fingerprint = async (snapshot: Snapshot) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(
          JSON.stringify({
            folders: [...snapshot.folders].sort((a, b) => a.id.localeCompare(b.id)),
            documents: [...snapshot.documents].sort((a, b) => a.id.localeCompare(b.id)),
          }),
        ),
      ),
    ),
    (n) => n.toString(16).padStart(2, '0'),
  ).join('');
async function exists(directory: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await directory.getFileHandle(name);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return false;
    if (error instanceof DOMException && error.name === 'TypeMismatchError') return true;
    throw error;
  }
}
async function freshDirectory(parent: FileSystemDirectoryHandle, name: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = safeExportName(name) + '-' + crypto.randomUUID();
    if (!(await exists(parent, candidate))) return parent.getDirectoryHandle(candidate, { create: true });
  }
  throw new Error('تعذّر إنشاء مجلد مستقل للتنزيل.');
}
async function freshFile(directory: FileSystemDirectoryHandle, name: string) {
  let candidate = name;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (!(await exists(directory, candidate))) return directory.getFileHandle(candidate, { create: true });
    const ext = name.match(/\.[a-z0-9]{1,12}$/i)?.[0] ?? '',
      stem = ext ? name.slice(0, -ext.length) : name;
    candidate = safeExportName(stem) + '-' + crypto.randomUUID() + ext;
  }
  throw new Error('تعذّر إيجاد اسم ملف متاح دون استبدال.');
}
async function directoryAt(root: FileSystemDirectoryHandle, parts: string[], create = true) {
  let directory = root;
  for (const part of parts) directory = await directory.getDirectoryHandle(part, { create });
  return directory;
}
export async function startArchiveExport(
  parent: FileSystemDirectoryHandle,
  project: {
    id: string;
    name: string;
  },
  scope: string | null,
  ownerId: string,
  signal: AbortSignal,
  companyId: string,
): Promise<ArchiveExportRun> {
  if (!navigator.locks) throw new Error('استئناف التصدير يحتاج Chrome أو Edge حديثاً.');
  return navigator.locks.request('baraq-archive-export-write', { signal }, async () => {
    if (await loadExportCheckpoint(companyId, ownerId, project.id))
      throw new Error('توجد نسخة تصدير محفوظة؛ استأنفها أو امسح سجلها قبل بدء نسخة أخرى.');
    const client = await exportClient(ownerId, signal),
      company = await client.from('projects').select('company_id').eq('id', project.id).abortSignal(signal).single();
    if (company.error || company.data.company_id !== companyId) throw new Error('تعذر التحقق من شركة المشروع.');
    const snapshot = await loadSnapshot(client, project.id, scope, ownerId, signal),
      plan = planArchiveExport(snapshot.folders, snapshot.documents, scope);
    if (!plan.folders.length) throw new Error('لا توجد مجلدات متاحة للتنزيل.');
    await assertIdentity(ownerId, signal);
    const destination = await freshDirectory(parent, project.name + '-' + new Date().toISOString().slice(0, 10));
    const run: ArchiveExportRun = {
      ownerId,
      companyId,
      sourceFolders: snapshot.folders,
      checkpointId: crypto.randomUUID(),
      project,
      scope,
      createdAt: new Date().toISOString(),
      plan,
      snapshot: await fingerprint(snapshot),
      destination,
      files: await destination.getDirectoryHandle('الملفات', { create: true }),
      manifests: await destination.getDirectoryHandle('الفهارس', { create: true }),
      directoryName: destination.name,
      complete: false,
    };
    signal.throwIfAborted();
    await createExportCheckpoint(run);
    await writeManifest(run, false);
    return run;
  });
}
async function writeManifest(run: ArchiveExportRun, complete: boolean) {
  const file = await freshFile(run.manifests, 'فهرس-' + Date.now() + '.json'),
    writer = await file.createWritable();
  try {
    await writer.write(
      JSON.stringify(archiveExportManifest(run.plan, run.project, run.scope, complete, run.createdAt), null, 2),
    );
    await writer.close();
    run.manifestName = file.name;
  } catch (error) {
    await writer.abort().catch(() => {});
    throw error;
  }
}
async function digestStream(stream: ReadableStream<Uint8Array>, signal: AbortSignal) {
  const reader = stream.getReader();
  let state = 0xffffffff,
    bytes = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      if (chunk.done) break;
      state = updateCrc32(state, chunk.value);
      bytes += chunk.value.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return { bytes, crc32: finishCrc32(state) };
}
async function verifyFile(file: FileSystemFileHandle, signal: AbortSignal) {
  const before = await file.getFile(),
    digest = await digestStream(before.stream(), signal),
    after = await file.getFile();
  if (before.size !== after.size || before.lastModified !== after.lastModified)
    throw new Error('تغير الملف المحلي أثناء فحصه.');
  return digest;
}
async function sourceVersion(client: Client, item: ExportPlan['files'][number]) {
  const result = await client.storage.from('documents').info(storedFilePath('documents', item.document.fileUrl));
  if (
    result.error ||
    !result.data ||
    typeof result.data.id !== 'string' ||
    typeof result.data.version !== 'string' ||
    !result.data.version ||
    !Number.isSafeInteger(result.data.size) ||
    result.data.size! < 0
  )
    throw new Error('تعذر التحقق من نسخة ملف المصدر السحابي.');
  const version = {
    id: result.data.id,
    version: result.data.version,
    size: result.data.size!,
    ...(typeof result.data.etag === 'string' && result.data.etag ? { etag: result.data.etag } : {}),
  };
  if (item.sourceVersion && JSON.stringify(item.sourceVersion) !== JSON.stringify(version))
    throw new Error('تغير محتوى المصدر السحابي؛ احتفظ بالنسخة الحالية وابدأ نسخة جديدة.');
  return version;
}
async function sourceResponse(client: Client, item: ExportPlan['files'][number], signal: AbortSignal) {
  const signed = await client.storage
    .from('documents')
    .createSignedUrl(storedFilePath('documents', item.document.fileUrl), 600);
  if (signed.error || !signed.data?.signedUrl) throw new Error('تعذر الحصول على صلاحية تنزيل الملف.');
  const response = await fetch(signed.data.signedUrl, { signal, cache: 'no-store' });
  if (!response.ok || !response.body) {
    await response.body?.cancel().catch(() => {});
    throw new Error('تعذر تنزيل الملف؛ تحقق من الاتصال ثم أعد المحاولة.');
  }
  const remoteTag = response.headers.get('etag'),
    expectedTag = item.sourceVersion?.etag;
  const normalized = (tag: string) => tag.trim().replace(/^W\//i, '').replace(/^"|"$/g, '');
  if (remoteTag && expectedTag && normalized(remoteTag) !== normalized(expectedTag)) {
    await response.body.cancel().catch(() => {});
    throw new Error('استجابة الملف لا تطابق نسخة المصدر السحابي؛ أعد التحقق.');
  }
  return response;
}
async function existingExportFile(run: ArchiveExportRun, item: ExportPlan['files'][number]) {
  try {
    return await (await directoryAt(run.files, item.path.slice(0, -1), false)).getFileHandle(item.path.at(-1)!);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return null;
    throw error;
  }
}
async function verifyDestination(run: ArchiveExportRun) {
  if (
    !(await run.files.isSameEntry(await run.destination.getDirectoryHandle('الملفات'))) ||
    !(await run.manifests.isSameEntry(await run.destination.getDirectoryHandle('الفهارس')))
  )
    throw new Error('تغيرت هوية مجلدات الوجهة؛ لم يبدأ الاستكمال.');
}
export async function resumeArchiveExport(run: ArchiveExportRun, control: ExportControl): Promise<void> {
  if (!navigator.locks) throw new Error('استئناف التصدير يحتاج Chrome أو Edge حديثاً.');
  await navigator.locks.request('baraq-archive-export-write', { signal: control.signal }, async () => {
    const saved = await loadExportCheckpoint(run.companyId, run.ownerId, run.project.id);
    if (!saved || saved.checkpointId !== run.checkpointId)
      throw new Error('تغير سجل التصدير؛ أعد فتح النسخة المحفوظة.');
    Object.assign(run, saved);
    run.complete = false;
    const client = await exportClient(run.ownerId, control.signal);
    let active: ExportPlan['files'][number] | undefined;
    const work = async () => {
      if (
        (await fingerprint(await loadSnapshot(client, run.project.id, run.scope, run.ownerId, control.signal))) !==
        run.snapshot
      )
        throw new Error('تغير الأرشيف منذ بداية التنزيل؛ احتفظ بالنسخة الجزئية وابدأ تنزيلاً جديداً.');
      await verifyDestination(run);
      // Verify every prior result before adding new destination files.
      for (const item of run.plan.files) {
        control.signal.throwIfAborted();
        if (control.stopped()) return;
        if (item.status === 'pending' || item.needsNewCopy) continue;
        await sourceVersion(client, item);
        const handle = await existingExportFile(run, item);
        if (item.status === 'done') {
          let matched = false;
          if (handle) {
            const local = await verifyFile(handle, control.signal);
            matched = local.bytes === item.bytes && local.crc32 === item.crc32;
          }
          if (matched) {
            await sourceVersion(client, item);
            continue;
          }
          item.status = 'error';
          item.needsNewCopy = true;
          item.error = 'تغير الملف المحفوظ أو لم يعد متاحاً. ستنشأ نسخة باسم جديد عند الاستكمال.';
          await saveExportCheckpointFile(run, item);
          control.changed();
          throw new Error(item.error);
        }
        if (handle && item.sourceVersion) {
          const local = await verifyFile(handle, control.signal);
          if (local.bytes === item.sourceVersion.size) {
            const response = await sourceResponse(client, item, control.signal),
              remote = await digestStream(response.body!, control.signal);
            if (remote.bytes !== item.sourceVersion.size) throw new Error('لم يكتمل تنزيل ملف المقارنة؛ أعد المحاولة.');
            await sourceVersion(client, item);
            if (local.bytes === remote.bytes && local.crc32 === remote.crc32) {
              const finalLocal = await verifyFile(handle, control.signal);
              if (finalLocal.bytes !== remote.bytes || finalLocal.crc32 !== remote.crc32)
                throw new Error('تغير الملف المحلي أثناء التحقق من النسخة غير المعتمدة.');
              item.bytes = local.bytes;
              item.crc32 = local.crc32;
              item.status = 'done';
              item.error = undefined;
              await saveExportCheckpointFile(run, item);
              control.changed();
              continue;
            }
          }
          item.needsNewCopy = true;
        }
      }
      for (const folder of run.plan.folders) {
        if (control.stopped()) return;
        control.signal.throwIfAborted();
        await directoryAt(run.files, folder.path);
      }
      for (const item of run.plan.files) {
        if (control.stopped()) return;
        control.signal.throwIfAborted();
        if (item.status === 'done') continue;
        active = item;
        await assertIdentity(run.ownerId, control.signal);
        const source = await client
          .from('documents')
          .select('*')
          .eq('id', item.document.id)
          .is('trashed_at', null)
          .abortSignal(control.signal)
          .single();
        if (source.error) throw source.error;
        if (JSON.stringify(mapExportDocument(source.data)) !== JSON.stringify(item.document))
          throw new Error('تغير المستند أو موقعه؛ ابدأ تنزيلاً جديداً للأرشيف.');
        item.sourceVersion = await sourceVersion(client, item);
        const folder = await directoryAt(run.files, item.path.slice(0, -1)),
          prior = [...item.path];
        let candidate = item.path.at(-1)!;
        if (await exists(folder, candidate)) {
          if ((item.previousPaths?.length ?? 0) >= 5)
            throw new Error('وصل الملف إلى حد خمس نسخ محتفظ بها؛ ابدأ وجهة جديدة.');
          item.previousPaths = [...(item.previousPaths ?? []), prior];
          for (let attempt = 0; attempt < 5; attempt++) {
            const ext = candidate.match(/\.[a-z0-9]{1,12}$/i)?.[0] ?? '',
              stem = ext ? candidate.slice(0, -ext.length) : candidate;
            const next = safeExportName(stem) + '-' + crypto.randomUUID() + ext;
            if (!(await exists(folder, next))) {
              candidate = next;
              break;
            }
          }
          if (await exists(folder, candidate)) throw new Error('تعذر اختيار اسم جديد دون استبدال.');
        }
        item.path = [...item.path.slice(0, -1), candidate];
        item.status = 'copying';
        item.needsNewCopy = false;
        item.error = undefined;
        item.bytes = undefined;
        item.crc32 = undefined;
        await saveExportCheckpointFile(run, item);
        control.changed();
        control.signal.throwIfAborted();
        if (await exists(folder, candidate)) throw new Error('ظهر ملف في وجهة النسخ؛ لم يُستبدل.');
        const handle = await folder.getFileHandle(candidate, { create: true }),
          writer = await handle.createWritable();
        let reader: ReadableStreamDefaultReader<Uint8Array> | undefined,
          state = 0xffffffff,
          bytes = 0;
        try {
          const response = await sourceResponse(client, item, control.signal);
          reader = response.body!.getReader();
          while (true) {
            control.signal.throwIfAborted();
            const chunk = await reader.read();
            if (chunk.done) break;
            await writer.write(chunk.value as Uint8Array<ArrayBuffer>);
            state = updateCrc32(state, chunk.value);
            bytes += chunk.value.byteLength;
          }
          await writer.close();
        } catch (error) {
          await writer.abort().catch(() => {});
          throw error;
        } finally {
          await reader?.cancel().catch(() => {});
          reader?.releaseLock();
        }
        const verified = await verifyFile(handle, control.signal);
        if (verified.bytes !== bytes || verified.crc32 !== finishCrc32(state) || bytes !== item.sourceVersion.size)
          throw new Error('لم يتطابق الملف المحفوظ مع البيانات المنزلة. أعد محاولة هذا الملف.');
        await sourceVersion(client, item);
        await assertIdentity(run.ownerId, control.signal);
        item.bytes = bytes;
        item.crc32 = verified.crc32;
        item.status = 'done';
        await saveExportCheckpointFile(run, item);
        active = undefined;
        control.changed();
      }
      await assertIdentity(run.ownerId, control.signal);
      if (
        (await fingerprint(await loadSnapshot(client, run.project.id, run.scope, run.ownerId, control.signal))) !==
        run.snapshot
      )
        throw new Error('تغير الأرشيف أثناء التنزيل؛ الفهرس غير مكتمل.');
      run.complete = true;
    };
    let failure: unknown;
    try {
      await work();
    } catch (error) {
      if (active) {
        active.status = 'error';
        active.error = exportError(error);
      }
      failure = error;
    }
    try {
      await writeManifest(run, run.complete);
    } catch (error) {
      run.complete = false;
      failure = new Error('تعذّر حفظ فهرس النتيجة. احتفظ بالملفات وأعد محاولة التأكيد. ' + exportError(error));
    }
    if (run.complete) {
      try {
        await clearExportCheckpoint(run.companyId, run.ownerId, run.project.id, run.checkpointId);
      } catch {
        failure = new Error('النسخة مكتملة، لكن تعذر مسح سجل التقدم؛ افحص السجل قبل بدء نسخة جديدة.');
      }
    }
    control.changed();
    if (failure !== undefined) throw failure;
  });
}
export function exportError(error: unknown): string {
  const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
  if (/[\u0600-\u06ff]/.test(message)) return message;
  if (error instanceof DOMException && error.name === 'AbortError')
    return 'توقف التنزيل. الملفات المكتملة محفوظة؛ يمكنك الاستكمال من هذه الصفحة أو بعد إعادة فتحها.';
  if (error instanceof DOMException && error.name === 'QuotaExceededError')
    return 'المساحة المتاحة على الجهاز غير كافية.';
  if (error instanceof DOMException && error.name === 'NotAllowedError')
    return 'لم تتوفر صلاحية الكتابة على المجلد المختار. اسمح بها ثم أعد المحاولة.';
  return 'تعذّر إكمال التنزيل أو التحقق. الملفات المكتملة محفوظة؛ أعد المحاولة أو افتح سجل النسخة المحفوظة.';
}
