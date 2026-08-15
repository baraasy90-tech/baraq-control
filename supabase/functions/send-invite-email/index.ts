// Supabase Edge Function — إرسال بريد دعوة الانضمام فعلياً (بدل نسخ الرابط يدوياً فقط)
// يتطلب سرّاً باسم RESEND_API_KEY (Edge Functions → Secrets بلوحة تحكم Supabase)
// مأخوذ من حساب Resend (resend.com) — الخطة المجانية كافية للبداية.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLE_LABEL: Record<string, string> = { member: "عضو", head: "رئيس قسم" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, companyName, inviterName, role, joinLink, departmentName } = await req.json();

    if (!to || !joinLink) {
      return new Response(JSON.stringify({ error: "البريد ورابط الدعوة مطلوبان" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "لم يتم إعداد مفتاح البريد بعد" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roleLabel = ROLE_LABEL[role] ?? "عضو";

    const html = `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1A2332;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-weight: bold; letter-spacing: 2px; color: #2E6FE8;">BARAQ CONTROL</span>
      </div>
      <h2 style="font-size: 18px; margin-bottom: 8px;">دعوة للانضمام إلى ${companyName ?? "الشركة"}</h2>
      <p style="font-size: 14px; color: #5B6472; line-height: 1.7;">
        دعاك <strong>${inviterName ?? "مسؤول"}</strong> للانضمام إلى قسم <strong>${departmentName ?? ""}</strong>
        بصفة <strong>${roleLabel}</strong> على منصة BARAQ CONTROL لإدارة المشاريع.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${joinLink}" style="background: #171B26; color: white; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; display: inline-block;">
          قبول الدعوة والانضمام
        </a>
      </div>
      <p style="font-size: 12px; color: #8A93A3;">إذا لم يعمل الزر، انسخ هذا الرابط والصقه في متصفحك:<br />${joinLink}</p>
      <p style="font-size: 12px; color: #8A93A3; margin-top: 16px;">هذه الدعوة صالحة لمدة 14 يوماً.</p>
    </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BARAQ CONTROL <onboarding@resend.dev>",
        to: [to],
        subject: `دعوة للانضمام إلى ${companyName ?? "الشركة"} على BARAQ CONTROL`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(JSON.stringify({ error: `تعذّر إرسال البريد: ${errText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "حدث خطأ" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
