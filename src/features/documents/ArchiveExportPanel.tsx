import {useCompany} from "@/features/company/useCompany";
import {localDestination,type LocalDirectory} from "./localDestination";
import { useEffect, useRef, useState } from 'react';
import { useBeforeUnload } from 'react-router-dom';
import { CheckCircle2, Download } from 'lucide-react';
import { SecondaryButton } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { exportError, resumeArchiveExport, startArchiveExport, type ArchiveExportRun } from './archiveExport';
export function ArchiveExportPanel({ project, folderId, disabled, onBusyChange }: {
    project: {
        id: string;
        name: string;
    };
    folderId: string | null;
    disabled: boolean;
    onBusyChange: (busy: boolean) => void;
}) {
    const { user } = useAuth();
    const {company}=useCompany();
    const [saved,setSaved]=useState<LocalDirectory|null>(null);
    useEffect(()=>{let current=true;setSaved(null);if(user)void localDestination(company.id,user.id).then(handle=>{if(current)setSaved(handle);}).catch(()=>{});return()=>{current=false;};},[company.id,user?.id]);
    const run = useRef<ArchiveExportRun | null>(null), active = useRef(false), stop = useRef(false), mounted = useRef(true), abort = useRef<AbortController | null>(null);
    const [busy, setBusy] = useState(false), [error, setError] = useState(''), [, render] = useState(0), [visible, setVisible] = useState(50);
    const picker = (window as unknown as {
        showDirectoryPicker?: (options: {
            mode: 'readwrite';
        }) => Promise<FileSystemDirectoryHandle>;
    }).showDirectoryPicker;
    const refresh = () => { if (mounted.current)
        render(value => value + 1); };
    useEffect(() => { onBusyChange(busy); return () => onBusyChange(false); }, [busy, onBusyChange]);
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; abort.current?.abort(); }; }, []);
    useEffect(() => () => { abort.current?.abort(); }, [user?.id]);
    useBeforeUnload(event => { if (active.current) {
        event.preventDefault();
        event.returnValue = '';
    } });
    const execute = async () => {
        if (!run.current || !abort.current)
            return;
        await resumeArchiveExport(run.current, { stopped: () => stop.current, signal: abort.current.signal, changed: refresh });
    };
    const start = async (scope: string | null, useSaved=false) => {
        if (!picker || !user || disabled || active.current || run.current)
            return;
        active.current = true;
        stop.current = false;
        abort.current = new AbortController();
        setBusy(true);
        setError('');
        setVisible(50);
        try {
            // The native picker must be called directly in the click, before the first await.
            const parent = useSaved && saved ? (await saved.requestPermission({mode:'readwrite'})==='granted' ? saved : null) : await picker.call(window, { mode: 'readwrite' });
            if(!parent)throw new Error('لم يُمنح إذن الكتابة للمجلد المحفوظ. اختر المجلد من جديد أو اسمح بالوصول.');
            if (stop.current || !mounted.current)
                return;
            run.current = await startArchiveExport(parent, { id: project.id, name: project.name }, scope, user.id, abort.current.signal);
            refresh();
            await execute();
        }
        catch (caught) {
            if (mounted.current && !(caught instanceof DOMException && caught.name === 'AbortError'))
                setError(exportError(caught));
        }
        finally {
            active.current = false;
            if (mounted.current) {
                setBusy(false);
                refresh();
            }
        }
    };
    const retry = async () => {
        if (!run.current || active.current || disabled || user?.id !== run.current.ownerId)
            return;
        active.current = true;
        stop.current = false;
        abort.current = new AbortController();
        setBusy(true);
        setError('');
        try {
            await execute();
        }
        catch (caught) {
            if (mounted.current)
                setError(exportError(caught));
        }
        finally {
            active.current = false;
            if (mounted.current) {
                setBusy(false);
                refresh();
            }
        }
    };
    const current = run.current, done = current?.plan.files.filter(item => item.status === 'done').length ?? 0;
    return <section aria-label="تنزيل الأرشيف إلى الجهاز" className="bg-panel border border-line rounded-xl p-4 mb-4">
    <h2 className="font-bold text-sm mb-2"><Download size={16} className="inline ml-1"/>نسخة إلى الجهاز</h2>
    <p className="text-xs text-ink-soft mb-3">اختر مجلداً على جهازك. تُنشأ داخله نسخة مستقلة بمجلداتها وفهرس يوضح اكتمال الملفات. أبقِ الصفحة مفتوحة حتى انتهاء التحقق. عناصر السلة مستثناة.</p>
    {!picker && <p role="status" className="text-xs text-ink-soft">تنزيل المجلدات يحتاج Chrome أو Edge على الكمبيوتر. يمكنك فتح الملفات وتنزيلها منفردة من القائمة.</p>}
    {!current && <div className="flex flex-wrap gap-2">
      {saved&&<SecondaryButton disabled={disabled||busy||!user} onClick={()=>void start(null,true)}>تنزيل إلى الوجهة المحفوظة: {saved.name}</SecondaryButton>}
      <SecondaryButton disabled={!picker || disabled || busy || !user} onClick={() => void start(null)}>تنزيل أرشيف المشروع</SecondaryButton>
      {folderId && <SecondaryButton disabled={!picker || disabled || busy || !user} onClick={() => void start(folderId)}>تنزيل المجلد الحالي</SecondaryButton>}
    </div>}
    {busy && !current && <><p role="status" className="text-xs text-ink-soft mt-2">جارٍ تجهيز فهرس التنزيل...</p><SecondaryButton onClick={() => abort.current?.abort()}>إلغاء التجهيز</SecondaryButton></>}
    {error && <p role="alert" className="text-xs text-critical mt-2">{error}</p>}
    {current && <div className="mt-3 min-w-0">
      <p className="text-xs break-all">المجلد: <b dir="auto">{current.directoryName}</b></p>
      <p role="status" className="text-xs mt-2">{current.complete ? 'اكتملت النسخة وتحقق حفظ جميع الملفات.' : busy ? 'جارٍ التنزيل والتحقق من الملفات...' : 'النسخة غير مكتملة؛ استكملها من هذه الصفحة.'} {done} من {current.plan.files.length} ملف.</p>
      {!!current.plan.files.length && <progress aria-label="تقدم تنزيل الأرشيف" value={done} max={current.plan.files.length} className="w-full h-2"/>}
      {current.manifestName && <p className="text-xs text-ink-soft break-all mt-2">فهرس النتيجة داخل «الفهارس»: {current.manifestName}</p>}
      <ul aria-label="نتائج تنزيل الملفات" className="max-h-56 overflow-auto p-0 list-none text-xs space-y-2 mt-2">{current.plan.files.slice(0, visible).map(item => <li key={item.document.id} className="break-all border-b border-line pb-1">
        <span dir="auto">{item.path.join(' / ')}</span> — {item.status === 'done' ? <span className="text-green-700"><CheckCircle2 size={13} className="inline"/> تم الحفظ والتحقق</span> : item.status === 'copying' ? 'جارٍ التنزيل' : item.status === 'error' ? 'تعذّر التنزيل' : 'في الانتظار'}
        {item.error && <p className="text-critical">{item.error}</p>}
      </li>)}</ul>
      <div className="flex flex-wrap gap-2 mt-3">
        {current.plan.files.length > visible && <SecondaryButton onClick={() => setVisible(value => value + 50)}>عرض نتائج إضافية</SecondaryButton>}
        {busy ? <><SecondaryButton onClick={() => { stop.current = true; }}>إيقاف بعد الملف الجاري</SecondaryButton><SecondaryButton onClick={() => abort.current?.abort()}>إيقاف التنزيل الآن</SecondaryButton></> : <>
          {!current.complete && <SecondaryButton disabled={disabled || user?.id !== current.ownerId} onClick={() => void retry()}>استكمال التنزيل والتحقق</SecondaryButton>}
          <SecondaryButton onClick={() => { run.current = null; setError(''); refresh(); }}>بدء نسخة جديدة</SecondaryButton>
        </>}
      </div>
    </div>}
  </section>;
}
