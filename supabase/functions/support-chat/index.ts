// Supabase Edge Function — مساعد الدعم الذكي داخل التطبيق
// يستقبل رسالة المستخدم + تاريخ المحادثة، يستدعي Claude API، يرجّع الرد.
// يتطلب سرّاً باسم ANTHROPIC_API_KEY (Edge Functions → Secrets بلوحة تحكم Supabase).

import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";
import {createClient} from "npm:@supabase/supabase-js@2.112.0";
import {readBoundedJson,supportMessages} from "../_shared/request-policy.ts";

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
  "Access-Control-Allow-Origin": Deno.env.get("APP_BASE_URL")??"https://baraq-controll1.pages.dev",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if(req.method!=="POST")return new Response(null,{status:405,headers:{...corsHeaders,Allow:"POST, OPTIONS"}});

  try {
    const respond=(status:number,error:string)=>new Response(JSON.stringify({error}),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
    const authorization=req.headers.get("Authorization")??"";
    if(!authorization.startsWith("Bearer "))return respond(401,"يلزم تسجيل الدخول");
    const caller=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
    const {data:{user},error:authError}=await caller.auth.getUser();
    if(authError||!user||user.is_anonymous)return respond(401,"يلزم حساب مسجل صالح");
    let messages:{role:"user"|"assistant";content:string}[];
    try{messages=supportMessages(await readBoundedJson(req));}catch(error){return respond(400,error instanceof Error?error.message:"طلب غير صالح");}
    const {data:profile,error:profileError}=await caller.from("profiles").select("company_id").eq("id",user.id).maybeSingle();
    if(profileError||!profile?.company_id)return respond(403,"يلزم الانضمام إلى حساب مشروع لاستخدام الدعم");
    const {data:company,error:companyError}=await caller.from("companies").select("id").eq("id",profile.company_id).maybeSingle();
    if(companyError||!company)return respond(403,"لا تملك صلاحية استخدام الدعم لهذا الحساب");

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    // Preserve the existing model unless the operator explicitly configures another.
    const model = Deno.env.get("ANTHROPIC_MODEL")?.trim() || "claude-opus-5";
    if (!apiKey) return respond(503,"خدمة الدعم غير مهيأة بعد؛ تواصل مع مدير الحساب");

    const client = new Anthropic({ apiKey, timeout: 20_000, maxRetries: 0 });
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
    const {data:withinLimit,error:limitError}=await admin.rpc("consume_edge_request",{p_actor_id:user.id,p_operation:"support-chat"});
    if(limitError)return respond(503,"تعذّر التحقق من حد الاستخدام؛ حاول لاحقاً");
    if(withinLimit!==true)return respond(429,"بلغت حد رسائل الدعم؛ حاول لاحقاً");

    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const reply = textBlock && textBlock.type === "text" ? textBlock.text : "تعذّر الحصول على رد";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "تعذّر الاتصال بخدمة الدعم؛ حاول لاحقاً" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
