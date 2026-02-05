import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ticket, useCategories, useEditTicket } from "@/hooks/useTickets";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type TicketPriority = Ticket["priority"];

const priorityLabels: Record<TicketPriority, string> = {
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
  critical: "Критический",
  deadline: "Срок",
};

const NO_CATEGORY = "__none__";

interface TicketEditDialogProps {
  ticket: Ticket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketEditDialog({ ticket, open, onOpenChange }: TicketEditDialogProps) {
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);
  const [priority, setPriority] = useState<TicketPriority>(ticket.priority);
  const [categoryId, setCategoryId] = useState(ticket.category_id || NO_CATEGORY);

  const { data: categories } = useCategories();
  const editTicket = useEditTicket();

  useEffect(() => {
    if (open) {
      setTitle(ticket.title);
      setDescription(ticket.description);
      setPriority(ticket.priority);
      setCategoryId(ticket.category_id || NO_CATEGORY);
    }
  }, [open, ticket]);

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    try {
      await editTicket.mutateAsync({
        id: ticket.id,
        title: title.trim(),
        description: description.trim(),
        priority,
        category_id: categoryId === NO_CATEGORY ? null : categoryId,
      });
      toast.success("Заявка обновлена");
      onOpenChange(false);
    } catch (error) {
      toast.error("Ошибка при обновлении заявки");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Редактировать заявку</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Заголовок *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Краткое описание проблемы"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробное описание"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Приоритет</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CATEGORY}>Без категории</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={editTicket.isPending}>
            {editTicket.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}