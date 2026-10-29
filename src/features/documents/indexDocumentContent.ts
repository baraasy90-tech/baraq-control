import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/database.types';
import { storedFilePath } from '@/lib/supabase/storagePath';
import type { ProjectDocument } from '@/types/domain';
import { contentFileKind, decodeDocumentText, readContentBytes } from './contentText';
export async function indexDocumentContent(document: ProjectDocument, ownerId: string, signal: AbortSignal, remove = false) {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session || session.user.id !== ownerId)
        throw new Error('تغير الحساب أو انتهت الجلسة.');
    const client = createClient<Database>(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: `Bearer ${session.access_token}` }, fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.any([signal, ...(init?.signal ? [init.signal] : [])]) }) } });
    let text: string | null = null, sha: string | null = null, extractor: string | null = null;
    if (!remove) {
        const kind = contentFileKind(document.name);
        if (!kind)
            throw new Error('هذه الصيغة غير مدعومة في الفهرسة الحالية.');
        const signed = await client.storage.from('documents').createSignedUrl(storedFilePath('documents', document.fileUrl), 120);
        if (signed.error)
            throw signed.error;
        const bytes = await readContentBytes(await fetch(signed.data.signedUrl, { signal }), signal);
        sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
        if (kind === 'pdf') {
            const { extractPdfText } = await import('./extractPdfText');
            text = await extractPdfText(bytes, signal);
            extractor = 'pdf-text-v1';
        }
        else {
            text = decodeDocumentText(bytes);
            extractor = 'utf-text-v1';
        }
    }
    signal.throwIfAborted();
    if ((await supabase.auth.getSession()).data.session?.user.id !== ownerId)
        throw new Error('تغير الحساب؛ توقفت الفهرسة.');
    const result = await client.rpc('set_document_content', { p_document_id: document.id, p_expected_version: document.rowVersion ?? 0, p_text: text, p_sha256: sha, p_extractor: extractor });
    if (result.error)
        throw result.error;
    return text?.length ?? 0;
}
