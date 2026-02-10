import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CategoryMember {
  id: string;
  user_id: string;
  category_id: string;
  role: "admin" | "executor";
  created_at: string;
}

export interface CategoryMemberWithProfile extends CategoryMember {
  name: string;
  email: string;
  avatar_url: string | null;
}

export function useCategoryMembers(categoryId: string | null | undefined) {
  return useQuery({
    queryKey: ["category-members", categoryId],
    queryFn: async (): Promise<CategoryMemberWithProfile[]> => {
      if (!categoryId) return [];
      const { data, error } = await supabase
        .from("category_members")
        .select("*")
        .eq("category_id", categoryId);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = data.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.user_id, p])
      );

      return data.map((m) => {
        const profile = profileMap.get(m.user_id);
        return {
          ...m,
          role: m.role as "admin" | "executor",
          name: profile?.name || "Неизвестный",
          email: profile?.email || "",
          avatar_url: profile?.avatar_url || null,
        };
      });
    },
    enabled: !!categoryId,
  });
}

export function useAddCategoryMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      categoryId,
      userId,
      role,
    }: {
      categoryId: string;
      userId: string;
      role: "admin" | "executor";
    }) => {
      const { data, error } = await supabase
        .from("category_members")
        .insert({
          category_id: categoryId,
          user_id: userId,
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["category-members", variables.categoryId] });
      queryClient.invalidateQueries({ queryKey: ["category-executors", variables.categoryId] });
    },
  });
}

export function useRemoveCategoryMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, categoryId }: { id: string; categoryId: string }) => {
      const { error } = await supabase
        .from("category_members")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["category-members", variables.categoryId] });
      queryClient.invalidateQueries({ queryKey: ["category-executors", variables.categoryId] });
    },
  });
}

export function useCategoryExecutors(categoryId: string | null | undefined) {
  return useQuery({
    queryKey: ["category-executors", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];

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

      const roles = data.map((d) => d.role);
      if (roles.includes("admin")) return "admin" as const;
      return "executor" as const;
    },
    enabled: !!categoryId && !!user,
  });
}
