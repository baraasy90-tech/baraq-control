// Supabase Edge Function — مساعد الدعم الذكي داخل التطبيق
// يستقبل رسالة المستخدم + تاريخ المحادثة، يستدعي Claude API، يرجّع الرد.
// يتطلب سرّاً باسم ANTHROPIC_API_KEY (Edge Functions → Secrets بلوحة تحكم Supabase).

import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";

const SYSTEM_PROMPT = `أنت مساعد الدعم الفني لمنصة "BARAQ CONTROL" — منصة إدارة مشاريع إنشائية باللغة العربية.
مهمتك مساعدة المستخدمين (مدراء مشاريع، موظفين) على فهم واستخدام التطبيق، وحل المشاكل التقنية البسيطة، والإجابة عن أسئلة "كيف أسوي كذا".

ميزات التطبيق الرئيسية:
- لوحة مشاريع: إنشاء/تعديل مشاريع، بحالات (تحت التجهيز/قائم/منتهٍ) بنظام سحب وإفلات
- إدارة المراحل: شجرة مراحل هرمية بجدولة تلقائية عبر تبعيات زمنية، واستيراد من Excel أو Primavera (XER/XML)
- الجدول الزمني: عرض Gantt بصري لكل مراحل المشروع
- الاستلام: اعتماد كل مرحلة (استلامات فرعية) بصور وتوقيع، بقرار (معتمد/معتمد بملاحظات/مرفوض)، مع طباعة تقرير PDF
- الميزانية: مبلغ مقطوع أو جدول كميات (BOQ)، مع دفعات فعلية وتجميع تلقائي
- المستندات: مجلدات وملفات لكل مشروع
- المهام: نظام مهام عام عبر كل المشاريع، بأولوية وتاريخ استحقاق وإسناد لعضو
- نظرة عامة على الأقسام: إحصائيات وميزانية ومهام متأخرة عبر كل المشاريع
- الفريق: تعيين مدير مشروع أو أعضاء لكل مشروع
- صلاحيات هرمية: مالك الشركة ← الإدارة التنفيذية ← رئيس القسم ← مدير المشروع ← عضو الفريق — كل مستوى يشوف بس بيانات نطاقه

أجب دائماً بالعربية، بإيجاز ووضوح، وبأسلوب ودود ومباشر. لو السؤال خارج نطاق التطبيق تماماً، وضّح بلطف إنك مختص بدعم هذا التطبيق فقط.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "الرسالة مطلوبة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "لم يتم إعداد مفتاح API بعد" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = new Anthropic({ apiKey });

    const messages = [
      ...(Array.isArray(history) ? history : []).slice(-10),
      { role: "user" as const, content: message },
    ];

    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const reply = textBlock && textBlock.type === "text" ? textBlock.text : "تعذّر الحصول على رد";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "حدث خطأ" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
