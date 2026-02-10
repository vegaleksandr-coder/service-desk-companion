import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2, Shield, Wrench } from "lucide-react";
import { toast } from "sonner";
import {
  useCategoryMembers,
  useAddCategoryMember,
  useRemoveCategoryMember,
} from "@/hooks/useCategoryMembers";
import { useAdminUsers } from "@/hooks/useAdminUsers";

interface CategoryMembersDialogProps {
  categoryId: string | null;
  categoryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryRoleLabels: Record<string, string> = {
  admin: "Администратор",
  executor: "Исполнитель",
};

export function CategoryMembersDialog({
  categoryId,
  categoryName,
  open,
  onOpenChange,
}: CategoryMembersDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "executor">("executor");

  const { data: members, isLoading: membersLoading } = useCategoryMembers(categoryId);
  const { data: allUsers, isLoading: usersLoading } = useAdminUsers();
  const addMember = useAddCategoryMember();
  const removeMember = useRemoveCategoryMember();

  // Filter out users already in this category with the same role
  const availableUsers = (allUsers || []).filter((u) => {
    return !members?.some(
      (m) => m.user_id === u.user_id && m.role === selectedRole
    );
  });

  const handleAdd = async () => {
    if (!selectedUserId || !categoryId) return;

    try {
      await addMember.mutateAsync({
        categoryId,
        userId: selectedUserId,
        role: selectedRole,
      });
      toast.success("Участник добавлен");
      setSelectedUserId("");
    } catch (error: any) {
      if (error?.code === "23505") {
        toast.error("Этот пользователь уже имеет такую роль в категории");
      } else {
        toast.error("Ошибка при добавлении участника");
      }
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!categoryId) return;
    try {
      await removeMember.mutateAsync({ id: memberId, categoryId });
      toast.success("Участник удалён");
    } catch {
      toast.error("Ошибка при удалении участника");
    }
  };

  const admins = members?.filter((m) => m.role === "admin") || [];
  const executors = members?.filter((m) => m.role === "executor") || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Участники категории</DialogTitle>
          <DialogDescription>
            Управление администраторами и исполнителями категории «{categoryName}»
          </DialogDescription>
        </DialogHeader>

        {/* Add member form */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Добавить участника</h4>
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
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Выберите пользователя" />
              </SelectTrigger>
              <SelectContent>
                {usersLoading ? (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : availableUsers.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    Нет доступных пользователей
                  </div>
                ) : (
                  availableUsers.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleAdd}
            disabled={!selectedUserId || addMember.isPending}
            size="sm"
            className="w-full"
          >
            {addMember.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Добавить
          </Button>
        </div>

        <Separator />

        {/* Members list */}
        {membersLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Admins */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-medium">Администраторы ({admins.length})</h4>
              </div>
              {admins.length === 0 ? (
                <p className="text-sm text-muted-foreground pl-6">
                  Нет администраторов
                </p>
              ) : (
                <div className="space-y-1">
                  {admins.map((member) => (
                    <MemberRow
                      key={member.id}
                      name={member.name}
                      email={member.email}
                      onRemove={() => handleRemove(member.id)}
                      isRemoving={removeMember.isPending}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Executors */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-medium">Исполнители ({executors.length})</h4>
              </div>
              {executors.length === 0 ? (
                <p className="text-sm text-muted-foreground pl-6">
                  Нет исполнителей
                </p>
              ) : (
                <div className="space-y-1">
                  {executors.map((member) => (
                    <MemberRow
                      key={member.id}
                      name={member.name}
                      email={member.email}
                      onRemove={() => handleRemove(member.id)}
                      isRemoving={removeMember.isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({
  name,
  email,
  onRemove,
  isRemoving,
}: {
  name: string;
  email: string;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-secondary/50">
      <div className="flex items-center gap-2 min-w-0">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="text-xs">{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground truncate">{email}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
        onClick={onRemove}
        disabled={isRemoving}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
