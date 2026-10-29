export const MAX_CONTENT_BYTES = 10 * 1024 * 1024, MAX_CONTENT_CHARACTERS = 200000;
export function contentFileKind(name: string): 'pdf' | 'text' | null {
    const extension = name.split('.').at(-1)?.toLowerCase();
    return extension === 'pdf' ? 'pdf' : ['txt', 'csv', 'tsv', 'md', 'json', 'xml', 'xer', 'log'].includes(extension ?? '') ? 'text' : null;
}
export function decodeDocumentText(bytes: Uint8Array): string {
    let text: string;
    try {
        const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8';
        text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
    }
    catch {
        throw new Error('ترميز النص غير مدعوم؛ احفظ نسخة UTF-8 أو UTF-16 قبل الفهرسة.');
    }
    if (text.includes('\0'))
        throw new Error('المحتوى يبدو ثنائياً ولا يمكن فهرسته كنص.');
    return checkDocumentText(text);
}
export function checkDocumentText(text: string): string {
    if (text.length > MAX_CONTENT_CHARACTERS)
        throw new Error('النص يتجاوز 200000 حرف؛ قسّم الوثيقة قبل الفهرسة.');
    if (!text.trim())
        throw new Error('لم يُستخرج نص قابل للبحث. قد يحتاج الملف إلى OCR.');
    return text;
}
export async function readContentBytes(response: Response, signal: AbortSignal): Promise<Uint8Array<ArrayBuffer>> {
    if (!response.ok || !response.body)
        throw new Error('تعذّر قراءة الملف من التخزين.');
    if (Number(response.headers.get('content-length')) > MAX_CONTENT_BYTES)
        throw new Error('الفهرسة الحالية تدعم ملفات حتى 10 ميجابايت.');
    const reader = response.body.getReader(), chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            signal.throwIfAborted();
            const next = await reader.read();
            if (next.done)
                break;
            size += next.value.byteLength;
            if (size > MAX_CONTENT_BYTES)
                throw new Error('الفهرسة الحالية تدعم ملفات حتى 10 ميجابايت.');
            chunks.push(next.value);
        }
    }
    finally {
        await reader.cancel().catch(() => { });
        reader.releaseLock();
    }
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    return result;
}
