import { useLayoutEffect, useState } from 'react';
import { Sun, Moon, Check } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { interfaceColors, saveInterfacePreferences, useInterfacePreferences, type InterfacePreferences } from './preferences';

export function InterfaceAppearanceController() {
  const { user } = useAuth();
  const { mode, accent } = useInterfacePreferences(user?.id ?? null);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.baraqMode = mode;
    root.dataset.baraqAccent = accent;
    return () => { delete root.dataset.baraqMode; delete root.dataset.baraqAccent; };
  }, [mode, accent]);
  return null;
}

export function InterfaceAppearanceSettings({ userId }: { userId: string }) {
  const value = useInterfacePreferences(userId);
  const [message, setMessage] = useState('');
  const update = (patch: Partial<InterfacePreferences>) => {
    const persisted = saveInterfacePreferences(userId, { ...value, ...patch });
    setMessage(persisted ? 'تم حفظ مظهر الواجهة على هذا المتصفح.' : 'تم تطبيق المظهر لهذه الجلسة؛ تعذّر حفظه في المتصفح.');
  };
  return <section aria-label="مظهر الواجهة" className="bg-panel border border-line rounded-2xl p-5 sm:p-6">
    <h2 className="text-base font-bold mb-1">مظهر الواجهة</h2>
    <p className="text-xs text-ink-soft mb-4">اختيار شخصي يُطبّق فورًا ويُحفظ لحسابك على هذا المتصفح فقط. لا يغيّر شعار الشركة أو ألوان مشاريعها أو التقارير.</p>
    <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="وضع العرض">
      {([{ id: 'light', name: 'فاتح', Icon: Sun }, { id: 'dark', name: 'غامق', Icon: Moon }] as const).map(({ id, name, Icon }) => <button key={id} type="button" aria-pressed={value.mode === id} onClick={() => update({ mode: id })} className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer ${value.mode === id ? 'border-primary bg-primary-bg text-ink' : 'border-line text-ink-soft'}`}><Icon size={18} />{name}{value.mode === id && <Check size={15} />}</button>)}
    </div>
    <p className="text-sm font-semibold mb-2">لون عناصر الواجهة</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label="لون الواجهة">
      {interfaceColors.map(color => <button key={color.id} type="button" aria-pressed={value.accent === color.id} onClick={() => update({ accent: color.id })} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer text-sm ${value.accent === color.id ? 'border-primary bg-primary-bg' : 'border-line'}`}><span aria-hidden="true" className="w-4 h-4 rounded-full" style={{ background: color.color }} />{color.name}{value.accent === color.id && <Check size={14} />}</button>)}
    </div>
    <p role="status" className="text-xs text-ink-soft mt-3 min-h-4">{message}</p>
  </section>;
}
