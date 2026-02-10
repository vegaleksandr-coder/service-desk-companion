import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCategories, useCreateTicket, Ticket } from "@/hooks/useTickets";
import { CalendarIcon, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type TicketPriority = Ticket["priority"];

const priorityLabels: Record<TicketPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
  deadline: 'Срок',
};

export default function NewTicket() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const createTicket = useCreateTicket();

  // Fetch executor's category memberships to exclude them
  const { data: myMemberships } = useQuery({
    queryKey: ["my-category-memberships", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("category_members")
        .select("category_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: role === "executor" && !!user,
  });

  const filteredCategories = (() => {
    if (!categories) return [];
    if (role === "admin") return categories;
    if (role === "executor") {
      const myCatIds = new Set(myMemberships?.map((m) => m.category_id) || []);
      return categories.filter((c) => !myCatIds.has(c.id));
    }
    return categories;
  })();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [deadline, setDeadline] = useState<Date>();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast.error("Заполните тему и описание заявки");
      return;
    }

    try {
      await createTicket.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        priority,
        category_id: category || null,
        deadline: deadline?.toISOString() || null,
      });
      
      toast.success("Заявка успешно создана!");
      navigate("/tickets");
    } catch (error) {
      toast.error("Ошибка при создании заявки");
    }
  };

  return (
    <Layout title="Новая заявка" showSearch={false}>
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Создание заявки</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Тема заявки <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="Кратко опишите проблему"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="touch-target"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Описание <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Подробно опишите вашу проблему или запрос..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Категория</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="touch-target">
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesLoading ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        Загрузка...
                      </div>
                    ) : filteredCategories.length === 0 ? (
                      <div className="p-2 text-center text-sm text-muted-foreground">
                        Нет доступных категорий
                      </div>
                    ) : (
                      filteredCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Приоритет</Label>
                <Select 
                  value={priority} 
                  onValueChange={(value) => setPriority(value as TicketPriority)}
                >
                  <SelectTrigger className="touch-target">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label>Срок выполнения (опционально)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal touch-target",
                        !deadline && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadline 
                        ? format(deadline, "d MMMM yyyy", { locale: ru })
                        : "Выберите дату"
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deadline}
                      onSelect={setDeadline}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Submit button */}
              <Button 
                type="submit" 
                className="w-full touch-target"
                disabled={createTicket.isPending}
              >
                {createTicket.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Отправить заявку
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
