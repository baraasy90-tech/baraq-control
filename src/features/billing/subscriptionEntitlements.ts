import {z} from 'zod';
const limit=z.number().int().min(1).max(2147483647).nullable();
export const entitlementSchema=z.object({company_id:z.uuid(),package_name:z.string().max(100).nullable(),max_file_mib:limit,storage_gib:limit,annual_transfer_gib:limit,max_users:limit,revision:z.number().int().positive(),updated_at:z.string(),updated_by:z.uuid()});
export const entitlementResponseSchema=z.object({current:entitlementSchema.nullable(),history:z.array(z.object({id:z.number(),changed_at:z.string(),previous_values:entitlementSchema.nullable(),next_values:entitlementSchema}))});
export type SubscriptionEntitlement=z.infer<typeof entitlementSchema>;
export const limitFields=[['max_file_mib','أقصى حجم للملف (ميجابايت)'],['storage_gib','مساحة التخزين الإجمالية (جيجابايت)'],['annual_transfer_gib','حصة التنزيل ونقل البيانات لكل سنة اشتراك (جيجابايت)'],['max_users','عدد المستخدمين المشمولين']] as const;
export type EntitlementDraft={package_name:string;max_file_mib:string;storage_gib:string;annual_transfer_gib:string;max_users:string};
export function entitlementDraft(row:SubscriptionEntitlement|null):EntitlementDraft {return {package_name:row?.package_name??'',max_file_mib:row?.max_file_mib?.toString()??'',storage_gib:row?.storage_gib?.toString()??'',annual_transfer_gib:row?.annual_transfer_gib?.toString()??'',max_users:row?.max_users?.toString()??''};}
export function parseEntitlementDraft(draft:EntitlementDraft) {
 const values:Record<string,number|null>={};
 for(const [key] of limitFields){const raw=draft[key].trim();if(raw&&!/^\d+$/.test(raw))throw new Error('أدخل أعداداً صحيحة موجبة، أو اترك الحقل فارغاً إذا لم يُحدد.');const n=raw?Number(raw):null;if(n!==null&&(!Number.isSafeInteger(n)||n<=0||n>2147483647))throw new Error('الحدود أعداد صحيحة موجبة ضمن النطاق المتاح.');values[key]=n;}
 const name=draft.package_name.trim()||null;if(Array.from(name??'').length>100)throw new Error('اسم الباقة لا يتجاوز 100 حرف.');
 if(values.max_file_mib!==null&&values.storage_gib!==null&&values.max_file_mib>values.storage_gib*1024)throw new Error('حجم الملف لا يمكن أن يتجاوز المساحة الإجمالية.');
 return {package_name:name,max_file_mib:values.max_file_mib,storage_gib:values.storage_gib,annual_transfer_gib:values.annual_transfer_gib,max_users:values.max_users};
}
export function entitlementComplete(row:SubscriptionEntitlement|null) {return !!row?.package_name&&limitFields.every(([key])=>row[key]!==null);}
export function entitlementSummary(row:SubscriptionEntitlement|null) {return limitFields.map(([key,label])=>label+': '+(row?.[key]?.toLocaleString('ar-SA')??'لم تُحدَّد')).join(' — ');}
