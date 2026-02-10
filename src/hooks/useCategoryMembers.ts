import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CategoryMember {
  id: string;
  user_id: string;
  category_id: string;
  role: "admin" | "executor";
  created_at: string;
}

export function useCategoryMembers(categoryId: string | null | undefined) {
  return useQuery({
    queryKey: ["category-members", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      const { data, error } = await supabase
        .from("category_members")
        .select("*")
        .eq("category_id", categoryId);

      if (error) throw error;
      return data as CategoryMember[];
    },
    enabled: !!categoryId,
  });
}

export function useCategoryExecutors(categoryId: string | null | undefined) {
  return useQuery({
    queryKey: ["category-executors", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];

      // Get members with executor or admin role in this category
      const { data: members, error } = await supabase
        .from("category_members")
        .select("*")
        .eq("category_id", categoryId);

      if (error) throw error;
      if (!members || members.length === 0) return [];

      const userIds = members.map((m) => m.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);

      return (profiles || []).map((p) => ({
        ...p,
        category_role: members.find((m) => m.user_id === p.user_id)?.role as "admin" | "executor",
      }));
    },
    enabled: !!categoryId,
  });
}

export function useUserCategoryRole(categoryId: string | null | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-category-role", categoryId, user?.id],
    queryFn: async () => {
      if (!categoryId || !user) return null;

      const { data, error } = await supabase
        .from("category_members")
        .select("role")
        .eq("category_id", categoryId)
        .eq("user_id", user.id);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Return highest role (admin > executor)
      const roles = data.map((d) => d.role);
      if (roles.includes("admin")) return "admin" as const;
      return "executor" as const;
    },
    enabled: !!categoryId && !!user,
  });
}
