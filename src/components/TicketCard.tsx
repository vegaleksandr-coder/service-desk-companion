import { Clock, User, MessageSquare, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Ticket, priorityLabels, statusLabels } from "@/types/ticket";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
}

const getPriorityVariant = (priority: Ticket['priority']) => {
  const variants: Record<Ticket['priority'], "priority-low" | "priority-medium" | "priority-high" | "priority-critical"> = {
    low: "priority-low",
    medium: "priority-medium",
    high: "priority-high",
    critical: "priority-critical",
    deadline: "priority-high",
  };
  return variants[priority];
};

const getStatusVariant = (status: Ticket['status']) => {
  const variants: Record<Ticket['status'], "status-new" | "status-in-progress" | "status-awaiting" | "status-resolved" | "status-closed"> = {
    new: "status-new",
    in_progress: "status-in-progress",
    awaiting: "status-awaiting",
    resolved: "status-resolved",
    closed: "status-closed",
  };
  return variants[status];
};

export function TicketCard({ ticket, onClick }: TicketCardProps) {
  const timeAgo = formatDistanceToNow(ticket.createdAt, { 
    addSuffix: true, 
    locale: ru 
  });

  return (
    <Card 
      className="ticket-card cursor-pointer active:scale-[0.99] touch-target"
      onClick={onClick}
    >
      <div className="flex flex-col gap-3">
        {/* Header with ID and badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">
              #{ticket.id.slice(0, 8)}
            </span>
            <Badge variant={getStatusVariant(ticket.status)}>
              {statusLabels[ticket.status]}
            </Badge>
            <Badge variant={getPriorityVariant(ticket.priority)}>
              {priorityLabels[ticket.priority]}
            </Badge>
          </div>
          {ticket.deadline && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{new Date(ticket.deadline).toLocaleDateString('ru-RU')}</span>
            </div>
          )}
        </div>

        {/* Title and description */}
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1">
            {ticket.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {ticket.description}
          </p>
        </div>

        {/* Category */}
        {ticket.category && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
              {ticket.category.name}
            </span>
          </div>
        )}

        {/* Footer with meta info */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-3">
            {/* Creator */}
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={ticket.creator?.avatar} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {ticket.creator?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {ticket.creator?.name || 'Пользователь'}
              </span>
            </div>

            {/* Comments count */}
            {ticket.comments && ticket.comments.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{ticket.comments.length}</span>
              </div>
            )}
          </div>

          {/* Time ago */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{timeAgo}</span>
          </div>
        </div>

        {/* Assignee if exists */}
        {ticket.assignee && (
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Исполнитель:</span>
            <Avatar className="h-5 w-5">
              <AvatarImage src={ticket.assignee.avatar} />
              <AvatarFallback className="text-[10px] bg-accent text-accent-foreground">
                {ticket.assignee.name?.charAt(0) || 'E'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">{ticket.assignee.name}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
