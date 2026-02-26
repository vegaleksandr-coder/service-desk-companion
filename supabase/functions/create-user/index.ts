import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
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

    // Check caller permissions: admin in any company, chief_admin, or can_manage_users
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    const isGlobalAdminOrChief = callerRole?.role === "admin" || callerRole?.role === "chief_admin";

    const { data: callerCompanies } = await adminClient
      .from("user_companies")
      .select("company_id, role")
      .eq("user_id", caller.id);

    const isAdminInAnyCompany = callerCompanies?.some((c: any) => c.role === "admin");

    let canManageUsers = false;
    if (!isAdminInAnyCompany && !isGlobalAdminOrChief) {
      const { data: profileData } = await adminClient
        .from("profiles")
        .select("can_manage_users")
        .eq("user_id", caller.id)
        .single();
      canManageUsers = profileData?.can_manage_users === true;
    }

    if (!isAdminInAnyCompany && !canManageUsers && !isGlobalAdminOrChief) {
      return new Response(JSON.stringify({ error: "Forbidden: insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, name, role, company_id } = await req.json();

    // Check if caller is admin of the target company
    const isAdminOfTargetCompany = company_id && callerCompanies?.some(
      (c: any) => c.company_id === company_id && c.role === "admin"
    );

    // Non-admin callers can only create user/executor roles
    if (!isAdminOfTargetCompany && role === "admin") {
      return new Response(JSON.stringify({ error: "Only company admins can create admin users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: "Пароль должен содержать минимум 8 символов" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return new Response(JSON.stringify({ error: "Пароль должен содержать заглавные, строчные буквы и цифры" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user with admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    let userId: string | undefined;

    if (createError) {
      // If user already exists, try to find them and add to company
      if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
        const { data: existingUsers } = await adminClient.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u: any) => u.email === email);
        
        if (!existingUser) {
          return new Response(JSON.stringify({ error: "Пользователь существует, но не найден" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        userId = existingUser.id;

        // Check if already in this company
        if (company_id) {
          const { data: existing } = await adminClient
            .from("user_companies")
            .select("id")
            .eq("user_id", userId)
            .eq("company_id", company_id)
            .maybeSingle();

          if (existing) {
            return new Response(JSON.stringify({ error: "Пользователь уже состоит в этой компании" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      } else {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      userId = newUser.user?.id;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Не удалось определить пользователя" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update global role if not default 'user' (only for new users)
    if (!createError && role && role !== "user") {
      await adminClient
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId);
    }

    // Add user to company if company_id provided
    if (company_id) {
      await adminClient
        .from("user_companies")
        .insert({
          user_id: userId,
          company_id: company_id,
          role: role || "user",
        });
    }

    return new Response(
      JSON.stringify({ user: { id: userId, email } }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("create-user error:", error);
    const msg = error?.message?.includes("already registered")
      ? "Пользователь с таким email уже существует"
      : "Произошла ошибка. Попробуйте позже.";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
