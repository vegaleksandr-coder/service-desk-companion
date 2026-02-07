import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface AdminUser {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: AppRole;
  created_at: string;
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<AdminUser[]> => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, email, avatar_url, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const roleMap = new Map<string, AppRole>();
      for (const r of roles || []) {
        roleMap.set(r.user_id, r.role);
      }

      return (profiles || []).map((p) => ({
        user_id: p.user_id,
        name: p.name,
        email: p.email,
        avatar_url: p.avatar_url,
        role: roleMap.get(p.user_id) || "user",
        created_at: p.created_at,
      }));
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}
