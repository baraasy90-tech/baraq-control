import { useEffect, useRef, useState } from 'react';
import { useBeforeUnload } from 'react-router-dom';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { SecondaryButton, TextInput } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { supabase } from '@/lib/supabase/client';
import type { ProjectDocument } from '@/types/domain';
import { getUserErrorMessage } from '@/utils/errors';
import { contentFileKind } from './contentText';
import { indexDocumentContent } from './indexDocumentContent';
export function DocumentContentPanel({ projectId, documents, readOnly, disabled, onBusyChange, onOpen, onFolder }: {
    projectId: string;
    documents: ProjectDocument[];
    readOnly: boolean;
    disabled: boolean;
    onBusyChange: (value: boolean) => void;
    onOpen: (id: string, path: string, name: string) => void;
    onFolder: (id: string) => void;
}) {
    const { user } = useAuth(), cache = useQueryClient();
    const [input, setInput] = useState(''), [query, setQuery] = useState(''), [selected, setSelected] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
    const active = useRef(false), abort = useRef<AbortController | null>(null), mounted = useRef(true);
    useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; abort.current?.abort(); }; }, []);
    useEffect(() => () => { abort.current?.abort(); }, [user?.id]);
    useEffect(() => { if (readOnly)
        abort.current?.abort(); }, [readOnly]);
    useBeforeUnload(event => { if (active.current) {
        event.preventDefault();
        event.returnValue = '';
    } });
    const choices = documents.filter(document => contentFileKind(document.name)), document = choices.find(item => item.id === selected) ?? choices[0];
    const results = useInfiniteQuery({ queryKey: ['document-content-search', projectId, query], enabled: query.length >= 2, initialPageParam: null as string | null,
        queryFn: async ({ pageParam, signal }) => { const result = await supabase.rpc('search_document_content', { p_project_id: projectId, p_query: query, p_after: pageParam }).abortSignal(signal); if (result.error)
            throw result.error; return { rows: result.data.slice(0, 30), more: result.data.length > 30 }; },
        getNextPageParam: page => page.more ? page.rows.at(-1)?.document_id : undefined });
    const index = async (remove = false) => {
        if (!user || !document || readOnly || disabled || active.current)
            return;
        active.current = true;
        abort.current = new AbortController();
        setBusy(true);
        setError('');
        setMessage('');
        try {
            const size = await indexDocumentContent(document, user.id, AbortSignal.any([abort.current.signal, AbortSignal.timeout(60000)]), remove);
            if (mounted.current) {
                setMessage(remove ? 'أُزيل فهرس النص؛ الملف الأصلي محفوظ.' : `تمت فهرسة ${document.name} — ${size} حرفاً.`);
                await cache.invalidateQueries({ queryKey: ['document-content-search', projectId] });
            }
        }
        catch (caught) {
            if (mounted.current)
                setError(caught instanceof DOMException && (caught.name === 'AbortError' || caught.name === 'TimeoutError') ? 'توقفت الفهرسة أو انتهت مهلة المعالجة. لم نؤكد فهرساً جديداً.' : getUserErrorMessage(caught, 'تعذّرت الفهرسة. تحقق من الملف والاتصال ثم أعد المحاولة.'));
        }
        finally {
            active.current = false;
            if (mounted.current)
                setBusy(false);
        }
    };
    return <section aria-label="البحث داخل الوثائق" className="bg-panel border border-line rounded-xl p-4 mb-5 min-w-0">
  <h2 className="text-sm font-bold mb-2">البحث داخل الوثائق</h2>
  <p className="text-xs text-ink-soft mb-3">ابحث في النص المفهرس، بما فيه PDF النصي وTXT وCSV وXML وXER. افتح مجلداً ثم اختر وثيقة لفهرستها. الصور وPDF الممسوح يحتاجان OCR لاحقاً. المعالجة على جهازك، ويُحفظ النص ضمن بيانات المشروع.</p>
  <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); setQuery(input.trim()); }}>
   <div className="flex-1 min-w-0 basis-48"><TextInput aria-label="عبارة البحث داخل الوثائق" value={input} maxLength={200} onChange={event => setInput(event.target.value)} placeholder="كلمات من داخل الوثيقة"/></div>
   <SecondaryButton type="submit" disabled={input.trim().length < 2 || results.isFetching}>بحث في المحتوى</SecondaryButton>
  </form>
  {query && <div aria-label="نتائج محتوى الوثائق" className="mt-3">
   {results.isPending && <p role="status" className="text-xs">جارٍ البحث في النصوص المفهرسة...</p>}
   {results.isError ? <p role="alert" className="text-xs text-critical">تعذّر تحديث نتائج المحتوى. <button onClick={() => void results.refetch()}>إعادة البحث</button></p> : results.data && <>
    <p role="status" className="text-xs text-ink-soft">{results.data.pages.reduce((sum, page) => sum + page.rows.length, 0)} نتيجة محملة. النتائج تشمل الوثائق المفهرسة المطابقة لنسختها الحالية فقط؛ تعديل الوثيقة يحتاج إعادة فهرستها.</p>
    <ul className="list-none p-0 space-y-3 mt-2">{results.data.pages.flatMap(page => page.rows).map(row => <li key={row.document_id} className="border border-line rounded-lg p-3 min-w-0">
     <button onClick={() => onOpen(row.document_id, row.file_url, row.name)} className="text-sm text-primary font-bold break-all text-right">{row.name}</button>
     <p className="text-xs whitespace-pre-wrap break-words mt-2" dir="auto">{row.snippet}</p>
     <button className="text-xs text-primary mt-2" onClick={() => onFolder(row.folder_id)}>فتح مجلد الوثيقة</button>
    </li>)}</ul>
    {results.hasNextPage && <SecondaryButton disabled={results.isFetchingNextPage} onClick={() => void results.fetchNextPage()}>المزيد من نتائج المحتوى</SecondaryButton>}
   </>}
  </div>}
  <div className="mt-4 border-t border-line pt-3">
   <label className="text-xs text-ink-soft" htmlFor="content-document">وثيقة من المجلد الحالي</label>
   <select id="content-document" value={document?.id ?? ''} onChange={event => setSelected(event.target.value)} disabled={busy || disabled || !choices.length} className="block max-w-full w-full border border-line rounded-lg p-2 text-sm my-2 bg-panel">
    {!choices.length && <option value="">افتح مجلداً يحتوي وثيقة بصيغة مدعومة</option>}{choices.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
   </select>
   <p className="text-xs text-ink-soft mb-2">حتى 10 ميجابايت و100 صفحة PDF و200000 حرف للوثيقة. هذه حدود معالجة وليست حدود رفع أو باقة.</p>
   <div className="flex flex-wrap gap-2"><SecondaryButton disabled={readOnly || disabled || busy || !document} onClick={() => void index()}>فهرسة الوثيقة المختارة</SecondaryButton><SecondaryButton disabled={readOnly || disabled || busy || !document} onClick={() => void index(true)}>إزالة فهرس الوثيقة</SecondaryButton>{busy && <SecondaryButton onClick={() => abort.current?.abort()}>إيقاف الفهرسة</SecondaryButton>}</div>
   {busy && <p role="status" className="text-xs mt-2">جارٍ استخراج النص وتأكيد الفهرسة...</p>}
   {message && <p role="status" className="text-xs text-green-700 mt-2">{message}</p>}{error && <p role="alert" className="text-xs text-critical mt-2">{error}</p>}
  </div>
 </section>;
}
