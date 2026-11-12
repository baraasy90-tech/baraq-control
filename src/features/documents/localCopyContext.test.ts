import { expect, it } from 'vitest';
import { sameLocalCopyContext, validLocalCopyContext, type LocalCopyContext } from './localCopyContext';
const root = (same: boolean) => ({ kind: 'directory', name: 'same-name', isSameEntry: async () => same }) as unknown as FileSystemDirectoryHandle;
const copy = (sourceRoot: FileSystemDirectoryHandle): Extract<LocalCopyContext, {kind:'copy-to'}> => ({kind:'copy-to', sourceRoot, sourcePath:['Plans'], sourceName:'a.dwg'});
it('does not mix import and copy-to operation contexts', async () => {
 expect(await sameLocalCopyContext({kind:'import'},copy(root(true)))).toBe(false);
 expect(await sameLocalCopyContext({kind:'import'},{kind:'import'})).toBe(true);
});
it('uses source entry identity rather than matching directory names', async () => {
 expect(await sameLocalCopyContext(copy(root(false)),copy(root(true)))).toBe(false);
 expect(await sameLocalCopyContext(copy(root(true)),copy(root(true)))).toBe(true);
});
it('rejects a different source path or filename before checking entry identity', async () => {
 const saved=copy(root(true));
 expect(await sameLocalCopyContext(saved,{...copy(root(true)),sourcePath:['Other']})).toBe(false);
 expect(await sameLocalCopyContext(saved,{...copy(root(true)),sourceName:'b.dwg'})).toBe(false);
});
it('rejects traversal and incomplete source handles', () => {
 expect(validLocalCopyContext({...copy(root(true)),sourcePath:['..']})).toBe(false);
 expect(validLocalCopyContext({...copy(root(true)),sourceRoot:{kind:'directory',name:'same-name'}})).toBe(false);
});
