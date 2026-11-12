import { validateImportPath } from './importEntries';
import { validateLocalSegment } from './localArchiveStore';

/** Explicit source context for future copy-to resume; legacy imports remain imports. */
export type LocalCopyContext =
  | { kind: 'import' }
  | {
      kind: 'copy-to';
      sourceRoot: FileSystemDirectoryHandle;
      sourcePath: string[];
      sourceName: string;
    };

export function validLocalCopyContext(value: unknown): value is LocalCopyContext {
  if (!value || typeof value !== 'object') return false;
  const context = value as LocalCopyContext;
  if (context.kind === 'import') return true;
  if (
    context.kind !== 'copy-to' ||
    context.sourceRoot?.kind !== 'directory' ||
    typeof context.sourceRoot.isSameEntry !== 'function' ||
    !Array.isArray(context.sourcePath) ||
    context.sourcePath.some(part => typeof part !== 'string') ||
    typeof context.sourceName !== 'string'
  ) return false;
  try {
    validateImportPath([...context.sourcePath, context.sourceName]);
    [...context.sourcePath, context.sourceName].forEach(validateLocalSegment);
    return true;
  } catch {
    return false;
  }
}

export async function sameLocalCopyContext(saved: LocalCopyContext, current: LocalCopyContext): Promise<boolean> {
  if (!validLocalCopyContext(saved) || !validLocalCopyContext(current)) {
    throw new Error('سياق النسخ المحلي غير صالح؛ لا تعتمد سجل الاستئناف.');
  }
  if (saved.kind !== current.kind) return false;
  if (saved.kind === 'import' || current.kind === 'import') return true;
  if (
    saved.sourceName !== current.sourceName ||
    JSON.stringify(saved.sourcePath) !== JSON.stringify(current.sourcePath)
  ) return false;
  try {
    return await saved.sourceRoot.isSameEntry(current.sourceRoot);
  } catch {
    throw new Error('تعذر مطابقة مجلد المصدر؛ افحص الإذن والوجهة قبل الاستئناف.');
  }
}
