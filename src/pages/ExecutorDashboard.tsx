import { Layout } from "@/components/Layout";
import { StatsCard } from "@/components/StatsCard";
import { TicketCard } from "@/components/TicketCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Ticket, Category, TicketProfile } from "@/hooks/useTickets";
import { useUpdateTicket } from "@/hooks/useTickets";
import { toast } from "sonner";
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Inbox,
  UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function useExecutorTickets() {
  const { user, currentCompanyId } = useAuth();

  return useQuery({
    queryKey: ["executor-tickets", user?.id, currentCompanyId],
    queryFn: async (): Promise<Ticket[]> => {
      if (!user || !currentCompanyId) return [];

      // Get categories where user is a member
      const { data: memberships } = await supabase
        .from("category_members")
        .select("category_id")
        .eq("user_id", user.id);

      const categoryIds = memberships?.map((m) => m.category_id) || [];
      if (categoryIds.length === 0) return [];

      // Get tickets in those categories for current company
      const { data: tickets, error } = await supabase
        .from("tickets")
        .select("*")
        .in("category_id", categoryIds)
        .eq("company_id", currentCompanyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!tickets || tickets.length === 0) return [];

      // Enrich with profiles and categories
      const userIds = new Set<string>();
      const catIds = new Set<string>();
      tickets.forEach((t) => {
        userIds.add(t.created_by);
        if (t.assignee_id) userIds.add(t.assignee_id);
        if (t.category_id) catIds.add(t.category_id);
      });

      const [{ data: profiles }, { data: categories }] = await Promise.all([
        supabase.from("profiles_public" as any).select("id, user_id, name, avatar_url").in("user_id", Array.from(userIds)),
        supabase.from("categories").select("*").in("id", Array.from(catIds)),
      ]);

      const profileMap = new Map<string, TicketProfile>();
      (profiles as any[])?.forEach((p: any) => profileMap.set(p.user_id, { id: p.id, name: p.name, avatar_url: p.avatar_url }));

      const catMap = new Map<string, Category>();
      categories?.forEach((c) => catMap.set(c.id, c as Category));

      return tickets.map((t) => ({
        ...t,
        category: t.category_id ? catMap.get(t.category_id) : undefined,
        creator: profileMap.get(t.created_by),
        assignee: t.assignee_id ? profileMap.get(t.assignee_id) : undefined,
      })) as Ticket[];
    },
    enabled: !!user,
  });
}

export default function ExecutorDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { data: tickets, isLoading } = useExecutorTickets();
  const updateTicket = useUpdateTicket();

  const handleAssignToMe = async (e: React.MouseEvent, ticketId: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await updateTicket.mutateAsync({ id: ticketId, assignee_id: user.id });
      queryClient.invalidateQueries({ queryKey: ["executor-tickets"] });
      toast.success("Заявка назначена на вас");
    } catch {
      toast.error("Ошибка при назначении заявки");
    }
  };

  const myTickets = tickets?.filter((t) => t.assignee_id === user?.id) || [];
  const unassigned = tickets?.filter((t) => !t.assignee_id) || [];
  const allCategoryTickets = tickets || [];

  const stats = {
    assigned: myTickets.length,
    inProgress: myTickets.filter((t) => t.status === "in_progress").length,
    unassigned: unassigned.length,
    resolved: myTickets.filter((t) => t.status === "resolved" || t.status === "closed").length,
  };

  return (
    <Layout title="Дашборд исполнителя">
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Дашборд исполнителя
          </h1>
          <p className="text-muted-foreground mt-1">
            {profile?.name}, вот ваши текущие задачи
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatsCard title="Назначено мне" value={stats.assigned} icon={ClipboardList} variant="primary" />
          <StatsCard title="В работе" value={stats.inProgress} icon={Clock} variant="warning" />
          <StatsCard title="Без исполнителя" value={stats.unassigned} icon={AlertCircle} variant="danger" />
          <StatsCard title="Решено" value={stats.resolved} icon={CheckCircle2} variant="success" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="my" className="space-y-4">
          <TabsList>
            <TabsTrigger value="my">
              Мои заявки
              {myTickets.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{myTickets.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unassigned">
              Без исполнителя
              {unassigned.length > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">{unassigned.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">
              Все в категориях
              {allCategoryTickets.length > 0 && (
                <Badge variant="outline" className="ml-2 h-5 px-1.5 text-xs">{allCategoryTickets.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my">
            <TicketList tickets={myTickets} isLoading={isLoading} onClickTicket={(id) => navigate(`/tickets/${id}`)} emptyText="Нет назначенных вам заявок" />
          </TabsContent>
          <TabsContent value="unassigned">
            <TicketList
              tickets={unassigned}
              isLoading={isLoading}
              onClickTicket={(id) => navigate(`/tickets/${id}`)}
              emptyText="Нет заявок без исполнителя"
              renderAction={(ticket) => (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={updateTicket.isPending}
                  onClick={(e) => handleAssignToMe(e, ticket.id)}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Взять себе
                </Button>
              )}
            />
          </TabsContent>
          <TabsContent value="all">
            <TicketList
              tickets={allCategoryTickets}
              isLoading={isLoading}
              onClickTicket={(id) => navigate(`/tickets/${id}`)}
              emptyText="Нет заявок в ваших категориях"
              renderAction={(ticket) =>
                !ticket.assignee_id ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={updateTicket.isPending}
                    onClick={(e) => handleAssignToMe(e, ticket.id)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Взять себе
                  </Button>
                ) : null
              }
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function TicketList({
  tickets,
  isLoading,
  onClickTicket,
  emptyText,
  renderAction,
}: {
  tickets: Ticket[];
  isLoading: boolean;
  onClickTicket: (id: string) => void;
  emptyText: string;
  renderAction?: (ticket: Ticket) => React.ReactNode;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Inbox className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {tickets.map((ticket) => (
        <div key={ticket.id} className="relative">
          <TicketCard ticket={ticket} onClick={() => onClickTicket(ticket.id)} />
          {renderAction && (
            <div className="absolute top-3 right-3 z-10">
              {renderAction(ticket)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
