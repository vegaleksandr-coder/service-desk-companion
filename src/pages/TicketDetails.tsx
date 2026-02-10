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
import { useTicket, useUpdateTicket, useAddComment, Ticket } from "@/hooks/useTickets";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Calendar, 
  Send,
  MessageSquare,
  Loader2,
  Pencil,
  Trash2
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { TicketEditDialog } from "@/components/ticket/TicketEditDialog";
import { TicketDeleteDialog } from "@/components/ticket/TicketDeleteDialog";
import { TicketHistory } from "@/components/ticket/TicketHistory";
import { TicketAttachments } from "@/components/ticket/TicketAttachments";

type TicketStatus = Ticket["status"];
type TicketPriority = Ticket["priority"];

const statusLabels: Record<TicketStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  awaiting: 'Ожидает ответа',
  resolved: 'Решена',
  closed: 'Закрыта',
};

const priorityLabels: Record<TicketPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
  deadline: 'Срок',
};

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  const { data: ticket, isLoading, error } = useTicket(id!);
  const updateTicket = useUpdateTicket();
  const addComment = useAddComment();

  // Fetch executors for assignment
  const { data: executors } = useQuery({
    queryKey: ["executors"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "executor"]);

      if (!roles || roles.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", roles.map(r => r.user_id));

      return profiles || [];
    },
  });

  const isStaff = role === 'admin' || role === 'executor';
  const isAuthor = user?.id === ticket?.created_by;
  const canEdit = isAuthor && ticket?.status !== 'closed';
  const canDelete = isAuthor && (ticket?.status === 'new' || ticket?.status === 'awaiting');

  if (isLoading) {
    return (
      <Layout title="Загрузка...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (error || !ticket) {
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

  const getPriorityVariant = (priority: TicketPriority) => {
    const variants: Record<TicketPriority, "priority-low" | "priority-medium" | "priority-high" | "priority-critical"> = {
      low: "priority-low",
      medium: "priority-medium",
      high: "priority-high",
      critical: "priority-critical",
      deadline: "priority-high",
    };
    return variants[priority];
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await addComment.mutateAsync({
        ticket_id: ticket.id,
        content: newComment.trim(),
      });
      toast.success("Комментарий добавлен");
      setNewComment("");
    } catch (error) {
      toast.error("Ошибка при добавлении комментария");
    }
  };

  const handleSaveChanges = async () => {
    const updates: { status?: TicketStatus; assignee_id?: string | null } = {};
    
    if (selectedStatus && selectedStatus !== ticket.status) {
      updates.status = selectedStatus;
    }
    if (selectedAssignee !== null && selectedAssignee !== ticket.assignee_id) {
      updates.assignee_id = selectedAssignee || null;
    }

    if (Object.keys(updates).length === 0) {
      toast.info("Нет изменений для сохранения");
      return;
    }

    try {
      await updateTicket.mutateAsync({ id: ticket.id, ...updates });
      toast.success("Изменения сохранены");
    } catch (error) {
      toast.error("Ошибка при сохранении");
    }
  };

  return (
    <Layout title={`#${ticket.id.slice(0, 8)}`} showSearch={false}>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        {/* Back button */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="gap-1 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Button>
          
          {/* Author actions */}
          {(canEdit || canDelete) && (
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(true)}
                  className="gap-1"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="hidden sm:inline">Редактировать</span>
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteOpen(true)}
                  className="gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Удалить</span>
                </Button>
              )}
            </div>
          )}
        </div>

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
                <p className="font-medium">{ticket.category?.name || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Создана</p>
                <p className="font-medium">
                  {format(new Date(ticket.created_at), "d MMM yyyy, HH:mm", { locale: ru })}
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
                    {format(new Date(ticket.deadline), "d MMM yyyy", { locale: ru })}
                  </p>
                </div>
              )}
            </div>

            {/* History section */}
            <Separator />
            <TicketHistory ticketId={ticket.id} />
          </CardContent>
        </Card>

        {/* Attachments section */}
        <TicketAttachments ticketId={ticket.id} canUpload={isAuthor} />

        {/* Actions for admins/executors */}
        {isStaff && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Управление заявкой</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status change */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Статус</label>
                  <Select 
                    defaultValue={ticket.status}
                    onValueChange={(value) => setSelectedStatus(value as TicketStatus)}
                  >
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
                  <Select 
                    defaultValue={ticket.assignee_id || "__none__"}
                    onValueChange={(value) => setSelectedAssignee(value === "__none__" ? "" : value)}
                  >
                    <SelectTrigger className="touch-target">
                      <SelectValue placeholder="Назначить исполнителя" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Не назначен</SelectItem>
                      {executors?.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                className="w-full md:w-auto"
                onClick={handleSaveChanges}
                disabled={updateTicket.isPending}
              >
                {updateTicket.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Сохранить изменения
              </Button>
            </CardContent>
          </Card>
        )}

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
                          {formatDistanceToNow(new Date(comment.created_at), { 
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
                disabled={!newComment.trim() || addComment.isPending}
                className="w-full md:w-auto"
              >
                {addComment.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Отправить
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      {ticket && (
        <TicketEditDialog
          ticket={ticket}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}

      {/* Delete Dialog */}
      {ticket && (
        <TicketDeleteDialog
          ticketId={ticket.id}
          ticketTitle={ticket.title}
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
        />
      )}
    </Layout>
  );
}
