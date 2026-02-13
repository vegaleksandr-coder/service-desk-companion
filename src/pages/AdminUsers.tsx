import { useState } from "react";
import { Layout } from "@/components/Layout";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search, MoreHorizontal, Pencil, Shield, CheckCircle,
  User as UserIcon, Loader2, Plus, FolderOpen, Trash2, KeyRound, Dices, Copy, UserCog,
  Download, Upload, Eye, EyeOff, FileDown,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { UserRole, roleLabels } from "@/types/ticket";
import { useAdminUsers, useUpdateUserRole, useUpdateUserProfile, useCreateUser, useDeleteUser, useResetUserPassword, useToggleManageUsers, AdminUser } from "@/hooks/useAdminUsers";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { CategoryMembersForUserDialog } from "@/components/CategoryMembersForUserDialog";
import { exportUsers, downloadImportTemplate } from "@/utils/excelExport";
import { ImportUsersDialog } from "@/components/ImportUsersDialog";

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
  const { user: currentUser, role } = useAuth();
  const { data: users, isLoading } = useAdminUsers();
  const updateRole = useUpdateUserRole();
  const updateProfile = useUpdateUserProfile();
  const createUser = useCreateUser();
  const deleteUser = useDeleteUser();
  const resetPassword = useResetUserPassword();
  const toggleManageUsers = useToggleManageUsers();
  const [deleteDialogUser, setDeleteDialogUser] = useState<AdminUser | null>(null);
  const [passwordDialogUser, setPasswordDialogUser] = useState<AdminUser | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [roleDialogUser, setRoleDialogUser] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("user");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [showPassword, setShowPassword] = useState(false);
  const [categoriesUser, setCategoriesUser] = useState<AdminUser | null>(null);
  const [editDialogUser, setEditDialogUser] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [exportingUsers, setExportingUsers] = useState(false);

  const filteredUsers = (users || []).filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleOpenEditDialog = (user: AdminUser) => {
    setEditDialogUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
  };

  const handleSaveEdit = async () => {
    if (!editDialogUser || !editName || !editEmail) return;
    try {
      await updateProfile.mutateAsync({ userId: editDialogUser.user_id, name: editName, email: editEmail });
      toast.success(`Данные пользователя обновлены`);
      setEditDialogUser(null);
    } catch {
      toast.error("Не удалось обновить данные");
    }
  };

  const handleOpenRoleDialog = (user: AdminUser) => {
    setRoleDialogUser(user);
    setSelectedRole(user.role);
  };

  const handleSaveRole = async () => {
    if (!roleDialogUser) return;
    try {
      await updateRole.mutateAsync({ userId: roleDialogUser.user_id, newRole: selectedRole });
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

  const handleCreateUser = async () => {
    if (!newEmail || !newName || !newPassword) {
      toast.error("Заполните все обязательные поля");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Пароль должен быть не менее 6 символов");
      return;
    }
    try {
      await createUser.mutateAsync({ email: newEmail, password: newPassword, name: newName, role: newRole });
      toast.success(`Пользователь ${newName} создан`);
      setIsAddDialogOpen(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("user");
      setShowPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Ошибка при создании пользователя");
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

  const handleDeleteUser = async () => {
    if (!deleteDialogUser) return;
    try {
      await deleteUser.mutateAsync(deleteDialogUser.user_id);
      toast.success(`Пользователь ${deleteDialogUser.name} удалён`);
      setDeleteDialogUser(null);
    } catch (error: any) {
      toast.error(error.message || "Ошибка при удалении пользователя");
    }
  };

  const isAdmin = role === 'admin';

  const UserDropdownItems = ({ user }: { user: AdminUser }) => (
    <>
      {isAdmin && (
        <DropdownMenuItem onClick={() => handleOpenEditDialog(user)}>
          <Pencil className="h-4 w-4 mr-2" />
          Редактировать
        </DropdownMenuItem>
      )}
      {isAdmin && (
        <DropdownMenuItem onClick={() => handleOpenRoleDialog(user)}>
          <Shield className="h-4 w-4 mr-2" />
          Изменить роль
        </DropdownMenuItem>
      )}
      {isAdmin && (
        <DropdownMenuItem onClick={() => setCategoriesUser(user)}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Категории
        </DropdownMenuItem>
      )}
      {isAdmin && user.user_id !== currentUser?.id && (
        <DropdownMenuItem
          onClick={async () => {
            try {
              await toggleManageUsers.mutateAsync({ userId: user.user_id, canManageUsers: !user.can_manage_users });
              toast.success(user.can_manage_users ? "Право управления пользователями снято" : "Право управления пользователями выдано");
            } catch {
              toast.error("Ошибка при изменении прав");
            }
          }}
        >
          <UserCog className="h-4 w-4 mr-2" />
          {user.can_manage_users ? "Снять право создания" : "Разрешить создание пользователей"}
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={() => { setPasswordDialogUser(user); setResetNewPassword(""); }}>
        <KeyRound className="h-4 w-4 mr-2" />
        Сбросить пароль
      </DropdownMenuItem>
      {isAdmin && user.user_id !== currentUser?.id && (
        <DropdownMenuItem
          onClick={() => setDeleteDialogUser(user)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Удалить
        </DropdownMenuItem>
      )}
    </>
  );

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

        {/* Users Table */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <CardTitle>Пользователи</CardTitle>
              <div className="flex gap-2 flex-wrap">
                {isAdmin && (
                  <>
                    <Button variant="outline" onClick={async () => {
                      setExportingUsers(true);
                      try { await exportUsers(); toast.success("Файл пользователей скачан"); }
                      catch { toast.error("Ошибка экспорта"); }
                      finally { setExportingUsers(false); }
                    }} disabled={exportingUsers}>
                      {exportingUsers ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                      Экспорт
                    </Button>
                    <Button variant="outline" onClick={() => downloadImportTemplate()}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Шаблон
                    </Button>
                    <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Импорт
                    </Button>
                  </>
                )}
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить
                </Button>
              </div>
            </div>
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
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
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
                            <UserDropdownItems user={user} />
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
                          <UserDropdownItems user={user} />
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

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить пользователя</DialogTitle>
            <DialogDescription>Создайте новую учётную запись</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Имя *</label>
              <Input
                placeholder="Иванов Иван"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Пароль *</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Минимум 6 символов"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  title="Сгенерировать надёжный пароль"
                  onClick={() => {
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
                    const arr = new Uint8Array(12);
                    crypto.getRandomValues(arr);
                    let pwd = '';
                    for (const b of arr) pwd += chars[b % chars.length];
                    pwd = pwd.slice(0, 9) + 'A' + 'a' + '1';
                    setNewPassword(pwd);
                    setShowPassword(true);
                    navigator.clipboard.writeText(pwd).then(() => toast.success("Пароль сгенерирован и скопирован"));
                  }}
                >
                  <Dices className="h-4 w-4" />
                </Button>
                {newPassword && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    title="Скопировать пароль"
                    onClick={() => {
                      navigator.clipboard.writeText(newPassword).then(() => toast.success("Пароль скопирован"));
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Заглавные, строчные буквы и цифры обязательны</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Роль</label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Пользователь</SelectItem>
                  <SelectItem value="executor">Исполнитель</SelectItem>
                  {isAdmin && <SelectItem value="admin">Администратор</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateUser} disabled={createUser.isPending}>
              {createUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
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
            <Button variant="outline" onClick={() => setRoleDialogUser(null)}>Отмена</Button>
            <Button
              onClick={handleSaveRole}
              disabled={updateRole.isPending || selectedRole === roleDialogUser?.role}
            >
              {updateRole.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editDialogUser} onOpenChange={(open) => !open && setEditDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать пользователя</DialogTitle>
            <DialogDescription>Измените данные пользователя</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Имя</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogUser(null)}>Отмена</Button>
            <Button onClick={handleSaveEdit} disabled={updateProfile.isPending || (!editName || !editEmail)}>
              {updateProfile.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Categories Dialog */}
      <CategoryMembersForUserDialog
        userId={categoriesUser?.user_id || null}
        userName={categoriesUser?.name || ""}
        open={!!categoriesUser}
        onOpenChange={(open) => !open && setCategoriesUser(null)}
      />

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteDialogUser} onOpenChange={(open) => !open && setDeleteDialogUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить пользователя «{deleteDialogUser?.name}» ({deleteDialogUser?.email})? 
              Все данные пользователя будут удалены. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUser.isPending}
            >
              {deleteUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!passwordDialogUser} onOpenChange={(open) => !open && setPasswordDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сбросить пароль</DialogTitle>
            <DialogDescription>
              Установите новый пароль для пользователя «{passwordDialogUser?.name}»
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Новый пароль</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Минимум 6 символов"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Сгенерировать пароль"
                  onClick={() => {
                    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
                    let pwd = "";
                    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
                    setResetNewPassword(pwd);
                  }}
                >
                  <Dices className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Копировать"
                  disabled={!resetNewPassword}
                  onClick={() => {
                    navigator.clipboard.writeText(resetNewPassword);
                    toast.success("Пароль скопирован");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogUser(null)}>Отмена</Button>
            <Button
              onClick={async () => {
                if (!passwordDialogUser || !resetNewPassword) return;
                if (resetNewPassword.length < 6) {
                  toast.error("Пароль должен быть не менее 6 символов");
                  return;
                }
                try {
                  await resetPassword.mutateAsync({ userId: passwordDialogUser.user_id, newPassword: resetNewPassword });
                  toast.success(`Пароль пользователя ${passwordDialogUser.name} обновлён`);
                  setPasswordDialogUser(null);
                } catch (error: any) {
                  toast.error(error.message || "Ошибка при сбросе пароля");
                }
              }}
              disabled={resetPassword.isPending || resetNewPassword.length < 6}
            >
              {resetPassword.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Users Dialog */}
      <ImportUsersDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        existingUsers={users || []}
      />
    </Layout>
  );
}
