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

    // Check global role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    const isGlobalAdmin = roleData?.role === "admin";
    const isChiefAdmin = roleData?.role === "chief_admin";

    if (!isGlobalAdmin && !isChiefAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: недостаточно прав" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chief admin can only have one company
    if (isChiefAdmin) {
      const { data: existingCompanies } = await adminClient
        .from("user_companies")
        .select("id")
        .eq("user_id", caller.id);

      if (existingCompanies && existingCompanies.length > 0) {
        return new Response(JSON.stringify({ error: "Главный администратор может управлять только одной компанией" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { name } = await req.json();
    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ error: "Название компании обязательно" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create company
    const { data: company, error: companyError } = await adminClient
      .from("companies")
      .insert({ name: name.trim() })
      .select()
      .single();

    if (companyError) {
      console.error("create-company error:", companyError);
      return new Response(JSON.stringify({ error: "Не удалось создать компанию" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Link creator as admin of the new company
    const { error: linkError } = await adminClient
      .from("user_companies")
      .insert({
        user_id: caller.id,
        company_id: company.id,
        role: "admin",
      });

    if (linkError) {
      console.error("link user to company error:", linkError);
    }

    // Create default guides for the new company
    const defaultGuides = [
      {
        company_id: company.id,
        guide_key: "general",
        title: "Общая инструкция",
        sort_order: 0,
        sections: [
          { title: "Начало работы", content: ["Для входа в систему используйте логин и пароль, предоставленные администратором."] },
          { title: "Создание заявки", content: ["Нажмите кнопку «Новая заявка» в боковом меню или на главной странице."] },
          { title: "Отслеживание заявок", content: ["Все ваши заявки доступны в разделе «Мои заявки»."] },
        ],
      },
      {
        company_id: company.id,
        guide_key: "executor",
        title: "Инструкция для исполнителя",
        sort_order: 1,
        sections: [
          { title: "Панель исполнителя", content: ["Раздел «Исполнитель» отображает заявки, назначенные на вас."] },
        ],
      },
      {
        company_id: company.id,
        guide_key: "admin",
        title: "Инструкция для администратора",
        sort_order: 2,
        sections: [
          { title: "Управление пользователями", content: ["В разделе «Администрирование → Пользователи» вы можете создавать новых пользователей."] },
          { title: "Управление категориями", content: ["В разделе «Администрирование → Категории» создавайте и редактируйте категории заявок."] },
        ],
      },
    ];

    const { error: guidesError } = await adminClient
      .from("guides")
      .insert(defaultGuides);

    if (guidesError) {
      console.error("create default guides error:", guidesError);
    }

    return new Response(JSON.stringify({ company }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-company error:", error);
    return new Response(JSON.stringify({ error: "Произошла ошибка. Попробуйте позже." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
