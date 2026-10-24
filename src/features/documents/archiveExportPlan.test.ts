import { describe, expect, it } from 'vitest';
import { archiveExportManifest, finishCrc32, planArchiveExport, safeExportName, updateCrc32 } from './archiveExportPlan';
import type { DocumentFolder, ProjectDocument } from '@/types/domain';
const folder = (id: string, parentFolderId: string | null, name = id): DocumentFolder => ({ id, parentFolderId, name, projectId: 'project' });
const document = (id: string, folderId: string, name = id): ProjectDocument => ({ id, folderId, name, fileUrl: 'private/signed?token=never-export', uploadedAt: '2026-10-24T00:00:00Z', description: 'مخطط معتمد', rowVersion: 4 });
describe('safe local archive export planning', () => {
    it('retains nested and empty folders and puts ancestors before children', () => {
        const result = planArchiveExport([folder('child', 'root'), folder('empty', 'root'), folder('root', null)], [document('file', 'child', 'مخطط.dwg')], null);
        expect(result.folders.map(item => item.folder.id)).toEqual(['root', 'child', 'empty']);
        expect(result.files[0].path).toEqual(['root', 'child', 'مخطط.dwg']);
    });
    it('exports only the selected subtree while retaining its root folder', () => {
        const result = planArchiveExport([folder('root', null), folder('sub', 'root'), folder('outside', null)], [document('a', 'sub'), document('b', 'outside')], 'sub');
        expect(result.folders.map(item => item.folder.id)).toEqual(['sub']);
        expect(result.files.map(item => item.document.id)).toEqual(['a']);
        expect(result.files[0].path).toEqual(['sub', 'a']);
    });
    it('never maps unsafe names to navigation, separators or Windows devices', () => {
        for (const name of ['..', '.', 'CON', 'nul.txt', 'COM1.dwg', 'LPT9', '../file', 'a\\b', '<>:"/|?*', 'x. ', '\u0000']) {
            const safe = safeExportName(name);
            expect(safe).not.toMatch(/[<>:"/\\|?*]/);
            expect([...safe].some(character=>character.charCodeAt(0)<32)).toBe(false);
            expect(safe).not.toMatch(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i);
            expect(safe).not.toMatch(/[. ]$/);
            expect(safe).not.toBe('..');
        }
    });
    it('bounds multibyte names while preserving engineering extensions', () => {
        const name = safeExportName('مخطط'.repeat(200) + '.rvt');
        expect(new TextEncoder().encode(name).length).toBeLessThanOrEqual(150);
        expect(name.endsWith('.rvt')).toBe(true);
        expect(name).not.toContain('\ufffd');
    });
    it('resolves file/folder, Unicode and case collisions without merging', () => {
        const result = planArchiveExport([folder('root', null), folder('child', 'root', 'Plan.RVT')], [document('aaaaaaaa1', 'root', 'plan.rvt'), document('aaaaaaaa2', 'root', 'PLAN.RVT'), document('aaaaaaaa3', 'root', 'ＰＬＡＮ.rvt')], null);
        const names = [result.folders.find(item => item.folder.id === 'child')!.path.at(-1)!, ...result.files.map(item => item.path.at(-1)!)];
        expect(new Set(names.map(name => name.normalize('NFKC').toLowerCase())).size).toBe(4);
        expect(result.files.every(item => item.path.at(-1)!.toLowerCase().endsWith('.rvt'))).toBe(true);
    });
    it('rejects cycles, missing parents and duplicate IDs before creating a copy', () => {
        expect(() => planArchiveExport([folder('a', 'b'), folder('b', 'a')], [], null)).toThrow();
        expect(() => planArchiveExport([folder('a', 'missing')], [], null)).toThrow();
        expect(() => planArchiveExport([folder('a', null), folder('a', null)], [], null)).toThrow();
        expect(() => planArchiveExport([folder('a', null)], [document('x', 'a'), document('x', 'a')], null)).toThrow();
        expect(() => planArchiveExport([folder('a', null)], [document('x', 'missing')], null)).toThrow();
    });
    it('rejects excessive depth and oversized batches without silently truncating', () => {
        expect(() => planArchiveExport(Array.from({ length: 34 }, (_, i) => folder(String(i), i ? String(i - 1) : null)), [], null)).toThrow();
        expect(() => planArchiveExport([folder('a', null)], Array.from({ length: 10000 }, (_, i) => document(String(i), 'a')), null)).toThrow();
    });
    it('CRC32 agrees with the standard vector across arbitrary stream chunks', () => {
        const bytes = new TextEncoder().encode('123456789');
        let state = 0xffffffff;
        state = updateCrc32(state, bytes.slice(0, 3));
        state = updateCrc32(state, bytes.slice(3));
        expect(finishCrc32(state)).toBe('cbf43926');
        expect(finishCrc32(updateCrc32(0xffffffff, new Uint8Array()))).toBe('00000000');
    });
    it('manifests retain metadata and status without signed URLs or storage paths', () => {
        const plan = planArchiveExport([folder('a', null)], [document('doc', 'a')], null);
        const manifest = archiveExportManifest(plan, { id: 'project', name: 'مشروع' }, null, false, '2026-10-24');
        expect(manifest.complete).toBe(false);
        expect(manifest.documents[0]).toMatchObject({ description: 'مخطط معتمد', rowVersion: 4, status: 'pending', localPath: 'الملفات/a/doc' });
        expect(JSON.stringify(manifest)).not.toMatch(/private|signed|token|fileUrl/);
    });
});
