import type { ArchiveExportRun } from './archiveExport';
import { planArchiveExport, EXPORT_ITEM_LIMIT, type ExportFile } from './archiveExportPlan';
import { validateLocalSegment } from './localArchiveStore';
export const archiveExportScope = (companyId: string, ownerId: string, projectId: string) => {
  if (!companyId || !ownerId || !projectId) throw new Error('تعذر تحديد حساب تصدير الأرشيف.');
  return JSON.stringify([companyId, ownerId, projectId]);
};
const failure = () => new Error('تعذر حفظ سجل تصدير الأرشيف؛ افحص نتيجة العملية قبل إعادة المحاولة.');
async function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open('baraq-export-checkpoints', 1);
    let blocked = false;
    r.onupgradeneeded = () => {
      r.result.createObjectStore('batches', { keyPath: 'key' });
      r.result.createObjectStore('files', { keyPath: ['batchId', 'document.id'] }).createIndex('batchId', 'batchId');
    };
    r.onerror = () => reject(failure());
    r.onblocked = () => {
      blocked = true;
      reject(failure());
    };
    r.onsuccess = () => {
      if (blocked) {
        r.result.close();
        return;
      }
      r.result.onversionchange = () => r.result.close();
      resolve(r.result);
    };
  });
}
export function validExportPath(value: unknown): value is string[] {
  if (
    !Array.isArray(value) ||
    !value.length ||
    value.length > 33 ||
    value.some(
      (part) => typeof part !== 'string' || part.length > 255 || /[<>:"/\\|?*]/.test(part) || /[. ]$/.test(part),
    )
  )
    return false;
  try {
    value.forEach(validateLocalSegment);
  } catch {
    return false;
  }
  return true;
}
export function validExportFile(value: unknown): value is ExportFile {
  if (!value || typeof value !== 'object') return false;
  const item = value as ExportFile,
    d = item.document;
  if (
    !d ||
    typeof d.id !== 'string' ||
    !d.id ||
    d.id.length > 128 ||
    typeof d.folderId !== 'string' ||
    typeof d.name !== 'string' ||
    typeof d.fileUrl !== 'string' ||
    d.fileUrl.includes('?') ||
    typeof d.uploadedAt !== 'string' ||
    !validExportPath(item.path) ||
    !['pending', 'copying', 'done', 'error'].includes(item.status)
  )
    return false;
  if (
    (item.bytes !== undefined && (!Number.isSafeInteger(item.bytes) || item.bytes < 0)) ||
    (item.crc32 !== undefined && (typeof item.crc32 !== 'string' || !/^[0-9a-f]{8}$/.test(item.crc32)))
  )
    return false;
  if (item.sourceVersion !== undefined && (!item.sourceVersion || typeof item.sourceVersion !== 'object')) return false;
  if (
    (item.needsNewCopy !== undefined && typeof item.needsNewCopy !== 'boolean') ||
    (item.status === 'done' && item.needsNewCopy)
  )
    return false;
  if (
    item.sourceVersion &&
    (!item.sourceVersion.id ||
      typeof item.sourceVersion.id !== 'string' ||
      typeof item.sourceVersion.version !== 'string' ||
      !item.sourceVersion.version ||
      item.sourceVersion.version.length > 512 ||
      (item.sourceVersion.etag !== undefined &&
        (typeof item.sourceVersion.etag !== 'string' ||
          !item.sourceVersion.etag ||
          item.sourceVersion.etag.length > 512)) ||
      !Number.isSafeInteger(item.sourceVersion.size) ||
      item.sourceVersion.size < 0)
  )
    return false;
  if (
    item.status === 'done' &&
    (item.bytes === undefined || !item.crc32 || !item.sourceVersion || item.bytes !== item.sourceVersion.size)
  )
    return false;
  return (
    !item.previousPaths ||
    (Array.isArray(item.previousPaths) && item.previousPaths.length <= 5 && item.previousPaths.every(validExportPath))
  );
}
export async function createExportCheckpoint(run: ArchiveExportRun) {
  const key = archiveExportScope(run.companyId, run.ownerId, run.project.id);
  if (run.plan.files.some((item) => !validExportFile(item))) throw failure();
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['batches', 'files'], 'readwrite'),
        store = tx.objectStore('batches'),
        r = store.get(key);
      r.onsuccess = () => {
        if (r.result) {
          tx.abort();
          return;
        }
        try {
          store.add({
            format: 'baraq-export-checkpoint',
            version: 1,
            key,
            id: run.checkpointId,
            ownerId: run.ownerId,
            companyId: run.companyId,
            project: run.project,
            scope: run.scope,
            createdAt: run.createdAt,
            snapshot: run.snapshot,
            destination: run.destination,
            files: run.files,
            manifests: run.manifests,
            directoryName: run.directoryName,
            folders: run.sourceFolders,
            fileCount: run.plan.files.length,
          });
          for (const item of run.plan.files) tx.objectStore('files').add({ ...item, batchId: run.checkpointId, key });
        } catch {
          try {
            tx.abort();
          } catch {
            /* already aborted */
          }
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(failure());
      tx.onabort = () =>
        reject(new Error('لم يحفظ سجل التصدير؛ قد توجد نسخة محفوظة تحتاج الاستئناف أو مسح سجلها فقط.'));
    });
  } finally {
    db.close();
  }
}
export async function loadExportCheckpoint(
  companyId: string,
  ownerId: string,
  projectId: string,
): Promise<ArchiveExportRun | null> {
  const key = archiveExportScope(companyId, ownerId, projectId),
    db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(['batches', 'files'], 'readonly'),
        r = tx.objectStore('batches').get(key);
      let result: ArchiveExportRun | null = null,
        invalid = false;
      r.onsuccess = () => {
        const h = r.result;
        if (!h) return;
        if (
          h.format !== 'baraq-export-checkpoint' ||
          h.version !== 1 ||
          h.key !== key ||
          h.ownerId !== ownerId ||
          h.companyId !== companyId ||
          h.project?.id !== projectId ||
          typeof h.project?.name !== 'string' ||
          (h.scope !== null && typeof h.scope !== 'string') ||
          typeof h.id !== 'string' ||
          !/^[0-9a-f-]{36}$/.test(h.id) ||
          typeof h.snapshot !== 'string' ||
          !/^[0-9a-f]{64}$/.test(h.snapshot) ||
          typeof h.createdAt !== 'string' ||
          !Number.isFinite(Date.parse(h.createdAt)) ||
          typeof h.directoryName !== 'string' ||
          !Array.isArray(h.folders) ||
          h.folders.length > EXPORT_ITEM_LIMIT ||
          !Number.isInteger(h.fileCount) ||
          h.fileCount < 0 ||
          h.fileCount + h.folders.length > EXPORT_ITEM_LIMIT ||
          [h.destination, h.files, h.manifests].some(
            (handle) => handle?.kind !== 'directory' || typeof handle.isSameEntry !== 'function',
          )
        ) {
          invalid = true;
          return;
        }
        const files = tx
          .objectStore('files')
          .index('batchId')
          .getAll(h.id, EXPORT_ITEM_LIMIT + 1);
        files.onsuccess = () => {
          try {
            const values = files.result;
            if (values.length !== h.fileCount || values.some((item) => item.key !== key || !validExportFile(item)))
              throw failure();
            for (const item of values)
              if (item.status === 'copying') {
                item.status = 'error';
                item.error = 'توقف التنزيل قبل اعتماد تقدم الملف؛ يعاد التحقق عند الاستكمال.';
              }
            const plan = planArchiveExport(
                h.folders,
                values.map((item) => item.document),
                h.scope,
              ),
              byId = new Map(values.map((item) => [item.document.id, item]));
            for (const item of plan.files) {
              const saved = byId.get(item.document.id);
              if (!saved || JSON.stringify(item.path.slice(0, -1)) !== JSON.stringify(saved.path.slice(0, -1)))
                throw failure();
            }
            const paths = [...plan.folders.map((item) => item.path), ...values.map((item) => item.path)].map((path) =>
              JSON.stringify(path.map((part: string) => part.normalize('NFKC').toLowerCase())),
            );
            if (new Set(paths).size !== paths.length) throw failure();
            for (const item of values)
              if (
                item.previousPaths?.some(
                  (path: string[]) => JSON.stringify(path.slice(0, -1)) !== JSON.stringify(item.path.slice(0, -1)),
                )
              )
                throw failure();
            result = {
              ownerId,
              companyId,
              sourceFolders: h.folders,
              checkpointId: h.id,
              project: h.project,
              scope: h.scope,
              createdAt: h.createdAt,
              snapshot: h.snapshot,
              destination: h.destination,
              files: h.files,
              manifests: h.manifests,
              directoryName: h.directoryName,
              plan: { folders: plan.folders, files: plan.files.map((item) => byId.get(item.document.id)) },
              complete: false,
            };
          } catch {
            invalid = true;
          }
        };
      };
      tx.oncomplete = () =>
        invalid ? reject(new Error('سجل تصدير الأرشيف غير صالح؛ لا تعتمد بياناته.')) : resolve(result);
      tx.onerror = () => reject(failure());
      tx.onabort = () => reject(failure());
    });
  } finally {
    db.close();
  }
}
export async function saveExportCheckpointFile(run: ArchiveExportRun, item: ExportFile) {
  if (!validExportFile(item)) throw failure();
  const key = archiveExportScope(run.companyId, run.ownerId, run.project.id),
    db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['batches', 'files'], 'readwrite'),
        r = tx.objectStore('batches').get(key);
      r.onsuccess = () => {
        if (r.result?.id !== run.checkpointId) {
          tx.abort();
          return;
        }
        const store = tx.objectStore('files'),
          old = store.get([run.checkpointId, item.document.id]);
        old.onsuccess = () => {
          if (old.result?.key !== key) {
            tx.abort();
            return;
          }
          try {
            store.put({ ...item, batchId: run.checkpointId, key });
          } catch {
            try {
              tx.abort();
            } catch {
              /* already aborted */
            }
          }
        };
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(failure());
      tx.onabort = () => reject(failure());
    });
  } finally {
    db.close();
  }
}
export async function clearExportCheckpoint(
  companyId: string,
  ownerId: string,
  projectId: string,
  expectedId?: string,
) {
  const key = archiveExportScope(companyId, ownerId, projectId),
    db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['batches', 'files'], 'readwrite'),
        store = tx.objectStore('batches'),
        r = store.get(key);
      r.onsuccess = () => {
        const h = r.result;
        if (!h) return;
        if (expectedId && h.id !== expectedId) {
          tx.abort();
          return;
        }
        if (typeof h.id === 'string') {
          const cursor = tx.objectStore('files').index('batchId').openCursor(h.id);
          cursor.onsuccess = () => {
            if (cursor.result) {
              if (cursor.result.value.key === key) cursor.result.delete();
              cursor.result.continue();
            }
          };
        }
        store.delete(key);
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(failure());
      tx.onabort = () => reject(failure());
    });
  } finally {
    db.close();
  }
}
