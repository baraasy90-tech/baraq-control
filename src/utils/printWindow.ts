/** يفتح نافذة طباعة من HTML جاهز. إن كانت الصفحة تستخدم ترويسة/تذييل شركة (شعار
 * أعلى الصفحة وتذييل أسفلها) ينتظر تحميل الصورتين فعلياً ثم يضبط هامش المحتوى
 * ديناميكياً على ارتفاعهما الحقيقي المعروض — بدل الاعتماد فقط على الهامش المُدخل
 * يدوياً بإعدادات الشركة، الذي قد يكون أصغر من الصورة الفعلية فيتراكب النص معها. */
export function openPrintWindow(html: string): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

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
