import { loadExportCheckpoint, clearExportCheckpoint } from './archiveExportCheckpoint';
import { documentWorkspace } from './documentWorkspace';
import { useCompany } from '@/features/company/useCompany';
import { localDestination, type LocalDirectory } from './localDestination';
import { useEffect, useRef, useState } from 'react';
import { useBeforeUnload } from 'react-router-dom';
import { CheckCircle2, Download } from 'lucide-react';
import { Modal, SecondaryButton } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { exportError, resumeArchiveExport, startArchiveExport, type ArchiveExportRun } from './archiveExport';
export function ArchiveExportPanel({
  project,
  folderId,
  disabled,
  onBusyChange,
}: {
  project: {
    id: string;
    name: string;
  };
  folderId: string | null;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const { user } = useAuth(),
    userId = user?.id;
  const { company } = useCompany();
  const [saved, setSaved] = useState<LocalDirectory | null>(null);
  useEffect(() => {
    let current = true;
    setSaved(null);
    if (userId)
      void documentWorkspace(company.id, userId, project.id)
        .then(async (value) => value.directory ?? (await localDestination(company.id, userId)))
        .then((handle) => {
          if (current) setSaved(handle as LocalDirectory | null);
        })
        .catch(() => {});
    return () => {
      current = false;
    };
  }, [company.id, userId, project.id]);
  const run = useRef<ArchiveExportRun | null>(null),
    active = useRef(false),
    stop = useRef(false),
    mounted = useRef(true),
    abort = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const [loading, setLoading] = useState(true),
    [brokenCheckpoint, setBrokenCheckpoint] = useState(false),
    [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [, render] = useState(0),
    [visible, setVisible] = useState(50);
  const picker = (
    window as unknown as {
      showDirectoryPicker?: (options: { mode: 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker;
  const refresh = () => {
    if (mounted.current) render((value) => value + 1);
  };
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.abort();
    };
  }, []);
  useEffect(
    () => () => {
      abort.current?.abort();
    },
    [userId],
  );
  useBeforeUnload((event) => {
    if (active.current) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
  useEffect(() => {
    let current = true;
    generation.current++;
    abort.current?.abort();
    run.current = null;
    active.current = false;
    setBusy(false);
    setLoading(true);
    setBrokenCheckpoint(false);
    setConfirmClear(false);
    setError('');
    refresh();
    if (!userId) {
      setLoading(false);
      return;
    }
    void loadExportCheckpoint(company.id, userId, project.id)
      .then((value) => {
        if (current) {
          run.current = value;
          refresh();
        }
      })
      .catch(() => {
        if (current) {
          setBrokenCheckpoint(true);
          setError('تعذر قراءة سجل التصدير؛ لا تبدأ نسخة جديدة حتى تعالج السجل أو تمسحه فقط.');
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [company.id, userId, project.id]);
  const execute = async () => {
    if (!run.current || !abort.current) return;
    await resumeArchiveExport(run.current, {
      stopped: () => stop.current,
      signal: abort.current.signal,
      changed: refresh,
    });
  };
  const start = async (scope: string | null, useSaved = false) => {
    if (!picker || !user || disabled || loading || brokenCheckpoint || active.current || run.current) return;
    const context = generation.current;
    active.current = true;
    stop.current = false;
    abort.current = new AbortController();
    setBusy(true);
    setError('');
    setVisible(50);
    try {
      // The native picker must be called directly in the click, before the first await.
      const parent =
        useSaved && saved
          ? (await saved.requestPermission({ mode: 'readwrite' })) === 'granted'
            ? saved
            : null
          : await picker.call(window, { mode: 'readwrite' });
      if (!parent) throw new Error('لم يُمنح إذن الكتابة للمجلد المحفوظ. اختر المجلد من جديد أو اسمح بالوصول.');
      if (stop.current || !mounted.current) return;
      const started = await startArchiveExport(
        parent,
        { id: project.id, name: project.name },
        scope,
        user.id,
        abort.current.signal,
        company.id,
      );
      if (!mounted.current || context !== generation.current) return;
      run.current = started;
      refresh();
      await execute();
    } catch (caught) {
      if (
        mounted.current &&
        context === generation.current &&
        !(caught instanceof DOMException && caught.name === 'AbortError')
      ) {
        setError(exportError(caught));
        try {
          if (run.current?.complete) return;
          const loaded = await loadExportCheckpoint(company.id, user.id, project.id);
          if (context === generation.current && mounted.current) run.current = loaded;
        } catch {
          if (context === generation.current && mounted.current) setBrokenCheckpoint(true);
        }
      }
    } finally {
      if (context === generation.current) active.current = false;
      if (mounted.current && context === generation.current) {
        setBusy(false);
        refresh();
      }
    }
  };
  const retry = async () => {
    if (
      !run.current ||
      active.current ||
      disabled ||
      user?.id !== run.current.ownerId ||
      company.id !== run.current.companyId
    )
      return;
    const context = generation.current;
    active.current = true;
    stop.current = false;
    abort.current = new AbortController();
    setBusy(true);
    setError('');
    try {
      const destination = run.current.destination as LocalDirectory;
      if ((await destination.requestPermission({ mode: 'readwrite' })) !== 'granted')
        throw new Error('لم تتوفر صلاحية الكتابة للنسخة المحفوظة.');
      if (context !== generation.current || !mounted.current) return;
      await execute();
    } catch (caught) {
      if (mounted.current && context === generation.current) setError(exportError(caught));
    } finally {
      if (context === generation.current) active.current = false;
      if (mounted.current && context === generation.current) {
        setBusy(false);
        refresh();
      }
    }
  };
  const current = run.current,
    done = current?.plan.files.filter((item) => item.status === 'done').length ?? 0;
  return (
    <section aria-label="تنزيل الأرشيف إلى الجهاز" className="bg-panel border border-line rounded-xl p-4 mb-4">
      <h2 className="font-bold text-sm mb-2">
        <Download size={16} className="inline ml-1" />
        نسخة إلى الجهاز
      </h2>
      <p className="text-xs text-ink-soft mb-3">
        اختر مجلداً على جهازك. تُنشأ داخله نسخة مستقلة بمجلداتها وفهرس يوضح اكتمال الملفات. يحفظ التقدم لهذا الحساب
        والمشروع على هذا المتصفح، ويمكن استكمال النسخة بعد إعادة فتح الصفحة ومنح الإذن. لا يعمل التنزيل في الخلفية بعد
        إغلاق الصفحة. عناصر السلة مستثناة.
      </p>
      {!picker && (
        <p role="status" className="text-xs text-ink-soft">
          تنزيل المجلدات يحتاج Chrome أو Edge على الكمبيوتر. يمكنك فتح الملفات وتنزيلها منفردة من القائمة.
        </p>
      )}
      {loading && (
        <p role="status" className="text-xs">
          جارٍ تحميل سجل التصدير...
        </p>
      )}
      {brokenCheckpoint && (
        <SecondaryButton disabled={busy || disabled || !user} onClick={() => setConfirmClear(true)}>
          مسح سجل التصدير فقط
        </SecondaryButton>
      )}
      {!current && (
        <div className="flex flex-wrap gap-2">
          {saved && (
            <SecondaryButton
              disabled={disabled || busy || loading || brokenCheckpoint || !user}
              onClick={() => void start(null, true)}
            >
              تنزيل إلى الوجهة المحفوظة: {saved.name}
            </SecondaryButton>
          )}
          <SecondaryButton
            disabled={!picker || disabled || busy || loading || brokenCheckpoint || !user}
            onClick={() => void start(null)}
          >
            تنزيل أرشيف المشروع
          </SecondaryButton>
          {folderId && (
            <SecondaryButton
              disabled={!picker || disabled || busy || loading || brokenCheckpoint || !user}
              onClick={() => void start(folderId)}
            >
              تنزيل المجلد الحالي
            </SecondaryButton>
          )}
        </div>
      )}
      {busy && !current && (
        <>
          <p role="status" className="text-xs text-ink-soft mt-2">
            جارٍ تجهيز فهرس التنزيل...
          </p>
          <SecondaryButton onClick={() => abort.current?.abort()}>إلغاء التجهيز</SecondaryButton>
        </>
      )}
      {error && (
        <p role="alert" className="text-xs text-critical mt-2">
          {error}
        </p>
      )}
      {current && (
        <div className="mt-3 min-w-0">
          <p className="text-xs break-all">
            المجلد: <b dir="auto">{current.directoryName}</b>
          </p>
          <p role="status" className="text-xs mt-2">
            {current.complete
              ? 'اكتملت النسخة وتحقق حفظ جميع الملفات.'
              : busy
                ? 'جارٍ التنزيل والتحقق من الملفات...'
                : 'النسخة محفوظة وغير مكتملة؛ استكملها من هذه الصفحة أو بعد إعادة فتحها.'}{' '}
            {done} من {current.plan.files.length} ملف.
          </p>
          {!!current.plan.files.length && (
            <progress
              aria-label="تقدم تنزيل الأرشيف"
              value={done}
              max={current.plan.files.length}
              className="w-full h-2"
            />
          )}
          {current.manifestName && (
            <p className="text-xs text-ink-soft break-all mt-2">فهرس النتيجة داخل «الفهارس»: {current.manifestName}</p>
          )}
          <ul aria-label="نتائج تنزيل الملفات" className="max-h-56 overflow-auto p-0 list-none text-xs space-y-2 mt-2">
            {current.plan.files.slice(0, visible).map((item) => (
              <li key={item.document.id} className="break-all border-b border-line pb-1">
                <span dir="auto">{item.path.join(' / ')}</span> —{' '}
                {item.status === 'done' ? (
                  <span className="text-green-700">
                    <CheckCircle2 size={13} className="inline" /> تم الحفظ والتحقق
                  </span>
                ) : item.status === 'copying' ? (
                  'جارٍ التنزيل'
                ) : item.status === 'error' ? (
                  'تعذّر التنزيل'
                ) : (
                  'في الانتظار'
                )}
                {item.error && <p className="text-critical">{item.error}</p>}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 mt-3">
            {current.plan.files.length > visible && (
              <SecondaryButton onClick={() => setVisible((value) => value + 50)}>عرض نتائج إضافية</SecondaryButton>
            )}
            {busy ? (
              <>
                <SecondaryButton
                  onClick={() => {
                    stop.current = true;
                  }}
                >
                  إيقاف بعد الملف الجاري
                </SecondaryButton>
                <SecondaryButton onClick={() => abort.current?.abort()}>إيقاف التنزيل الآن</SecondaryButton>
              </>
            ) : (
              <>
                {!current.complete && (
                  <SecondaryButton
                    disabled={disabled || user?.id !== current.ownerId || company.id !== current.companyId}
                    onClick={() => void retry()}
                  >
                    استكمال التنزيل والتحقق
                  </SecondaryButton>
                )}
                <SecondaryButton
                  disabled={disabled || user?.id !== current.ownerId || company.id !== current.companyId}
                  onClick={() => {
                    if (!user || user.id !== current.ownerId || company.id !== current.companyId) return;
                    if (current.complete) {
                      const context = generation.current;
                      void clearExportCheckpoint(company.id, current.ownerId, current.project.id, current.checkpointId)
                        .then(() => {
                          if (context === generation.current) {
                            run.current = null;
                            setError('');
                            refresh();
                          }
                        })
                        .catch((caught) => {
                          if (context === generation.current) setError(exportError(caught));
                        });
                    } else setConfirmClear(true);
                  }}
                >
                  بدء نسخة جديدة
                </SecondaryButton>
              </>
            )}
          </div>
        </div>
      )}
      {confirmClear && (
        <Modal
          title="مسح سجل التصدير فقط"
          onClose={() => {
            if (!busy) setConfirmClear(false);
          }}
        >
          <p className="text-sm">
            يمسح هذا سجل الاستئناف لهذا المشروع والحساب على هذا المتصفح. تبقى الملفات السحابية والمحلية والنسخة الجزئية
            دون حذف. بعد المسح يبدأ التنزيل في نسخة مستقلة جديدة.
          </p>
          <SecondaryButton
            disabled={busy || disabled || !user}
            onClick={() => {
              if (!user) return;
              const context = generation.current;
              setBusy(true);
              void navigator.locks
                .request('baraq-archive-export-write', () =>
                  clearExportCheckpoint(company.id, user.id, project.id, run.current?.checkpointId),
                )
                .then(() => {
                  if (context === generation.current) {
                    run.current = null;
                    setBrokenCheckpoint(false);
                    setConfirmClear(false);
                    setError('');
                    refresh();
                  }
                })
                .catch((caught) => {
                  if (context === generation.current) setError(exportError(caught));
                })
                .finally(() => {
                  if (context === generation.current) setBusy(false);
                });
            }}
          >
            تأكيد مسح السجل فقط
          </SecondaryButton>
          {error && (
            <p role="alert" className="text-xs text-critical">
              {error}
            </p>
          )}
        </Modal>
      )}
    </section>
  );
}
