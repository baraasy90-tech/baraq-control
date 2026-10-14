import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { Modal, FieldLabel, TextInput, PrimaryButton, SecondaryButton, ErrorText } from "@/components/ui";
import { getUserErrorMessage } from "@/utils/errors";
interface DirectoryUser {
  id:string;full_name:string;email:string|null;created_at:string;last_sign_in_at:string|null;
  email_confirmed:boolean;sign_in_blocked:boolean;is_company_owner:boolean;
  departments:{name:string;role:string}[];
}
interface DirectoryPage {total:number;offset:number;page_size:number;users:DirectoryUser[]}
export function PlatformUserDirectory({companyId,companyName,onClose}:{companyId:string;companyName:string;onClose:()=>void}) {
  const {user}=useAuth();const [search,setSearch]=useState("");const [applied,setApplied]=useState("");const [offset,setOffset]=useState(0);
  const query=useQuery({queryKey:["platform-user-directory",user?.id,companyId,offset,applied],queryFn:async()=>{
    const {data,error}=await supabase.rpc("list_platform_company_users",{p_company_id:companyId,p_offset:offset,p_search:applied});
    if(error)throw error;
    if(!data||typeof data!=="object"||Array.isArray(data)||!Array.isArray(data.users)||typeof data.total!=="number")throw new Error("تعذّر قراءة دليل المستخدمين");
    return data as unknown as DirectoryPage;
  }});
  const page=query.data;
  return <Modal title={`مستخدمو ${companyName}`} onClose={onClose}>
    <p className="text-xs text-ink-soft mb-3">حسابات تسجيل الدخول لهذا العميل. تاريخ الدخول يوضح آخر تسجيل دخول، وليس الوقت الفعلي للعمل.</p>
    <form className="space-y-2 mb-4" onSubmit={event=>{event.preventDefault();setOffset(0);setApplied(search.trim());}}>
      <FieldLabel>البحث باسم المستخدم أو بريده</FieldLabel>
      <TextInput value={search} maxLength={200} onChange={event=>setSearch(event.target.value)} />
      <PrimaryButton type="submit" disabled={query.isFetching}>بحث</PrimaryButton>
    </form>
    {query.isPending&&<p role="status">جارٍ تحميل المستخدمين...</p>}
    {query.isError&&<><ErrorText>{getUserErrorMessage(query.error,"تعذّر تحميل المستخدمين")}</ErrorText><SecondaryButton onClick={()=>void query.refetch()}>إعادة المحاولة</SecondaryButton></>}
    {page&&<>
      <p className="text-xs mb-3">{page.total} حساب {applied?"مطابق للبحث":"مسجل"}</p>
      {page.users.length===0&&<p className="text-sm">لا توجد حسابات مطابقة.</p>}
      <div className="space-y-3 max-h-[50vh] overflow-y-auto">{page.users.map(account=><div key={account.id} className="border border-line rounded-lg p-3 text-xs space-y-1">
        <p className="font-bold break-words">{account.full_name||"حساب دون اسم"}{account.is_company_owner&&" · مالك حساب العميل"}</p>
        <p dir="ltr" className="break-all text-right">{account.email||"لا يوجد بريد مسجل"}</p>
        <p>{account.sign_in_blocked?"تسجيل الدخول موقوف مؤقتاً":account.email_confirmed?"البريد مؤكد":"البريد غير مؤكد"}</p>
        <p>آخر تسجيل دخول: {account.last_sign_in_at?new Date(account.last_sign_in_at).toLocaleString("ar-SA"):"لم يسجل الدخول بعد"}</p>
        <p>الأقسام: {account.departments.length?account.departments.map(d=>`${d.name} (${d.role==="head"?"رئيس قسم":"عضو"})`).join("، "):"دون عضوية قسم"}</p>
      </div>)}</div>
      <div className="flex items-center justify-between gap-2 mt-4">
        <SecondaryButton disabled={offset===0||query.isFetching} onClick={()=>setOffset(value=>Math.max(0,value-50))}>السابق</SecondaryButton>
        <span className="text-xs">صفحة {Math.floor(offset/50)+1}</span>
        <SecondaryButton disabled={offset+50>=page.total||query.isFetching} onClick={()=>setOffset(value=>value+50)}>التالي</SecondaryButton>
      </div>
    </>}
  </Modal>;
}
