import {it,expect} from 'vitest';import {storedFilePath} from './storagePath';
it('keeps persisted payload stable when signed tokens rotate',()=>{
 const first='https://example.invalid/storage/v1/object/sign/signatures/actor%2Fimage.png?token=first';const second=first.replace('first','second');
 expect(storedFilePath('signatures',first)).toBe('actor/image.png');expect(storedFilePath('signatures',second)).toBe(storedFilePath('signatures',first));
});
it('preserves paths and handles malformed legacy encodings without crashing a list',()=>{expect(storedFilePath('documents','actor/file.pdf')).toBe('actor/file.pdf');const invalid='https://example.invalid/object/sign/documents/%E0%A4';expect(storedFilePath('documents',invalid)).toBe(invalid);});
