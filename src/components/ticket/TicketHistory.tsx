import { useTicketHistory, TicketHistoryEntry } from "@/hooks/useTickets";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { History, Loader2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const fieldLabels: Record<string, string> = {
  title: "Заголовок",
  description: "Описание",
  status: "Статус",
  priority: "Приоритет",
  category_id: "Категория",
  assignee_id: "Исполнитель",
  deadline: "Срок",
};

const statusLabels: Record<string, string> = {
  new: "Новая",
  in_progress: "В работе",
  awaiting: "Ожидает ответа",
  resolved: "Решена",
  closed: "Закрыта",
};

const priorityLabels: Record<string, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
  critical: "Критический",
  deadline: "Срок",
};

function formatValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  
  if (field === "status") {
    return statusLabels[value as string] || String(value);
  }
  if (field === "priority") {
    return priorityLabels[value as string] || String(value);
  }
  if (field === "description" && typeof value === "string" && value.length > 50) {
    return value.slice(0, 50) + "...";
  }
  
  return String(value);
}

function HistoryItem({ entry }: { entry: TicketHistoryEntry }) {
  const changes = entry.changes || {};
  const changedFields = Object.keys(changes);

  return (
    <div className="flex gap-3 py-3 border-b last:border-b-0">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="text-[10px]">
          {entry.user?.name?.charAt(0) || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{entry.user?.name || "Система"}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(entry.created_at), {
              addSuffix: true,
              locale: ru,
            })}
          </span>
        </div>
        <div className="mt-1 space-y-1">
          {changedFields.map((field) => {
            const change = changes[field];
            return (
              <p key={field} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {fieldLabels[field] || field}:
                </span>{" "}
                <span className="line-through opacity-60">
                  {formatValue(field, change.old)}
                </span>{" "}
                →{" "}
                <span>{formatValue(field, change.new)}</span>
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface TicketHistoryProps {
  ticketId: string;
}

export function TicketHistory({ ticketId }: TicketHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: history, isLoading } = useTicketHistory(ticketId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-0 h-auto py-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <History className="h-4 w-4" />
            История изменений ({history.length})
          </span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 max-h-64 overflow-y-auto">
          {history.map((entry) => (
            <HistoryItem key={entry.id} entry={entry} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}