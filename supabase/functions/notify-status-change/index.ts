import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const statusLabels: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  awaiting: "Ожидает ответа",
  resolved: "Решена",
  closed: "Закрыта",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(RESEND_API_KEY);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { ticket_id, old_status, new_status } = await req.json();

    if (!ticket_id || !new_status) {
      throw new Error("Missing required fields: ticket_id, new_status");
    }

    // Fetch ticket with category
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, title, category_id, created_by")
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      throw new Error("Ticket not found");
    }

    // Collect emails to notify
    const emailsToSend: { to: string; name: string }[] = [];

    // 1. Get ticket creator's email
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("user_id", ticket.created_by)
      .single();

    if (creatorProfile) {
      emailsToSend.push({ to: creatorProfile.email, name: creatorProfile.name });
    }

    // 2. Get category admins
    if (ticket.category_id) {
      const { data: categoryAdmins } = await supabase
        .from("category_members")
        .select("user_id")
        .eq("category_id", ticket.category_id)
        .eq("role", "admin");

      if (categoryAdmins && categoryAdmins.length > 0) {
        const adminUserIds = categoryAdmins.map((a) => a.user_id);
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("email, name, user_id")
          .in("user_id", adminUserIds);

        adminProfiles?.forEach((p) => {
          // Avoid duplicates (creator might also be category admin)
          if (!emailsToSend.some((e) => e.to === p.email)) {
            emailsToSend.push({ to: p.email, name: p.name });
          }
        });
      }
    }

    if (emailsToSend.length === 0) {
      return new Response(JSON.stringify({ message: "No recipients found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const oldLabel = old_status ? statusLabels[old_status] || old_status : "—";
    const newLabel = statusLabels[new_status] || new_status;
    const ticketShortId = ticket.id.slice(0, 8);

    // Send emails (in test mode all go to account owner's email)
    const results = await Promise.allSettled(
      emailsToSend.map((recipient) =>
        resend.emails.send({
          from: "Уведомления <onboarding@resend.dev>",
          to: [recipient.to],
          subject: `Заявка #${ticketShortId}: статус изменён на «${newLabel}»`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Изменение статуса заявки</h2>
              <p>Здравствуйте, ${recipient.name}!</p>
              <p>Статус заявки <strong>#${ticketShortId}</strong> «<strong>${ticket.title}</strong>» был изменён:</p>
              <table style="border-collapse: collapse; margin: 16px 0;">
                <tr>
                  <td style="padding: 8px 16px; background: #f5f5f5; border-radius: 4px;">
                    <span style="color: #888;">Было:</span> <strong>${oldLabel}</strong>
                  </td>
                  <td style="padding: 8px;">→</td>
                  <td style="padding: 8px 16px; background: #e8f5e9; border-radius: 4px;">
                    <span style="color: #888;">Стало:</span> <strong>${newLabel}</strong>
                  </td>
                </tr>
              </table>
              <p style="color: #666; font-size: 14px;">Это автоматическое уведомление.</p>
            </div>
          `,
        })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`Notifications sent: ${sent}, failed: ${failed}`);

    return new Response(
      JSON.stringify({ sent, failed, total: emailsToSend.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in notify-status-change:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
