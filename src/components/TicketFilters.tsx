import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Ticket } from "@/hooks/useTickets";

type TicketStatus = Ticket["status"];
type TicketPriority = Ticket["priority"];

const priorityLabels: Record<TicketPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
  deadline: 'Срок',
};

interface TicketFiltersProps {
  statusFilter: TicketStatus | 'all';
  priorityFilter: TicketPriority | 'all';
  onStatusChange: (value: TicketStatus | 'all') => void;
  onPriorityChange: (value: TicketPriority | 'all') => void;
  activeFiltersCount: number;
}

export function TicketFilters({
  statusFilter,
  priorityFilter,
  onStatusChange,
  onPriorityChange,
  activeFiltersCount,
}: TicketFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Quick filters - horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          className="shrink-0"
          onClick={() => onStatusChange('all')}
        >
          Все
        </Button>
        <Button
          variant={statusFilter === 'new' ? 'default' : 'outline'}
          size="sm"
          className="shrink-0"
          onClick={() => onStatusChange('new')}
        >
          <Badge variant="status-new" className="mr-1.5 h-2 w-2 p-0 rounded-full" />
          Новые
        </Button>
        <Button
          variant={statusFilter === 'in_progress' ? 'default' : 'outline'}
          size="sm"
          className="shrink-0"
          onClick={() => onStatusChange('in_progress')}
        >
          <Badge variant="status-in-progress" className="mr-1.5 h-2 w-2 p-0 rounded-full" />
          В работе
        </Button>
        <Button
          variant={statusFilter === 'awaiting' ? 'default' : 'outline'}
          size="sm"
          className="shrink-0"
          onClick={() => onStatusChange('awaiting')}
        >
          <Badge variant="status-awaiting" className="mr-1.5 h-2 w-2 p-0 rounded-full" />
          Ожидает
        </Button>
        <Button
          variant={statusFilter === 'resolved' ? 'default' : 'outline'}
          size="sm"
          className="shrink-0"
          onClick={() => onStatusChange('resolved')}
        >
          <Badge variant="status-resolved" className="mr-1.5 h-2 w-2 p-0 rounded-full" />
          Решены
        </Button>
      </div>

      {/* Advanced filters */}
      <div className="flex items-center gap-2">
        <Select
          value={priorityFilter}
          onValueChange={(value) => onPriorityChange(value as TicketPriority | 'all')}
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Приоритет" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все приоритеты</SelectItem>
            <SelectItem value="low">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-priority-low" />
                {priorityLabels.low}
              </span>
            </SelectItem>
            <SelectItem value="medium">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-priority-medium" />
                {priorityLabels.medium}
              </span>
            </SelectItem>
            <SelectItem value="high">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-priority-high" />
                {priorityLabels.high}
              </span>
            </SelectItem>
            <SelectItem value="critical">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-priority-critical" />
                {priorityLabels.critical}
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="gap-1.5">
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Фильтры</span>
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}
