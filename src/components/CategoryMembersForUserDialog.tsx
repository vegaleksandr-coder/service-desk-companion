import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAddCategoryMember, useRemoveCategoryMember } from "@/hooks/useCategoryMembers";

interface Props {
  userId: string | null;
  userName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryMembersForUserDialog({ userId, userName, open, onOpenChange }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "executor">("executor");

  const { data: categories, isLoading: catsLoading } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const { data: userMemberships, isLoading: membershipsLoading } = useQuery({
    queryKey: ["user-category-memberships", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("category_members")
        .select("id, category_id, role")
        .eq("user_id", userId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId && open,
  });

  const addMember = useAddCategoryMember();
  const removeMember = useRemoveCategoryMember();

  const availableCategories = (categories || []).filter(
    (c) => !userMemberships?.some((m) => m.category_id === c.id && m.role === selectedRole)
  );

  const handleAdd = async () => {
    if (!selectedCategoryId || !userId) return;
    try {
      await addMember.mutateAsync({ categoryId: selectedCategoryId, userId, role: selectedRole });
      toast.success("Категория назначена");
      setSelectedCategoryId("");
    } catch (error: any) {
      if (error?.code === "23505") {
        toast.error("Пользователь уже имеет эту роль в категории");
      } else {
        toast.error("Ошибка при назначении категории");
      }
    }
  };

  const handleRemove = async (membershipId: string, categoryId: string) => {
    try {
      await removeMember.mutateAsync({ id: membershipId, categoryId });
      toast.success("Членство удалено");
    } catch {
      toast.error("Ошибка при удалении");
    }
  };

  const getCategoryName = (catId: string) =>
    categories?.find((c) => c.id === catId)?.name || catId;

  const isLoading = catsLoading || membershipsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Категории пользователя</DialogTitle>
          <DialogDescription>
            Управление членством в категориях для «{userName}»
          </DialogDescription>
        </DialogHeader>

        {/* Add */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Добавить в категорию</h4>
          <div className="flex gap-2">
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "admin" | "executor")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Администратор</SelectItem>
                <SelectItem value="executor">Исполнитель</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Выберите категорию" />
              </SelectTrigger>
              <SelectContent>
                {catsLoading ? (
                  <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                ) : availableCategories.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">Нет доступных категорий</div>
                ) : (
                  availableCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAdd} disabled={!selectedCategoryId || addMember.isPending} size="sm" className="w-full">
            {addMember.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Добавить
          </Button>
        </div>

        <Separator />

        {/* Current memberships */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !userMemberships || userMemberships.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Пользователь не состоит ни в одной категории
          </p>
        ) : (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Текущие категории</h4>
            {userMemberships.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 px-2 rounded-md hover:bg-secondary/50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{getCategoryName(m.category_id)}</span>
                  <Badge variant="outline" className="text-xs">
                    {m.role === "admin" ? "Администратор" : "Исполнитель"}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleRemove(m.id, m.category_id)}
                  disabled={removeMember.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
