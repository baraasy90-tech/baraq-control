/** يفتح نافذة طباعة من HTML جاهز. إن كانت الصفحة تستخدم ترويسة/تذييل شركة (شعار
 * أعلى الصفحة وتذييل أسفلها) ينتظر تحميل الصورتين فعلياً ثم يضبط هامش المحتوى
 * ديناميكياً على ارتفاعهما الحقيقي المعروض — بدل الاعتماد فقط على الهامش المُدخل
 * يدوياً بإعدادات الشركة، الذي قد يكون أصغر من الصورة الفعلية فيتراكب النص معها. */
import { getExportNotice } from "@/features/billing/subscriptionAccess";
function appendNotice(doc: Document, notice: string, printOnly = false) {
  const marker = doc.createElement("div"); marker.textContent=notice;
  marker.dataset.subscriptionNotice="true";
  marker.style.cssText=`position:fixed;inset:0;display:${printOnly?"none":"flex"};align-items:center;justify-content:center;text-align:center;color:#9b1c1c;opacity:.18;font:bold 22px sans-serif;z-index:2147483647;transform:rotate(-22deg);pointer-events:none`;
  const style=doc.createElement("style");style.textContent='@media print {[data-subscription-notice]{display:flex!important;visibility:visible!important}}';
  doc.body.append(marker,style);
  return ()=>{marker.remove();style.remove();};
}
let pendingPrintCleanup: (()=>void) | null=null;
export async function printCurrentPage(): Promise<void> {
  const notice=await getExportNotice();
  pendingPrintCleanup?.();
  const remove=notice?appendNotice(document,notice,true):()=>{};
  const cleanup=()=>{remove();window.removeEventListener("afterprint",cleanup);pendingPrintCleanup=null;};
  pendingPrintCleanup=cleanup;
  window.addEventListener("afterprint",cleanup,{once:true});
  try { window.print(); } catch(err) { cleanup();window.removeEventListener("afterprint",cleanup);throw err; }
}
export function openPrintWindow(html: string, projectId?: string): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.body.textContent="جارٍ تجهيز التقرير والتحقق من الاشتراك...";
  void getExportNotice(projectId).then(notice=>{
    if (printWindow.closed) return;
    preparePrintWindow(printWindow, html, notice);
  }).catch(()=>{if(!printWindow.closed) printWindow.document.body.textContent="تعذّر التحقق من حالة الاشتراك. أغلق هذه النافذة وحاول التصدير مجدداً.";});
}
function preparePrintWindow(printWindow: Window, html: string, notice: string | null) {
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  if (notice) {
    appendNotice(printWindow.document,notice);
  }

  let printed = false;
  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    printWindow.focus();
    printWindow.print();
  };

  const adjustForLetterhead = () => {
    const doc = printWindow.document;
    const header = doc.querySelector<HTMLImageElement>(".header-img");
    const footer = doc.querySelector<HTMLImageElement>(".footer-img");
    const content = doc.querySelector<HTMLElement>(".content");
    if (!content) return;
    if (header) {
      const h = header.getBoundingClientRect().height;
      if (h > 0) content.style.marginTop = `${h + 4}px`;
    }
    if (footer) {
      const f = footer.getBoundingClientRect().height;
      if (f > 0) content.style.marginBottom = `${f + 4}px`;
    }
  };

  const finalize = () => {
    adjustForLetterhead();
    setTimeout(triggerPrint, 150);
  };

  const images = Array.from(printWindow.document.images);
  if (images.length === 0) {
    printWindow.onload = finalize;
  } else {
    let settled = 0;
    const onEachSettle = () => {
      settled++;
      if (settled >= images.length) finalize();
    };
    images.forEach((img) => {
      if (img.complete) onEachSettle();
      else {
        img.addEventListener("load", onEachSettle, { once: true });
        img.addEventListener("error", onEachSettle, { once: true });
      }
    });
  }

  // شبكة أمان: مهما حدث، لا تبقى نافذة الطباعة معلّقة بلا طباعة.
  setTimeout(finalize, 2500);
}
