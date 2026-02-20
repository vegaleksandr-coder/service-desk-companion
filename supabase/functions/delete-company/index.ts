import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!roleData || roleData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { id } = await req.json();
    if (!id) {
      return new Response(JSON.stringify({ error: "ID компании обязателен" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete related data in order
    // 1. Get all tickets for this company
    const { data: tickets } = await adminClient
      .from("tickets")
      .select("id")
      .eq("company_id", id);

    const ticketIds = (tickets || []).map((t: any) => t.id);

    if (ticketIds.length > 0) {
      // Delete attachments, comments, history for those tickets
      await adminClient.from("attachments").delete().in("ticket_id", ticketIds);
      await adminClient.from("comments").delete().in("ticket_id", ticketIds);
      await adminClient.from("ticket_history").delete().in("ticket_id", ticketIds);
      await adminClient.from("notifications").delete().in("ticket_id", ticketIds);
      await adminClient.from("tickets").delete().eq("company_id", id);
    }

    // Delete notifications without ticket_id for company users
    const { data: companyUsers } = await adminClient
      .from("user_companies")
      .select("user_id")
      .eq("company_id", id);
    const userIds = (companyUsers || []).map((u: any) => u.user_id);

    // 2. Get categories and delete category_members
    const { data: categories } = await adminClient
      .from("categories")
      .select("id")
      .eq("company_id", id);
    const catIds = (categories || []).map((c: any) => c.id);

    if (catIds.length > 0) {
      await adminClient.from("category_members").delete().in("category_id", catIds);
      await adminClient.from("categories").delete().eq("company_id", id);
    }

    // 3. Delete FAQs, guides
    await adminClient.from("faqs").delete().eq("company_id", id);
    await adminClient.from("guides").delete().eq("company_id", id);

    // 4. Delete user_companies
    await adminClient.from("user_companies").delete().eq("company_id", id);

    // 5. Delete company
    const { error } = await adminClient.from("companies").delete().eq("id", id);

    if (error) {
      console.error("delete company error:", error);
      return new Response(JSON.stringify({ error: "Не удалось удалить компанию" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("delete-company error:", error);
    return new Response(JSON.stringify({ error: "Произошла ошибка" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
