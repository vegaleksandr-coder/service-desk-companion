import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { ticket_id, old_status, new_status, event_type, comment_author_name, assignee_name } = await req.json();

    if (!ticket_id) {
      throw new Error("Missing required field: ticket_id");
    }

    // Fetch ticket with category
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id, title, category_id, created_by, assignee_id")
      .eq("id", ticket_id)
      .single();

    if (ticketError || !ticket) {
      throw new Error("Ticket not found");
    }

    // Collect user IDs to notify
    const notifyUserIds = new Set<string>();
    const emailsToSend: { to: string; name: string }[] = [];

    // Always notify ticket creator
    notifyUserIds.add(ticket.created_by);

    // Notify assignee if exists
    if (ticket.assignee_id) {
      notifyUserIds.add(ticket.assignee_id);
    }

    // Get category admins
    if (ticket.category_id) {
      const { data: categoryAdmins } = await supabase
        .from("category_members")
        .select("user_id")
        .eq("category_id", ticket.category_id)
        .eq("role", "admin");

      categoryAdmins?.forEach((a) => notifyUserIds.add(a.user_id));
    }

    // Get profiles for all users
    const userIdsArray = Array.from(notifyUserIds);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("email, name, user_id")
      .in("user_id", userIdsArray);

    profiles?.forEach((p) => {
      if (!emailsToSend.some((e) => e.to === p.email)) {
        emailsToSend.push({ to: p.email, name: p.name });
      }
    });

    const ticketShortId = ticket.id.slice(0, 8);

    // Determine notification content based on event type
    let emailSubject = "";
    let emailBody = "";
    let pushTitle = "";
    let pushBody = "";
    let pushTag = "";
    const pushUrl = `/tickets/${ticket.id}`;

    const type = event_type || "status_change";

    if (type === "status_change" && new_status) {
      const oldLabel = old_status ? statusLabels[old_status] || old_status : "—";
      const newLabel = statusLabels[new_status] || new_status;
      
      emailSubject = `Заявка #${ticketShortId}: статус изменён на «${newLabel}»`;
      emailBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Изменение статуса заявки</h2>
          <p>Здравствуйте, {{name}}!</p>
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
      `;
      pushTitle = `Заявка #${ticketShortId}`;
      pushBody = `Статус изменён: ${oldLabel} → ${newLabel}`;
      pushTag = `status-${ticket.id}`;
    } else if (type === "new_comment") {
      const authorName = comment_author_name || "Кто-то";
      emailSubject = `Заявка #${ticketShortId}: новый комментарий`;
      emailBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Новый комментарий</h2>
          <p>Здравствуйте, {{name}}!</p>
          <p>${authorName} оставил(а) комментарий к заявке <strong>#${ticketShortId}</strong> «<strong>${ticket.title}</strong>».</p>
          <p style="color: #666; font-size: 14px;">Это автоматическое уведомление.</p>
        </div>
      `;
      pushTitle = `Заявка #${ticketShortId}`;
      pushBody = `${authorName} оставил(а) комментарий`;
      pushTag = `comment-${ticket.id}`;
    } else if (type === "assignee_change") {
      const name = assignee_name || "Назначен исполнитель";
      emailSubject = `Заявка #${ticketShortId}: назначен исполнитель`;
      emailBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Назначен исполнитель</h2>
          <p>Здравствуйте, {{name}}!</p>
          <p>На заявку <strong>#${ticketShortId}</strong> «<strong>${ticket.title}</strong>» назначен исполнитель: <strong>${name}</strong>.</p>
          <p style="color: #666; font-size: 14px;">Это автоматическое уведомление.</p>
        </div>
      `;
      pushTitle = `Заявка #${ticketShortId}`;
      pushBody = `Назначен исполнитель: ${name}`;
      pushTag = `assignee-${ticket.id}`;
    }

    // Send emails
    if (emailsToSend.length > 0 && emailSubject) {
      const results = await Promise.allSettled(
        emailsToSend.map((recipient) =>
          resend.emails.send({
            from: "Уведомления <onboarding@resend.dev>",
            to: [recipient.to],
            subject: emailSubject,
            html: emailBody.replace(/\{\{name\}\}/g, recipient.name),
          })
        )
      );
      const sent = results.filter((r) => r.status === "fulfilled").length;
      console.log(`Emails sent: ${sent}/${emailsToSend.length}`);
    }

    // Send push notifications (fire and forget to send-push-notification function)
    if (pushTitle && userIdsArray.length > 0) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            user_ids: userIdsArray,
            title: pushTitle,
            body: pushBody,
            url: pushUrl,
            tag: pushTag,
          }),
        });
      } catch (pushErr) {
        console.error("Push notification error:", pushErr);
      }
    }

    return new Response(
      JSON.stringify({ sent: emailsToSend.length, push_users: userIdsArray.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
