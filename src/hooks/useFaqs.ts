import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category_id: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useFaqs() {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ["faqs", currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      const { data, error } = await supabase
        .from("faqs")
        .select("*")
        .eq("company_id", currentCompanyId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as FAQ[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useCreateFaq() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      question: string;
      answer: string;
      category_id?: string | null;
      sort_order?: number;
      created_by: string;
    }) => {
      if (!currentCompanyId) throw new Error("No company selected");
      const { data: faq, error } = await supabase
        .from("faqs")
        .insert({ ...data, company_id: currentCompanyId } as any)
        .select()
        .single();

      if (error) throw error;
      return faq;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
  });
}

export function useUpdateFaq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      question?: string;
      answer?: string;
      category_id?: string | null;
      sort_order?: number;
    }) => {
      const { data: faq, error } = await supabase
        .from("faqs")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return faq;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
  });
}

export function useDeleteFaq() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faqs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    },
  });
}
