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

    // Verify caller identity
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

    // Check global admin role in user_roles table
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!roleData || roleData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: только главный администратор может создавать компании" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
          { title: "Начало работы", content: ["Для входа в систему используйте логин и пароль, предоставленные администратором. Саморегистрация отключена — учётные записи создаются только администраторами. Если вы забыли пароль, нажмите «Забыли пароль?» на странице входа и следуйте инструкциям в письме. После входа вы попадёте на главную страницу (дашборд), где отображается сводная статистика по вашим заявкам."] },
          { title: "Создание заявки", content: ["Нажмите кнопку «Новая заявка» в боковом меню или на главной странице. Заполните заголовок и описание проблемы. Выберите категорию, приоритет и, при необходимости, укажите дедлайн. К заявке можно прикрепить файлы (скриншоты, документы) — это поможет исполнителю быстрее разобраться."] },
          { title: "Отслеживание заявок", content: ["Все ваши заявки доступны в разделе «Мои заявки». Используйте фильтры по статусу, приоритету и категории для быстрого поиска. Статусы заявок: Новая → В работе → Ожидание → Решена → Закрыта. В карточке заявки вы видите полную историю изменений и комментарии."] },
          { title: "Комментарии и общение", content: ["Вы можете оставлять комментарии к своим заявкам, чтобы уточнить детали или ответить на вопросы исполнителя. Push-уведомления сообщат вам об изменении статуса заявки (если вы разрешили уведомления в браузере)."] },
          { title: "Профиль", content: ["В разделе «Профиль» вы можете загрузить аватар."] },
        ],
      },
      {
        company_id: company.id,
        guide_key: "executor",
        title: "Инструкция для исполнителя",
        sort_order: 1,
        sections: [
          { title: "Панель исполнителя", content: ["Раздел «Исполнитель» отображает заявки, назначенные на вас, а также новые заявки в категориях, к которым вы прикреплены. Вы можете менять статус заявки: взять в работу, перевести в ожидание или отметить как решённую."] },
          { title: "Работа с заявками", content: ["Оставляйте комментарии для заявителя, чтобы уточнить детали. Также доступны внутренние комментарии, видимые только сотрудникам. Вы можете прикреплять файлы к заявкам (например, скриншоты решения). При изменении статуса заявки автору автоматически отправляется уведомление."] },
        ],
      },
      {
        company_id: company.id,
        guide_key: "admin",
        title: "Инструкция для администратора",
        sort_order: 2,
        sections: [
          { title: "Управление пользователями", content: ["В разделе «Администрирование → Пользователи» вы можете создавать новых пользователей, менять их роли (Пользователь / Исполнитель / Администратор) и сбрасывать пароли. Делегируйте право управления пользователями — отметьте «Может управлять пользователями» в профиле нужного сотрудника."] },
          { title: "Управление категориями", content: ["В разделе «Администрирование → Категории» создавайте и редактируйте категории заявок. Для каждой категории можно выбрать иконку и цвет. Назначайте участников категорий — администраторов и исполнителей категории. Исполнители категории видят все заявки в своей категории."] },
          { title: "Управление заявками", content: ["Администратор видит все заявки во всех категориях. Вы можете назначать исполнителей, менять приоритеты и статусы, а также удалять заявки при необходимости."] },
          { title: "База знаний", content: ["Создавайте и редактируйте FAQ и инструкции в разделе «База знаний». FAQ можно привязать к категориям. Инструкции разделены по ролям: общие, для исполнителей и для администраторов."] },
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
