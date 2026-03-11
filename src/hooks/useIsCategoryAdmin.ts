import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useIsCategoryAdmin() {
  const { user, currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ["is-category-admin", user?.id, currentCompanyId],
    queryFn: async () => {
      if (!user || !currentCompanyId) return { isCategoryAdmin: false, categoryIds: [] as string[] };

      const { data, error } = await supabase
        .from("category_members")
        .select("category_id, categories!inner(company_id)")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .eq("categories.company_id", currentCompanyId);

      if (error) {
        // Fallback: query without join
        const { data: members } = await supabase
          .from("category_members")
          .select("category_id")
          .eq("user_id", user.id)
          .eq("role", "admin");

        return {
          isCategoryAdmin: (members || []).length > 0,
          categoryIds: (members || []).map((m) => m.category_id),
        };
      }

      return {
        isCategoryAdmin: (data || []).length > 0,
        categoryIds: (data || []).map((m: any) => m.category_id),
      };
    },
    enabled: !!user && !!currentCompanyId,
  });
}
