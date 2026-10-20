import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Modal, SecondaryButton, PrimaryButton } from '@/components/ui';
import { getUserErrorMessage } from '@/utils/errors';
export function ArchiveTrashModal({ projectId, readOnly, onClose }: {
    projectId: string;
    readOnly: boolean;
    onClose: () => void;
}) {
    const cache = useQueryClient(), [error, setError] = useState(''), [notice, setNotice] = useState('');
    const list = useInfiniteQuery({ queryKey: ['document-trash', projectId], initialPageParam: null as {
            deleted_at: string;
            id: string;
        } | null, queryFn: async ({ pageParam }) => { let query = supabase.from('document_trash').select('*').eq('project_id', projectId).is('restored_at', null).order('deleted_at', { ascending: false }).order('id', { ascending: false }).limit(31); if (pageParam)
            query = query.or('deleted_at.lt.' + pageParam.deleted_at + ',and(deleted_at.eq.' + pageParam.deleted_at + ',id.lt.' + pageParam.id + ')'); const r = await query; if (r.error)
            throw r.error; const rows = r.data.slice(0, 30), last = rows.at(-1); return { rows, next: r.data.length > 30 && last ? { deleted_at: last.deleted_at, id: last.id } : undefined }; }, getNextPageParam: last => last.next });
    const restore = useMutation({ mutationFn: async (id: string) => { if (readOnly)
            throw new Error('الاستعادة متوقفة في وضع القراءة فقط.'); const r = await supabase.rpc('restore_project_archive', { p_project_id: projectId, p_batch_id: id }); if (r.error)
            throw r.error; return r.data; }, onSuccess: async () => { setNotice('تمت الاستعادة مع الاحتفاظ بالملفات ومواقعها الأصلية.'); await Promise.all([cache.invalidateQueries({ queryKey: ['document-trash', projectId] }), cache.invalidateQueries({ queryKey: ['document-folders', projectId] }), cache.invalidateQueries({ queryKey: ['documents'] }), cache.invalidateQueries({ queryKey: ['project-document-index'] })]); } });
    const rows = list.data?.pages.flatMap(p => p.rows) ?? [];
    return <Modal title="سلة محذوفات المشروع" onClose={() => { if (!restore.isPending)
        onClose(); }}><section aria-label="عناصر سلة المشروع" className="space-y-3">
  <p className="text-xs text-ink-soft">يمكن استعادة الملفات والمجلدات إلى مواقعها الأصلية. لا يوجد حذف تلقائي حالياً؛ عناصر السلة تبقى ضمن مساحة التخزين. إذا كان المجلد الحاوي في السلة، استعده أولاً.</p>
  {readOnly && <p role="status" className="text-xs text-critical">الاستعادة متوقفة في وضع القراءة فقط.</p>}
  {notice && <p role="status" className="text-xs text-green-700">{notice}</p>}{error && <p role="alert" className="text-sm text-critical">{error}</p>}
  {list.isPending && <p role="status">جارٍ تحميل السلة...</p>}
  {list.isError && <div role="alert"><p className="text-xs text-critical">تعذّر تحميل أحدث عناصر السلة؛ قد تكون القائمة المعروضة غير مكتملة.</p><SecondaryButton onClick={() => void list.refetch()}>إعادة تحميل السلة</SecondaryButton></div>}
  {list.isSuccess && !rows.length && <p className="text-sm">سلة المشروع فارغة.</p>}
  <ul className="list-none p-0 m-0 space-y-2">{rows.map(row => <li key={row.id} className="border border-line rounded-lg p-3 min-w-0"><p className="font-semibold text-sm break-words">{row.name}</p><p className="text-xs text-ink-soft">{row.root_kind === 'folder' ? 'مجلد' : 'ملف'} · {new Date(row.deleted_at).toLocaleString('ar-SA')}</p><p className="text-xs text-ink-soft">{row.folder_count} مجلد · {row.document_count} ملف</p><PrimaryButton className="text-xs mt-2" aria-label={'استعادة ' + row.name} disabled={readOnly || restore.isPending} onClick={() => { setError(''); setNotice(''); restore.mutate(row.id, { onError: caught => setError(getUserErrorMessage(caught, 'تعذّرت الاستعادة. احتفظ بالعنصر في السلة وأعد المحاولة.')) }); }}>استعادة</PrimaryButton></li>)}</ul>
  {list.hasNextPage && <SecondaryButton disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>عرض المزيد من السلة</SecondaryButton>}
  <SecondaryButton disabled={restore.isPending} onClick={onClose}>إغلاق السلة</SecondaryButton>
 </section></Modal>;
}
