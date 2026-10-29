import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { checkDocumentText, MAX_CONTENT_CHARACTERS } from './contentText';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
const localAssets = import.meta.glob<string>(['/node_modules/pdfjs-dist/standard_fonts/*.{pfb,ttf}', '/node_modules/pdfjs-dist/cmaps/*.bcmap'], { eager: true, query: '?url', import: 'default' });
export async function extractPdfText(bytes: Uint8Array<ArrayBuffer>, signal: AbortSignal): Promise<string> {
    class LocalBinaryDataFactory {
        async fetch({ kind, filename }: {
            kind: string;
            filename: string;
        }) {
            const directory = kind === 'cMapUrl' ? 'cmaps' : kind === 'standardFontDataUrl' ? 'standard_fonts' : null;
            const url = directory ? localAssets['/node_modules/pdfjs-dist/' + directory + '/' + filename] : null;
            if (!url)
                throw new Error('مورد الخط غير متاح في قارئ PDF.');
            const response = await fetch(url, { signal });
            if (!response.ok)
                throw new Error('تعذر تحميل مورد PDF المحلي.');
            return new Uint8Array(await response.arrayBuffer());
        }
    }
    const worker = new pdfjs.PDFWorker(), task = pdfjs.getDocument({ data: bytes, worker, BinaryDataFactory: LocalBinaryDataFactory, useWorkerFetch: false, disableFontFace: true, stopAtErrors: true, useWasm: false, verbosity: 0 });
    const cancel = () => { void task.destroy().catch(() => { }); worker.destroy(); };
    signal.addEventListener('abort', cancel, { once: true });
    try {
        signal.throwIfAborted();
        const pdf = await task.promise;
        if (pdf.numPages > 100)
            throw new Error('الفهرسة الحالية تدعم PDF حتى 100 صفحة؛ قسّم الملف.');
        let text = '';
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
            signal.throwIfAborted();
            const page = await pdf.getPage(pageNumber), content = await page.getTextContent();
            for (const item of content.items) {
                if ('str' in item)
                    text += item.str + (item.hasEOL ? '\n' : ' ');
                if (text.length > MAX_CONTENT_CHARACTERS)
                    throw new Error('النص يتجاوز 200000 حرف؛ قسّم الملف.');
            }
            text += '\n';
            page.cleanup();
        }
        return checkDocumentText(text);
    }
    catch (error) {
        signal.throwIfAborted();
        if (error && typeof error === 'object' && 'name' in error && error.name === 'PasswordException')
            throw new Error('ملف PDF محمي بكلمة مرور؛ استخدم نسخة نصية متاحة لك.');
        throw error;
    }
    finally {
        signal.removeEventListener('abort', cancel);
        await task.destroy().catch(() => { });
        worker.destroy();
    }
}
