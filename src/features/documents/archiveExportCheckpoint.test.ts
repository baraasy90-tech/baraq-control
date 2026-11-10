import { expect, it } from 'vitest';
import { archiveExportScope, validExportPath, validExportFile } from './archiveExportCheckpoint';
const item = {
  document: {
    id: 'doc',
    folderId: 'folder',
    name: 'a.txt',
    fileUrl: 'owner/object.txt',
    uploadedAt: '2026-11-10T00:00:00Z',
  },
  path: ['folder', 'a.txt'],
  status: 'pending',
};
it('accepts local export names but rejects traversal and Windows-unsafe names', () => {
  expect(validExportPath(['مخططات', 'a.dwg'])).toBe(true);
  for (const path of [['..', 'a.txt'], ['folder', 'a/b'], ['folder', 'a.'], Array(34).fill('folder')])
    expect(validExportPath(path)).toBe(false);
});
it('requires a cloud object version and readback digest before accepting a done item', () => {
  expect(validExportFile({ ...item, status: 'done' })).toBe(false);
  const done = {
    ...item,
    status: 'done',
    bytes: 3,
    crc32: '12345678',
    sourceVersion: { id: 'object', version: 'v1', size: 3 },
  };
  expect(validExportFile(done)).toBe(true);
  expect(validExportFile({ ...done, bytes: 2 })).toBe(false);
  expect(validExportFile({ ...done, sourceVersion: { id: 'object', version: 'v1' } })).toBe(false);
  expect(validExportFile({ ...done, needsNewCopy: true })).toBe(false);
  expect(validExportFile({ ...done, sourceVersion: null })).toBe(false);
});
it('rejects signed URLs and expiry tokens in persistent export metadata', () =>
  expect(
    validExportFile({
      ...item,
      document: { ...item.document, fileUrl: 'https://example.invalid/object/sign/documents/a?token=secret' },
    }),
  ).toBe(false));
it('rejects unsafe retained-copy paths and impossible byte counts', () => {
  expect(validExportFile({ ...item, previousPaths: [['..', 'a.txt']] })).toBe(false);
  expect(validExportFile({ ...item, bytes: -1 })).toBe(false);
});
it('isolates export metadata by company, account and project', () => {
  expect(archiveExportScope('company', 'owner', 'project')).not.toBe(
    archiveExportScope('company', 'member', 'project'),
  );
  expect(() => archiveExportScope('', 'owner', 'project')).toThrow();
});
