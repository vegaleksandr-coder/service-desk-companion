import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { TicketCard } from "@/components/TicketCard";
import { TicketFilters } from "@/components/TicketFilters";
import { useTickets, Ticket } from "@/hooks/useTickets";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type TicketStatus = Ticket["status"];
type TicketPriority = Ticket["priority"];

export default function Tickets() {
  const navigate = useNavigate();
  const { data: tickets, isLoading, refetch, isRefetching } = useTickets();
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTickets = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return (tickets || []).filter((ticket) => {
      if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
      if (query) {
        const matchesTitle = ticket.title.toLowerCase().includes(query);
        const matchesDesc = ticket.description.toLowerCase().includes(query);
        const matchesId = ticket.id.toLowerCase().includes(query);
        const matchesCreator = ticket.creator?.name?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesId && !matchesCreator) return false;
      }
      return true;
    });
  }, [tickets, statusFilter, priorityFilter, searchQuery]);

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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, описанию, ID или автору..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 bg-secondary/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
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
