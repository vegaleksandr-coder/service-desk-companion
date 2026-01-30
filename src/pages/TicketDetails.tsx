import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { mockTickets, mockUsers } from "@/data/mockData";
import { 
  TicketStatus, 
  statusLabels, 
  priorityLabels 
} from "@/types/ticket";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Send,
  MessageSquare
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ticket = mockTickets.find(t => t.id === id);

  if (!ticket) {
    return (
      <Layout title="Заявка не найдена">
        <div className="p-4 text-center">
          <p className="text-muted-foreground">Заявка не найдена</p>
          <Button onClick={() => navigate("/tickets")} className="mt-4">
            Вернуться к списку
          </Button>
        </div>
      </Layout>
    );
  }

  const getStatusVariant = (status: TicketStatus) => {
    const variants: Record<TicketStatus, "status-new" | "status-in-progress" | "status-awaiting" | "status-resolved" | "status-closed"> = {
      new: "status-new",
      in_progress: "status-in-progress",
      awaiting: "status-awaiting",
      resolved: "status-resolved",
      closed: "status-closed",
    };
    return variants[status];
  };

  const getPriorityVariant = (priority: string) => {
    const variants: Record<string, "priority-low" | "priority-medium" | "priority-high" | "priority-critical"> = {
      low: "priority-low",
      medium: "priority-medium",
      high: "priority-high",
      critical: "priority-critical",
      deadline: "priority-high",
    };
    return variants[priority] || "priority-medium";
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success("Комментарий добавлен");
    setNewComment("");
    setIsSubmitting(false);
  };

  const executors = mockUsers.filter(u => u.role === 'executor' || u.role === 'admin');

  return (
    <Layout title={`#${ticket.id.slice(0, 8)}`} showSearch={false}>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        {/* Back button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="gap-1 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </Button>

        {/* Main ticket card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">
                #{ticket.id.slice(0, 8)}
              </span>
              <Badge variant={getStatusVariant(ticket.status)}>
                {statusLabels[ticket.status]}
              </Badge>
              <Badge variant={getPriorityVariant(ticket.priority)}>
                {priorityLabels[ticket.priority]}
              </Badge>
            </div>
            <CardTitle className="text-xl">{ticket.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Description */}
            <div>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>

            <Separator />

            {/* Meta info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Категория</p>
                <p className="font-medium">{ticket.category?.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Создана</p>
                <p className="font-medium">
                  {format(ticket.createdAt, "d MMM yyyy, HH:mm", { locale: ru })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Автор</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">
                      {ticket.creator?.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{ticket.creator?.name}</span>
                </div>
              </div>
              {ticket.deadline && (
                <div>
                  <p className="text-muted-foreground mb-1">Срок</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(ticket.deadline, "d MMM yyyy", { locale: ru })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions for admins/executors */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Управление заявкой</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status change */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Статус</label>
                <Select defaultValue={ticket.status}>
                  <SelectTrigger className="touch-target">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Исполнитель</label>
                <Select defaultValue={ticket.assigneeId || ""}>
                  <SelectTrigger className="touch-target">
                    <SelectValue placeholder="Назначить исполнителя" />
                  </SelectTrigger>
                  <SelectContent>
                    {executors.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full md:w-auto">
              Сохранить изменения
            </Button>
          </CardContent>
        </Card>

        {/* Comments section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Комментарии ({ticket.comments?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Comments list */}
            {ticket.comments && ticket.comments.length > 0 ? (
              <div className="space-y-4">
                {ticket.comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="text-xs">
                        {comment.user?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {comment.user?.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(comment.createdAt, { 
                            addSuffix: true, 
                            locale: ru 
                          })}
                        </span>
                      </div>
                      <p className="text-sm mt-1 text-muted-foreground">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Комментариев пока нет
              </p>
            )}

            <Separator />

            {/* Add comment form */}
            <div className="space-y-3">
              <Textarea
                placeholder="Напишите комментарий..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <Button 
                onClick={handleAddComment}
                disabled={!newComment.trim() || isSubmitting}
                className="w-full md:w-auto"
              >
                <Send className="mr-2 h-4 w-4" />
                Отправить
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
