import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
const localAssets = import.meta.glob<string>(['/node_modules/pdfjs-dist/standard_fonts/*.{pfb,ttf}', '/node_modules/pdfjs-dist/cmaps/*.bcmap'], { eager: true, query: '?url', import: 'default' });
export function createLocalPdfTask(bytes:Uint8Array<ArrayBuffer>,signal:AbortSignal){
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
    return {worker,task};
}
