import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface AdminUser {
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: AppRole;
  can_manage_users: boolean;
  created_at: string;
}

export function useAdminUsers() {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ["admin-users", currentCompanyId],
    queryFn: async (): Promise<AdminUser[]> => {
      if (!currentCompanyId) return [];

      // Get members of current company
      const { data: members, error: membersError } = await supabase
        .from("user_companies" as any)
        .select("user_id, role")
        .eq("company_id", currentCompanyId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      const userIds = (members as any[]).map((m: any) => m.user_id);
      const roleMap = new Map<string, AppRole>();
      (members as any[]).forEach((m: any) => roleMap.set(m.user_id, m.role));

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, email, avatar_url, created_at, can_manage_users")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      return (profiles || []).map((p) => ({
        user_id: p.user_id,
        name: p.name,
        email: p.email,
        avatar_url: p.avatar_url,
        role: roleMap.get(p.user_id) || "user",
        can_manage_users: p.can_manage_users ?? false,
        created_at: p.created_at,
      }));
    },
    enabled: !!currentCompanyId,
  });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, name, email }: { userId: string; name: string; email: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ name, email })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      if (!currentCompanyId) throw new Error("No company selected");

      // Update role in user_companies for current company
      const { error } = await supabase
        .from("user_companies" as any)
        .update({ role: newRole })
        .eq("user_id", userId)
        .eq("company_id", currentCompanyId);

      if (error) throw error;

      // Also update user_roles for backward compat
      await supabase.from("user_roles").update({ role: newRole }).eq("user_id", userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ userId, newPassword }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to reset password");
      }

      return res.json();
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete user");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      name,
      role,
    }: {
      email: string;
      password: string;
      name: string;
      role: AppRole;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email, password, name, role, company_id: currentCompanyId }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create user");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useToggleManageUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, canManageUsers }: { userId: string; canManageUsers: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ can_manage_users: canManageUsers } as any)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}
