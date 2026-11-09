import { checkDocumentText, MAX_CONTENT_CHARACTERS } from './contentText';
import {createLocalPdfTask} from './localPdfRuntime';
export async function extractPdfText(bytes: Uint8Array<ArrayBuffer>, signal: AbortSignal): Promise<string> {
    const {worker,task}=createLocalPdfTask(bytes,signal);
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
