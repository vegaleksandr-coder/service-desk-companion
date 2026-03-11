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
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Trash2, Shield, Wrench, UserPlus, Eye, EyeOff, Dices, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  useCategoryMembers,
  useAddCategoryMember,
  useRemoveCategoryMember,
} from "@/hooks/useCategoryMembers";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface CategoryMembersDialogProps {
  categoryId: string | null;
  categoryName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function generatePassword(length = 12): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;
  let password = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];
  for (let i = password.length; i < length; i++) {
    password.push(all[Math.floor(Math.random() * all.length)]);
  }
  return password.sort(() => Math.random() - 0.5).join("");
}

export function CategoryMembersDialog({
  categoryId,
  categoryName,
  open,
  onOpenChange,
}: CategoryMembersDialogProps) {
  const { user, role, isGlobalAdmin, isChiefAdmin, currentCompanyId } = useAuth();
  const queryClient = useQueryClient();

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "executor">("executor");

  // Create user form state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  const { data: members, isLoading: membersLoading } = useCategoryMembers(categoryId);
  const { data: allUsers, isLoading: usersLoading } = useAdminUsers();
  const addMember = useAddCategoryMember();
  const removeMember = useRemoveCategoryMember();

  // Is the current user a company-level admin?
  const isCompanyAdmin = role === "admin" || isGlobalAdmin || isChiefAdmin;

  // Is the current user a category admin for this specific category?
  const isCategoryAdminOfThis = members?.some(
    (m) => m.user_id === user?.id && m.role === "admin"
  ) || false;

  // Category admins can only add/remove executors, not other admins
  const canManageAdmins = isCompanyAdmin;
  const canManageExecutors = isCompanyAdmin || isCategoryAdminOfThis;

  // Available roles for the add form
  const availableRoles = canManageAdmins
    ? (["admin", "executor"] as const)
    : (["executor"] as const);

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

  const handleRemove = async (memberId: string, memberRole: string) => {
    if (!categoryId) return;
    // Category admins cannot remove other admins
    if (!canManageAdmins && memberRole === "admin") {
      toast.error("Вы не можете удалить администратора категории");
      return;
    }
    try {
      await removeMember.mutateAsync({ id: memberId, categoryId });
      toast.success("Участник удалён");
    } catch {
      toast.error("Ошибка при удалении участника");
    }
  };

  const handleCreateUser = async () => {
    if (!newName || !newEmail || !newPassword || !currentCompanyId || !categoryId) {
      toast.error("Заполните все поля");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Пароль должен быть не менее 6 символов");
      return;
    }

    setCreatingUser(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            email: newEmail,
            password: newPassword,
            name: newName,
            role: "user",
            company_id: currentCompanyId,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка");
      }

      const result = await res.json();
      const newUserId = result.user?.id;

      // Add the new user to this category
      if (newUserId) {
        await addMember.mutateAsync({
          categoryId,
          userId: newUserId,
          role: selectedRole === "admin" && !canManageAdmins ? "executor" : selectedRole,
        });
      }

      toast.success(`Пользователь ${newName} создан и добавлен в категорию`);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      setShowCreateUser(false);
      setShowPassword(false);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e.message || "Ошибка создания пользователя");
    } finally {
      setCreatingUser(false);
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
            Управление участниками категории «{categoryName}»
          </DialogDescription>
        </DialogHeader>

        {/* Add existing member form */}
        {canManageExecutors && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Добавить участника</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateUser(!showCreateUser)}
              >
                <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                {showCreateUser ? "Из списка" : "Создать нового"}
              </Button>
            </div>

            {!showCreateUser ? (
              <>
                <div className="flex gap-2">
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "admin" | "executor")}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r === "admin" ? "Администратор" : "Исполнитель"}
                        </SelectItem>
                      ))}
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
              </>
            ) : (
              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Input
                    placeholder="Имя"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Пароль"
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pr-20"
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setNewPassword(generatePassword())}
                          title="Сгенерировать пароль"
                        >
                          <Dices className="h-3.5 w-3.5" />
                        </Button>
                        {newPassword && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              navigator.clipboard.writeText(newPassword);
                              toast.success("Пароль скопирован");
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "admin" | "executor")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          Роль в категории: {r === "admin" ? "Администратор" : "Исполнитель"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCreateUser}
                  disabled={creatingUser || !newName || !newEmail || !newPassword}
                  size="sm"
                  className="w-full"
                >
                  {creatingUser ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Создать и добавить
                </Button>
              </div>
            )}
          </div>
        )}

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
                      onRemove={() => handleRemove(member.id, member.role)}
                      isRemoving={removeMember.isPending}
                      canRemove={canManageAdmins}
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
                      onRemove={() => handleRemove(member.id, member.role)}
                      isRemoving={removeMember.isPending}
                      canRemove={canManageExecutors}
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
  canRemove = true,
}: {
  name: string;
  email?: string;
  onRemove: () => void;
  isRemoving: boolean;
  canRemove?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-secondary/50">
      <div className="flex items-center gap-2 min-w-0">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback className="text-xs">{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
        </div>
      </div>
      {canRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
          onClick={onRemove}
          disabled={isRemoving}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
