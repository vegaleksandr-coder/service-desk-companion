import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface GuideSection {
  title: string;
  content: string[];
}

export interface Guide {
  id: string;
  guide_key: string;
  title: string;
  sections: GuideSection[];
  sort_order: number;
  updated_at: string;
  updated_by: string | null;
}

export function useGuides() {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ["guides", currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      const { data, error } = await supabase
        .from("guides")
        .select("*")
        .eq("company_id", currentCompanyId)
        .order("sort_order");
      if (error) throw error;
      return (data as any[]).map((d) => ({
        ...d,
        sections: (d.sections || []) as GuideSection[],
      })) as Guide[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useUpdateGuide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      title,
      sections,
    }: {
      id: string;
      title: string;
      sections: GuideSection[];
    }) => {
      const { error } = await supabase
        .from("guides")
        .update({
          title,
          sections: sections as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guides"] });
    },
  });
}
