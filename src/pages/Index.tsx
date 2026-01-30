import { Layout } from "@/components/Layout";
import { StatsCard } from "@/components/StatsCard";
import { TicketCard } from "@/components/TicketCard";
import { Button } from "@/components/ui/button";
import { mockTickets, mockStats } from "@/data/mockData";
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  PlusCircle,
  ArrowRight
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function Index() {
  const navigate = useNavigate();
  const recentTickets = mockTickets.slice(0, 4);

  return (
    <Layout title="Главная">
      <div className="p-4 md:p-6 space-y-6">
        {/* Welcome section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Добро пожаловать, Иван!
            </h1>
            <p className="text-muted-foreground mt-1">
              Вот обзор текущих заявок на сегодня
            </p>
          </div>
          <Button asChild className="w-full md:w-auto">
            <Link to="/tickets/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Создать заявку
            </Link>
          </Button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatsCard
            title="Всего заявок"
            value={mockStats.total}
            icon={ClipboardList}
            variant="primary"
          />
          <StatsCard
            title="Новые"
            value={mockStats.new}
            icon={AlertCircle}
            variant="warning"
            trend={{ value: 12, isPositive: false }}
          />
          <StatsCard
            title="В работе"
            value={mockStats.inProgress}
            icon={Clock}
            variant="default"
          />
          <StatsCard
            title="Решенные"
            value={mockStats.resolved + mockStats.closed}
            icon={CheckCircle2}
            variant="success"
            trend={{ value: 8, isPositive: true }}
          />
        </div>

        {/* Recent tickets */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Последние заявки</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/tickets" className="gap-1">
                Все заявки
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <div className="grid gap-3 md:grid-cols-2">
            {recentTickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => navigate(`/tickets/${ticket.id}`)}
              />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            asChild
          >
            <Link to="/tickets/new">
              <PlusCircle className="h-6 w-6 text-primary" />
              <span className="text-sm">Новая заявка</span>
            </Link>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            asChild
          >
            <Link to="/tickets?status=in_progress">
              <Clock className="h-6 w-6 text-status-in-progress" />
              <span className="text-sm">В работе</span>
            </Link>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            asChild
          >
            <Link to="/knowledge">
              <ClipboardList className="h-6 w-6 text-muted-foreground" />
              <span className="text-sm">База знаний</span>
            </Link>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex flex-col gap-2"
            asChild
          >
            <Link to="/profile">
              <CheckCircle2 className="h-6 w-6 text-status-resolved" />
              <span className="text-sm">Мои заявки</span>
            </Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
