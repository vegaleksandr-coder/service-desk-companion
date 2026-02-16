import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

export interface TicketProfile {
  id: string;
  name: string;
  email?: string;
  avatar_url: string | null;
}

export interface Comment {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  user?: TicketProfile;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: "new" | "in_progress" | "awaiting" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical" | "deadline";
  category_id: string | null;
  created_by: string;
  assignee_id: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  company_id?: string | null;
  category?: Category;
  creator?: TicketProfile;
  assignee?: TicketProfile;
  comments?: Comment[];
}

export interface TicketStats {
  total: number;
  new: number;
  inProgress: number;
  awaiting: number;
  resolved: number;
  closed: number;
}

export function useCategories() {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ["categories", currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", currentCompanyId)
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useTickets() {
  const { currentCompanyId } = useAuth();
  return useQuery({
    queryKey: ["tickets", currentCompanyId],
    queryFn: async () => {
      if (!currentCompanyId) return [];
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select("*")
        .eq("company_id", currentCompanyId)
        .order("created_at", { ascending: false });

      if (ticketsError) throw ticketsError;
      if (!tickets || tickets.length === 0) return [];

      const userIds = new Set<string>();
      const categoryIds = new Set<string>();
      
      tickets.forEach((ticket) => {
        userIds.add(ticket.created_by);
        if (ticket.assignee_id) userIds.add(ticket.assignee_id);
        if (ticket.category_id) categoryIds.add(ticket.category_id);
      });

      const { data: profilesWithUserId } = await supabase
        .from("profiles_public" as any)
        .select("id, user_id, name, avatar_url")
        .in("user_id", Array.from(userIds));

      const profileByUserId = new Map<string, TicketProfile>();
      profilesWithUserId?.forEach((p: any) => {
        profileByUserId.set(p.user_id, {
          id: p.id,
          name: p.name,
          avatar_url: p.avatar_url,
        });
      });

      const { data: categories } = await supabase
        .from("categories")
        .select("*")
        .in("id", Array.from(categoryIds));

      const categoryMap = new Map(
        categories?.map((c) => [c.id, c as Category]) || []
      );

      return tickets.map((ticket) => ({
        ...ticket,
        category: ticket.category_id ? categoryMap.get(ticket.category_id) : undefined,
        creator: profileByUserId.get(ticket.created_by),
        assignee: ticket.assignee_id ? profileByUserId.get(ticket.assignee_id) : undefined,
      })) as Ticket[];
    },
    enabled: !!currentCompanyId,
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const { data: ticket, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      const userIds = new Set<string>([ticket.created_by]);
      if (ticket.assignee_id) userIds.add(ticket.assignee_id);

      const { data: profiles } = await supabase
        .from("profiles_public" as any)
        .select("id, user_id, name, avatar_url")
        .in("user_id", Array.from(userIds));

      const profileByUserId = new Map<string, TicketProfile>();
      profiles?.forEach((p: any) => {
        profileByUserId.set(p.user_id, {
          id: p.id,
          name: p.name,
          avatar_url: p.avatar_url,
        });
      });

      let category: Category | undefined;
      if (ticket.category_id) {
        const { data: cat } = await supabase
          .from("categories")
          .select("*")
          .eq("id", ticket.category_id)
          .single();
        category = cat as Category;
      }

      const { data: comments } = await supabase
        .from("comments")
        .select("*")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true });

      const commentUserIds = new Set<string>();
      comments?.forEach((c) => commentUserIds.add(c.user_id));

      const { data: commentProfiles } = await supabase
        .from("profiles_public" as any)
        .select("id, user_id, name, avatar_url")
        .in("user_id", Array.from(commentUserIds));

      const commentProfileMap = new Map<string, TicketProfile>();
      commentProfiles?.forEach((p: any) => {
        commentProfileMap.set(p.user_id, {
          id: p.id,
          name: p.name,
          avatar_url: p.avatar_url,
        });
      });

      const enrichedComments = comments?.map((c) => ({
        ...c,
        user: commentProfileMap.get(c.user_id),
      })) as Comment[];

      return {
        ...ticket,
        category,
        creator: profileByUserId.get(ticket.created_by),
        assignee: ticket.assignee_id ? profileByUserId.get(ticket.assignee_id) : undefined,
        comments: enrichedComments,
      } as Ticket;
    },
    enabled: !!id,
  });
}

export function useTicketStats() {
  const { data: tickets } = useTickets();

  const stats: TicketStats = {
    total: tickets?.length || 0,
    new: tickets?.filter((t) => t.status === "new").length || 0,
    inProgress: tickets?.filter((t) => t.status === "in_progress").length || 0,
    awaiting: tickets?.filter((t) => t.status === "awaiting").length || 0,
    resolved: tickets?.filter((t) => t.status === "resolved").length || 0,
    closed: tickets?.filter((t) => t.status === "closed").length || 0,
  };

  return stats;
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  const { user, currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      priority: Ticket["priority"];
      category_id: string | null;
      deadline?: string | null;
    }) => {
      if (!user) throw new Error("User not authenticated");
      if (!currentCompanyId) throw new Error("No company selected");

      const { data: ticket, error } = await supabase
        .from("tickets")
        .insert({
          ...data,
          created_by: user.id,
          company_id: currentCompanyId,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      status?: Ticket["status"];
      priority?: Ticket["priority"];
      assignee_id?: string | null;
      deadline?: string | null;
    }) => {
      const { data: ticket, error } = await supabase
        .from("tickets")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return ticket;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.id] });
    },
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      ticket_id,
      content,
      is_internal = false,
    }: {
      ticket_id: string;
      content: string;
      is_internal?: boolean;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("comments")
        .insert({
          ticket_id,
          user_id: user.id,
          content,
          is_internal,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.ticket_id] });
    },
  });
}

export interface TicketHistoryEntry {
  id: string;
  ticket_id: string;
  user_id: string;
  action: string;
  changes: Record<string, { old: unknown; new: unknown }> | null;
  created_at: string;
  user?: TicketProfile;
}

export function useTicketHistory(ticketId: string) {
  return useQuery({
    queryKey: ["ticket-history", ticketId],
    queryFn: async () => {
      const { data: history, error } = await supabase
        .from("ticket_history")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!history || history.length === 0) return [];

      const userIds = new Set<string>();
      history.forEach((h) => userIds.add(h.user_id));

      const { data: profiles } = await supabase
        .from("profiles_public" as any)
        .select("id, user_id, name, avatar_url")
        .in("user_id", Array.from(userIds));

      const profileMap = new Map<string, TicketProfile>();
      profiles?.forEach((p: any) => {
        profileMap.set(p.user_id, {
          id: p.id,
          name: p.name,
          avatar_url: p.avatar_url,
        });
      });

      return history.map((h) => ({
        ...h,
        user: profileMap.get(h.user_id),
      })) as TicketHistoryEntry[];
    },
    enabled: !!ticketId,
  });
}

export function useEditTicket() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      description,
      priority,
      category_id,
      deadline,
    }: {
      id: string;
      title?: string;
      description?: string;
      priority?: Ticket["priority"];
      category_id?: string | null;
      deadline?: string | null;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (priority !== undefined) updates.priority = priority;
      if (category_id !== undefined) updates.category_id = category_id;
      if (deadline !== undefined) updates.deadline = deadline;

      const { data: ticket, error } = await supabase
        .from("tickets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return ticket;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["ticket-history", variables.id] });
    },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { currentCompanyId } = useAuth();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string | null; icon?: string | null; color?: string | null }) => {
      if (!currentCompanyId) throw new Error("No company selected");
      const { data: cat, error } = await supabase
        .from("categories")
        .insert({ ...data, company_id: currentCompanyId } as any)
        .select()
        .single();
      if (error) throw error;
      return cat as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string | null; icon?: string | null; color?: string | null }) => {
      const { data: cat, error } = await supabase
        .from("categories")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return cat as Category;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });
}
