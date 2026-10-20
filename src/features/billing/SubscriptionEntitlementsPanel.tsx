import {useState} from 'react';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useAuth} from '@/features/auth/AuthContext';
import {supabase} from '@/lib/supabase/client';
import {SecondaryButton,PrimaryButton,FieldLabel,TextInput,ErrorText} from '@/components/ui';
import {getUserErrorMessage} from '@/utils/errors';
import {entitlementSchema,entitlementResponseSchema,entitlementDraft,parseEntitlementDraft,entitlementComplete,entitlementSummary,limitFields,type SubscriptionEntitlement} from './subscriptionEntitlements';

export function SubscriptionEntitlements({companyId}:{companyId:string}) {
 const {user}=useAuth(),cache=useQueryClient();const [reload,setReload]=useState(0);
 const key=['subscription-entitlements',user?.id,companyId];
 const query=useQuery({queryKey:key,refetchOnWindowFocus:false,queryFn:async()=>{const r=await supabase.rpc('get_company_entitlements',{p_company_id:companyId});if(r.error)throw r.error;return entitlementResponseSchema.parse(r.data);}});
 return <section aria-label="حدود الباقة والتزامات الخدمة" className="border border-line rounded-xl p-3">
  <h2 className="font-bold text-sm mb-2">حدود الباقة والتزامات الخدمة</h2>
  <p className="text-xs text-ink-soft mb-3">حدود مخصصة لهذا الاشتراك. الحقل الفارغ يعني «لم تُحدَّد» ولا يعني سعة غير محدودة. حصة النقل تشمل التنزيل ونقل الملفات خلال كل سنة اشتراك، وليست حصة شهرية.</p>
  {query.isPending?<p role="status" className="text-xs">جارٍ تحميل حدود الباقة...</p>:query.isError?<div role="alert"><p className="text-xs text-critical">تعذّر تحميل الحدود؛ لن نعرضها كأنها فارغة.</p><SecondaryButton onClick={()=>void query.refetch()}>إعادة تحميل الحدود</SecondaryButton></div>:<>
   <EntitlementForm key={companyId+'-'+reload} companyId={companyId} initial={query.data.current} onSaved={async()=>{await cache.invalidateQueries({queryKey:key});}}/>
   <SecondaryButton className="text-xs mt-2" onClick={async()=>{const result=await query.refetch();if(result.isSuccess)setReload(n=>n+1);}}>إعادة تحميل الحدود</SecondaryButton>
   <p className="text-xs text-ink-soft mt-1">إعادة التحميل تستبدل المدخلات غير المحفوظة بأحدث حدود مسجلة.</p>
   <details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold">سجل تغييرات حدود الباقة</summary>{!query.data.history.length&&<p>لا توجد تعديلات مسجلة.</p>}{query.data.history.map(entry=><div key={entry.id} className="mt-2 border-t border-line pt-2 break-words"><p>{new Date(entry.changed_at).toLocaleString('ar-SA')}</p><p>قبل: {entry.previous_values?.package_name??'لم تُحدَّد'} — {entitlementSummary(entry.previous_values)}</p><p>بعد: {entry.next_values.package_name??'لم تُحدَّد'} — {entitlementSummary(entry.next_values)}</p></div>)}</details>
  </>}
 </section>;
}
function EntitlementForm({companyId,initial,onSaved}:{companyId:string;initial:SubscriptionEntitlement|null;onSaved:()=>Promise<void>}) {
 const [draft,setDraft]=useState(()=>entitlementDraft(initial)),[revision,setRevision]=useState(initial?.revision??0),[pending,setPending]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const [complete,setComplete]=useState(entitlementComplete(initial));
 const save=async()=>{if(pending)return;setPending(true);setError('');setSaved(false);try{const parsed=parseEntitlementDraft(draft);const result=await supabase.rpc('set_company_entitlements',{p_company_id:companyId,p_package_name:parsed.package_name,p_max_file_mib:parsed.max_file_mib,p_storage_gib:parsed.storage_gib,p_annual_transfer_gib:parsed.annual_transfer_gib,p_max_users:parsed.max_users,p_expected_revision:revision});if(result.error)throw result.error;const row=entitlementSchema.parse(result.data);setRevision(row.revision);setDraft(entitlementDraft(row));setComplete(entitlementComplete(row));setSaved(true);await onSaved();}catch(caught){setError(getUserErrorMessage(caught,'تعذّر حفظ الحدود. احتفظ بمدخلاتك وتحقق من الاتصال قبل إعادة المحاولة.'));}finally{setPending(false);}};
 return <div className="space-y-3">
  <p className="text-xs font-semibold">حالة البيانات المحفوظة: {complete?'مكتملة':'تحتاج استكمالاً'}</p>
  <fieldset disabled={pending} className="min-w-0 space-y-3"><div><FieldLabel>اسم الباقة</FieldLabel><TextInput value={draft.package_name} maxLength={100} onChange={event=>{setDraft({...draft,package_name:event.target.value});setSaved(false);setError('');}} placeholder="لم تُحدَّد"/></div>
   {limitFields.map(([key,label])=><div key={key}><FieldLabel>{label}</FieldLabel><TextInput type="number" min={1} max={2147483647} step={1} inputMode="numeric" value={draft[key]} onChange={event=>{setDraft({...draft,[key]:event.target.value});setSaved(false);setError('');}} placeholder="لم تُحدَّد"/></div>)}
  </fieldset>
  <p className="text-xs text-ink-soft">تُوثّق هذه الحقول نطاق الباقة؛ لا ترفع سعة الخدمة أو تخصم الاستهلاك تلقائياً. الرفع التشغيلي الحالي حتى 50 ميجابايت للملف. يجب تجهيز السعات الأكبر قبل الالتزام بتوفيرها.</p>
  {error&&<div role="alert"><ErrorText>{error}</ErrorText></div>}{saved&&<p role="status" className="text-xs text-green-700">✓ تم حفظ حدود الباقة على الخادم.</p>}
  <PrimaryButton disabled={pending} onClick={()=>void save()}>{pending?'جارٍ حفظ الحدود...':'حفظ حدود الباقة'}</PrimaryButton>
 </div>;
}
