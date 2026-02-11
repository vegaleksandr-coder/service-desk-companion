import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useCategories } from "@/hooks/useTickets";
import { useCreateFaq, useUpdateFaq, type FAQ } from "@/hooks/useFaqs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FaqManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faq?: FAQ | null;
}

export function FaqManageDialog({ open, onOpenChange, faq }: FaqManageDialogProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const { data: categories = [] } = useCategories();
  const createFaq = useCreateFaq();
  const updateFaq = useUpdateFaq();
  const { user } = useAuth();

  const isEditing = !!faq;

  useEffect(() => {
    if (faq) {
      setQuestion(faq.question);
      setAnswer(faq.answer);
      setCategoryId(faq.category_id || "none");
    } else {
      setQuestion("");
      setAnswer("");
      setCategoryId("none");
    }
  }, [faq, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      toast.error("Заполните вопрос и ответ");
      return;
    }

    try {
      const catId = categoryId === "none" ? null : categoryId;
      if (isEditing && faq) {
        await updateFaq.mutateAsync({
          id: faq.id,
          question: question.trim(),
          answer: answer.trim(),
          category_id: catId,
        });
        toast.success("Вопрос обновлён");
      } else {
        await createFaq.mutateAsync({
          question: question.trim(),
          answer: answer.trim(),
          category_id: catId,
          created_by: user!.id,
        });
        toast.success("Вопрос добавлен");
      }
      onOpenChange(false);
    } catch {
      toast.error("Ошибка при сохранении");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Редактировать вопрос" : "Добавить вопрос"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Вопрос</Label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Введите вопрос..."
            />
          </div>
          <div className="space-y-2">
            <Label>Ответ</Label>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Введите ответ..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Категория (необязательно)</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Без категории" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Без категории</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createFaq.isPending || updateFaq.isPending}>
              {isEditing ? "Сохранить" : "Добавить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
