// Supabase Edge Function — إرسال بريد دعوة الانضمام فعلياً (بدل نسخ الرابط يدوياً فقط)
// يتطلب سرّاً باسم RESEND_API_KEY (Edge Functions → Secrets بلوحة تحكم Supabase)
// مأخوذ من حساب Resend (resend.com) — الخطة المجانية كافية للبداية.
//
// إصلاح أمني: كانت الدالة سابقاً تثق بكل الحقول (البريد، الرابط، اسم الشركة...) من
// جسم الطلب مباشرة بدون أي تحقق — أي مستخدم مسجّل (أو حتى بدون تسجيل، لأن CORS كان
// "*") يقدر يرسل بريداً بهوية BARAQ CONTROL لأي عنوان بأي محتوى/رابط يختاره. الآن
// الدالة تستقبل فقط رمز الدعوة (token)، وتقرأ كل البيانات (البريد، الشركة، القسم،
// المُرسِل) من قاعدة البيانات نفسها عبر مفتاح service role — فلا شيء قابل للتحكم من
// الطالب سوى أي دعوة (token) صالحة يملكها أصلاً.

import { createClient } from "npm:@supabase/supabase-js@2";

const APP_ORIGIN = Deno.env.get("APP_BASE_URL") ?? "https://baraq-controll1.pages.dev";

const corsHeaders = {
  "Access-Control-Allow-Origin": APP_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROLE_LABEL: Record<string, string> = { member: "عضو", head: "رئيس قسم" };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "رمز الدعوة مطلوب" }), {
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("invites")
      .select("email, role, status, expires_at, invited_by, companies(name), departments(name)")
      .eq("token", token)
      .single();

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: "الدعوة غير موجودة" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (invite.status !== "pending" || new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "هذه الدعوة لم تعد صالحة" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: inviterProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", invite.invited_by)
      .single();

    const companyName = escapeHtml((invite.companies as { name?: string } | null)?.name ?? "الشركة");
    const departmentName = escapeHtml((invite.departments as { name?: string } | null)?.name ?? "");
    const inviterName = escapeHtml(inviterProfile?.full_name ?? "مسؤول");
    const roleLabel = ROLE_LABEL[invite.role] ?? "عضو";
    const joinLink = `${APP_ORIGIN}/join/${token}`;

    const html = `
    <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1A2332;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-weight: bold; letter-spacing: 2px; color: #2E6FE8;">BARAQ CONTROL</span>
      </div>
      <h2 style="font-size: 18px; margin-bottom: 8px;">دعوة للانضمام إلى ${companyName}</h2>
      <p style="font-size: 14px; color: #5B6472; line-height: 1.7;">
        دعاك <strong>${inviterName}</strong> للانضمام إلى قسم <strong>${departmentName}</strong>
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
        to: [invite.email],
        subject: `دعوة للانضمام إلى ${companyName} على BARAQ CONTROL`,
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
