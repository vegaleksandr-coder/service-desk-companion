import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketCard } from "@/components/TicketCard";
import { StatsCard } from "@/components/StatsCard";
import { mockTickets } from "@/data/mockData";
import { roleLabels } from "@/types/ticket";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Mail, 
  LogOut, 
  Settings, 
  Bell,
  ClipboardList,
  Clock,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();
  const { profile, role, signOut } = useAuth();
  
  // TODO: Replace with real data from DB
  const myTickets = mockTickets.filter(t => t.createdBy === "1");
  const myActiveTickets = myTickets.filter(t => 
    t.status !== 'closed' && t.status !== 'resolved'
  );
  const myResolvedTickets = myTickets.filter(t => 
    t.status === 'closed' || t.status === 'resolved'
  );

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <Layout title="Профиль" showSearch={false}>
      <div className="p-4 md:p-6 space-y-6">
        {/* Profile header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {profile?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-xl font-bold">{profile?.name || "Загрузка..."}</h1>
                <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {profile?.email}
                  </span>
                </div>
                {role && (
                  <Badge variant="secondary" className="mt-2">
                    {roleLabels[role]}
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Bell className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatsCard
            title="Всего заявок"
            value={myTickets.length}
            icon={ClipboardList}
            variant="primary"
          />
          <StatsCard
            title="Активные"
            value={myActiveTickets.length}
            icon={Clock}
            variant="warning"
          />
          <StatsCard
            title="Решенные"
            value={myResolvedTickets.length}
            icon={CheckCircle2}
            variant="success"
          />
        </div>

        {/* Tickets tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="active">
              Активные ({myActiveTickets.length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Решенные ({myResolvedTickets.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3 mt-4">
            {myActiveTickets.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    У вас нет активных заявок
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={() => navigate('/tickets/new')}
                  >
                    Создать заявку
                  </Button>
                </CardContent>
              </Card>
            ) : (
              myActiveTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="resolved" className="space-y-3 mt-4">
            {myResolvedTickets.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Решенных заявок пока нет
                  </p>
                </CardContent>
              </Card>
            ) : (
              myResolvedTickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
