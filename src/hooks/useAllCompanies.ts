import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface CompanyUser {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: AppRole;
  can_manage_users: boolean;
}

export interface CompanyWithUsers {
  id: string;
  name: string;
  created_at: string;
  users: CompanyUser[];
}

export function useAllCompanies() {
  const { isGlobalAdmin } = useAuth();

  return useQuery({
    queryKey: ["all-companies-with-users"],
    queryFn: async (): Promise<CompanyWithUsers[]> => {
      // Fetch all companies
      const { data: companies, error: compError } = await supabase
        .from("companies")
        .select("*")
        .order("name");

      if (compError) throw compError;
      if (!companies?.length) return [];

      // Fetch all user_companies memberships
      const { data: memberships, error: memError } = await supabase
        .from("user_companies" as any)
        .select("user_id, company_id, role");

      if (memError) throw memError;

      // Fetch all profiles
      const userIds = [...new Set((memberships as any[])?.map((m: any) => m.user_id) || [])];
      
      if (userIds.length === 0) {
        return companies.map((c) => ({ ...c, users: [] }));
      }

      const { data: profiles, error: profError } = await supabase
        .from("profiles")
        .select("user_id, name, email, avatar_url, can_manage_users");

      if (profError) throw profError;

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      // Group users by company
      const companyUsersMap = new Map<string, CompanyUser[]>();
      for (const m of (memberships as any[]) || []) {
        const profile = profileMap.get(m.user_id);
        if (!profile) continue;
        const list = companyUsersMap.get(m.company_id) || [];
        list.push({
          user_id: m.user_id,
          name: profile.name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          role: m.role as AppRole,
          can_manage_users: profile.can_manage_users ?? false,
        });
        companyUsersMap.set(m.company_id, list);
      }

      return companies.map((c) => ({
        id: c.id,
        name: c.name,
        created_at: c.created_at,
        users: companyUsersMap.get(c.id) || [],
      }));
    },
    enabled: isGlobalAdmin,
  });
}
