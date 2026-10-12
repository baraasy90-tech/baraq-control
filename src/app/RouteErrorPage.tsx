import { isRouteErrorResponse, useRouteError } from "react-router-dom";

export function RouteErrorPage() {
  const error = useRouteError();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center p-6">
      <section role="alert" className="max-w-md rounded-2xl border border-line bg-panel p-6 text-center">
        <h1 className="text-xl font-bold text-ink">{missing ? "الصفحة غير موجودة" : "تعذّر عرض الصفحة"}</h1>
        <p className="mt-3 text-ink-soft">{missing ? "تحقق من الرابط أو عد إلى الصفحة الرئيسية." : "أعد تحميل الصفحة للمحاولة مرة أخرى. إذا استمر الخطأ، تواصل مع مسؤول التطبيق."}</p>
        <div className="mt-5 flex justify-center gap-3">
          <button type="button" className="rounded-lg bg-ink px-4 py-2 text-white" onClick={() => window.location.reload()}>إعادة تحميل</button>
          <a className="rounded-lg border border-line px-4 py-2 text-ink" href="/">الرئيسية</a>
        </div>
      </section>
    </main>
  );
}
