import {ArrowUpLeft,MapPin,UserRound} from 'lucide-react';
import {DonutChart} from '@/components/DonutChart';
import type {Project} from '@/types/domain';

const statuses={active:'مشروع قائم',preparing:'تحت التجهيز',completed:'مشروع منتهٍ'};
export function ProjectWorkspaceHeader({project,percent,completed,total,loading,onSchedule,onBudget,onBack}:{project:Project;percent:number|null;completed:number;total:number;loading:boolean;onSchedule:()=>void;onBudget:()=>void;onBack:()=>void}){
 return <section aria-label="ملخص المشروع" className="relative overflow-hidden rounded-3xl bg-navy text-white p-5 sm:p-8 mb-6">
  <div aria-hidden="true" className="absolute -top-28 -left-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none"/>
  <div className="relative flex items-center justify-between gap-3 mb-7"><span className="text-[10px] sm:text-xs font-mono tracking-[.18em] text-white/60" dir="ltr">BARAQ CONTROL</span><button type="button" onClick={onBack} className="text-xs text-white/80 hover:text-white border border-white/20 rounded-lg px-3 py-2 cursor-pointer">رجوع للمشاريع</button></div>
  <div className="relative grid gap-6 sm:grid-cols-[minmax(0,1fr)_220px] items-center">
   <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 mb-3"><span className="text-xs text-white/60">مساحة المشروع</span><span className="text-[11px] rounded-full border border-white/20 bg-white/10 px-2.5 py-1">{statuses[project.status]}</span></div>
    <h1 className="text-2xl sm:text-3xl font-bold leading-relaxed break-words mb-4">{project.name}</h1>
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs sm:text-sm text-white/75 mb-6"><span className="inline-flex items-center gap-1.5"><UserRound size={15}/>{project.managerName||'مدير المشروع غير محدد'}</span>{project.location&&<span className="inline-flex items-center gap-1.5 min-w-0"><MapPin size={15}/><span className="break-words">{project.location}</span></span>}{project.unitsCount&&<span>{project.unitsCount} وحدة</span>}</div>
    <div className="flex flex-wrap gap-2"><button type="button" onClick={onSchedule} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white px-5 py-3 text-sm font-semibold hover:brightness-110 transition cursor-pointer">{total?'فتح الجدول الزمني':'ابدأ بإعداد الجدول'}<ArrowUpLeft size={17}/></button><button type="button" onClick={onBudget} className="rounded-xl border border-white/25 text-white px-4 py-3 text-sm font-semibold hover:bg-white/10 transition cursor-pointer">عرض الميزانية</button></div>
   </div>
   <div className="rounded-2xl bg-white text-ink p-5 flex items-center gap-4 sm:flex-col sm:text-center shadow-sm min-w-0">
    {loading?<div role="status" className="text-xs text-ink-soft py-5">جارٍ تحميل مؤشرات المشروع...</div>:<>{percent===null?<div className="w-[88px] h-[88px] rounded-full border-4 border-line flex items-center justify-center text-2xl text-ink-soft" aria-label="لم يُجهّز مؤشر المراحل بعد">—</div>:<DonutChart percent={percent} size={88} color={project.themeColor}/>}<div><p className="text-sm font-bold mb-1">إنجاز مراحل الجدول</p><p className="text-xs text-ink-soft leading-relaxed">{percent===null?'أضف المراحل لعرض المؤشر.':`${completed} من ${total} مرحلة مكتملة`}</p>{percent!==null&&<p className="text-[10px] text-ink-soft mt-2 leading-relaxed">مؤشر موزون بمدد المراحل المكتملة</p>}</div></>}
   </div>
  </div>
 </section>;
}
