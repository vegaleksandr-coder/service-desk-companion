import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Shield, 
  CheckCircle,
  User as UserIcon,
  Loader2,
} from "lucide-react";
import { UserRole, roleLabels } from "@/types/ticket";
import { useAdminUsers, useUpdateUserRole, AdminUser } from "@/hooks/useAdminUsers";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const roleColors: Record<UserRole, string> = {
  admin: "bg-priority-critical/10 text-priority-critical border-priority-critical/20",
  executor: "bg-priority-high/10 text-priority-high border-priority-high/20",
  user: "bg-muted text-muted-foreground border-border",
};

const roleIcons: Record<UserRole, typeof Shield> = {
  admin: Shield,
  executor: CheckCircle,
  user: UserIcon,
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useAdminUsers();
  const updateRole = useUpdateUserRole();

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [roleDialogUser, setRoleDialogUser] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("user");

  const filteredUsers = (users || []).filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleOpenRoleDialog = (user: AdminUser) => {
    setRoleDialogUser(user);
    setSelectedRole(user.role);
  };

  const handleSaveRole = async () => {
    if (!roleDialogUser) return;

    try {
      await updateRole.mutateAsync({
        userId: roleDialogUser.user_id,
        newRole: selectedRole,
      });
      toast.success(`Роль пользователя ${roleDialogUser.name} обновлена на "${roleLabels[selectedRole]}"`);
      setRoleDialogUser(null);
    } catch {
      toast.error("Не удалось обновить роль");
    }
  };

  const handleQuickRoleChange = async (user: AdminUser, newRole: UserRole) => {
    if (user.role === newRole) return;
    if (user.user_id === currentUser?.id) {
      toast.error("Нельзя изменить свою собственную роль");
      return;
    }

    try {
      await updateRole.mutateAsync({ userId: user.user_id, newRole });
      toast.success(`Роль пользователя ${user.name} обновлена на "${roleLabels[newRole]}"`);
    } catch {
      toast.error("Не удалось обновить роль");
    }
  };

  const adminCount = (users || []).filter((u) => u.role === "admin").length;
  const executorCount = (users || []).filter((u) => u.role === "executor").length;
  const userCount = (users || []).filter((u) => u.role === "user").length;

  if (isLoading) {
    return (
      <Layout title="Управление пользователями">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Управление пользователями">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{(users || []).length}</div>
              <p className="text-xs text-muted-foreground">Всего пользователей</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-priority-critical">{adminCount}</div>
              <p className="text-xs text-muted-foreground">Администраторов</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-priority-high">{executorCount}</div>
              <p className="text-xs text-muted-foreground">Исполнителей</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">{userCount}</div>
              <p className="text-xs text-muted-foreground">Пользователей</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Пользователи</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по имени или email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Все роли" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все роли</SelectItem>
                  <SelectItem value="admin">Администраторы</SelectItem>
                  <SelectItem value="executor">Исполнители</SelectItem>
                  <SelectItem value="user">Пользователи</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Роль</TableHead>
                    <TableHead>Дата регистрации</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span>{user.name}</span>
                            {user.user_id === currentUser?.id && (
                              <span className="ml-2 text-xs text-muted-foreground">(вы)</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleColors[user.role]}>
                          {roleLabels[user.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), "d MMM yyyy", { locale: ru })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenRoleDialog(user)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Изменить роль
                            </DropdownMenuItem>
                            {user.role !== "admin" && (
                              <DropdownMenuItem onClick={() => handleQuickRoleChange(user, "admin")}>
                                <Shield className="h-4 w-4 mr-2" />
                                Сделать админом
                              </DropdownMenuItem>
                            )}
                            {user.role !== "executor" && (
                              <DropdownMenuItem onClick={() => handleQuickRoleChange(user, "executor")}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Сделать исполнителем
                              </DropdownMenuItem>
                            )}
                            {user.role !== "user" && (
                              <DropdownMenuItem onClick={() => handleQuickRoleChange(user, "user")}>
                                <UserIcon className="h-4 w-4 mr-2" />
                                Сделать пользователем
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {filteredUsers.map((user) => (
                <Card key={user.user_id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {user.name}
                            {user.user_id === currentUser?.id && (
                              <span className="ml-1 text-xs text-muted-foreground">(вы)</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenRoleDialog(user)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Изменить роль
                          </DropdownMenuItem>
                          {user.role !== "admin" && (
                            <DropdownMenuItem onClick={() => handleQuickRoleChange(user, "admin")}>
                              <Shield className="h-4 w-4 mr-2" />
                              Сделать админом
                            </DropdownMenuItem>
                          )}
                          {user.role !== "executor" && (
                            <DropdownMenuItem onClick={() => handleQuickRoleChange(user, "executor")}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Сделать исполнителем
                            </DropdownMenuItem>
                          )}
                          {user.role !== "user" && (
                            <DropdownMenuItem onClick={() => handleQuickRoleChange(user, "user")}>
                              <UserIcon className="h-4 w-4 mr-2" />
                              Сделать пользователем
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant="outline" className={roleColors[user.role]}>
                        {roleLabels[user.role]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(user.created_at), "d MMM yyyy", { locale: ru })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                Пользователи не найдены
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Change Role Dialog */}
      <Dialog open={!!roleDialogUser} onOpenChange={(open) => !open && setRoleDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить роль</DialogTitle>
            <DialogDescription>
              Выберите новую роль для пользователя{" "}
              <span className="font-medium text-foreground">{roleDialogUser?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {(["admin", "executor", "user"] as UserRole[]).map((role) => {
              const Icon = roleIcons[role];
              const isSelected = selectedRole === role;
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-left">
                    <div className={`font-medium ${isSelected ? "text-primary" : ""}`}>
                      {roleLabels[role]}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {role === "admin" && "Полный доступ к системе"}
                      {role === "executor" && "Может обрабатывать заявки"}
                      {role === "user" && "Может создавать заявки"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogUser(null)}>
              Отмена
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={updateRole.isPending || selectedRole === roleDialogUser?.role}
            >
              {updateRole.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
