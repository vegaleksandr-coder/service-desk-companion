import { useState } from "react";
import { Layout } from "@/components/Layout";
import { TicketCard } from "@/components/TicketCard";
import { TicketFilters } from "@/components/TicketFilters";
import { useTickets, Ticket } from "@/hooks/useTickets";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type TicketStatus = Ticket["status"];
type TicketPriority = Ticket["priority"];

export default function Tickets() {
  const navigate = useNavigate();
  const { data: tickets, isLoading, refetch, isRefetching } = useTickets();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');

  const filteredTickets = (tickets || []).filter((ticket) => {
    if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
    return true;
  });

  const activeFiltersCount = [
    statusFilter !== 'all',
    priorityFilter !== 'all',
  ].filter(Boolean).length;

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <Layout title="Заявки">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Заявки">
      <div className="p-4 md:p-6 space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Все заявки</h1>
            <p className="text-sm text-muted-foreground">
              {filteredTickets.length} заявок
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-secondary rounded-lg transition-colors touch-target"
            disabled={isRefetching}
          >
            <RefreshCw className={cn(
              "h-5 w-5 text-muted-foreground",
              isRefetching && "animate-spin"
            )} />
          </button>
        </div>

        {/* Filters */}
        <TicketFilters
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          onStatusChange={setStatusFilter}
          onPriorityChange={setPriorityFilter}
          activeFiltersCount={activeFiltersCount}
        />

        {/* Tickets list */}
        <div className="space-y-3">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Заявки не найдены</p>
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
              />
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
