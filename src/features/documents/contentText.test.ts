import { describe, it, expect } from 'vitest';
import { contentFileKind, decodeDocumentText, checkDocumentText, readContentBytes, MAX_CONTENT_BYTES } from './contentText';
describe('bounded content extraction', () => {
    it('selects text formats without claiming CAD images or DOCX support', () => { for (const name of ['plan.PDF', 'note.txt', 'schedule.xer', 'table.csv', 'model.xml'])
        expect(contentFileKind(name)).not.toBeNull(); for (const name of ['plan.dwg', 'photo.png', 'letter.docx', 'model.rvt', 'archive.zip'])
        expect(contentFileKind(name)).toBeNull(); });
    it('reads Arabic UTF8 and UTF16 BOM without corrupting characters', () => { expect(decodeDocumentText(new TextEncoder().encode('اعتماد مخططات'))).toBe('اعتماد مخططات'); expect(decodeDocumentText(new Uint8Array([255, 254, 0x27, 0x06]))).toBe('ا'); expect(decodeDocumentText(new Uint8Array([254, 255, 0x06, 0x27]))).toBe('ا'); });
    it('rejects binary input and invalid encodings instead of indexing replacement characters', () => { expect(() => decodeDocumentText(new Uint8Array([255, 255]))).toThrow(); expect(() => decodeDocumentText(new Uint8Array([65, 0, 66]))).toThrow(); });
    it('does not mark blank or oversized extracted content complete', () => { expect(() => checkDocumentText(' \n ')).toThrow(/OCR/); expect(() => checkDocumentText('x'.repeat(200001))).toThrow(); });
    it('keeps text and markup as data without executing or dropping it', () => { expect(decodeDocumentText(new TextEncoder().encode('<script>alert(1)</script>'))).toBe('<script>alert(1)</script>'); });
    it('bounds actual streamed bytes even with a missing length header', async () => { const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_CONTENT_BYTES)); controller.enqueue(new Uint8Array(1)); controller.close(); } })); await expect(readContentBytes(response, new AbortController().signal)).rejects.toThrow(/10/); });
    it('handles transport failures and cancellation before returning extracted bytes', async () => { await expect(readContentBytes(new Response('error', { status: 500 }), new AbortController().signal)).rejects.toThrow(); const controller = new AbortController(); controller.abort(); await expect(readContentBytes(new Response('text'), controller.signal)).rejects.toThrow(); });
    it('preserves the exact byte sequence across arbitrary chunks', async () => { const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1, 2])); controller.enqueue(new Uint8Array([3])); controller.close(); } })); expect([...await readContentBytes(response, new AbortController().signal)]).toEqual([1, 2, 3]); });
});
