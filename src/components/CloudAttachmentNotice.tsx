export function CloudAttachmentNotice({kind}:{kind:'contract'|'receiving'}){
 const contract=kind==='contract';
 return <aside role="note" aria-label={contract?'وجهة حفظ مرفق العقد':'وجهة حفظ صور الاستلام'} className="rounded-lg border border-line bg-bg p-3 text-xs text-ink-soft leading-relaxed">
  <p className="font-semibold text-ink mb-1">وجهة هذه المرفقات: سحابة المشروع</p>
  <p>{contract?'ملف PDF يُرفع عند حفظ العقد، حتى 50 ميجابايت.':'الصور الجديدة تُرفع عند إرسال التقديم، حتى 10 ميجابايت للصورة.'} تتاح المرفقات حسب صلاحيات فريق المشروع. اختيار الجهاز لحفظ مستندات المشروع لا يغيّر وجهة هذه المرفقات.</p>
  <p className="mt-1">{contract?'بعد الحفظ، يمكنك إنشاء نسخة موثّقة على الجهاز من تفاصيل العقد.':'بعد الحفظ، يمكنك نسخ الصور إلى الجهاز من معاينة التقديم.'}</p>
 </aside>;
}
