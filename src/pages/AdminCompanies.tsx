import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAllCompanies, CompanyWithUsers, CompanyUser } from "@/hooks/useAllCompanies";
import { useUpdateUserRole } from "@/hooks/useAdminUsers";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Building2, ChevronDown, ChevronRight, Loader2, MoreHorizontal,
  Pencil, Plus, Search, Shield, Trash2, Users, CheckCircle,
  User as UserIcon, KeyRound, Dices, Copy, Eye, EyeOff, FolderOpen, UserCog,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { UserRole, roleLabels } from "@/types/ticket";
import { useQueryClient } from "@tanstack/react-query";
import { CategoryMembersForUserDialog } from "@/components/CategoryMembersForUserDialog";

const roleColors: Record<UserRole, string> = {
  admin: "bg-priority-critical/10 text-priority-critical border-priority-critical/20",
  executor: "bg-priority-high/10 text-priority-high border-priority-high/20",
  user: "bg-muted text-muted-foreground border-border",
};

export default function AdminCompanies() {
  const { user: currentUser, refreshProfile } = useAuth();
  const { data: companies, isLoading, refetch } = useAllCompanies();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  // Company CRUD state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [creating, setCreating] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCompanyId, setEditCompanyId] = useState<string | null>(null);
  const [editCompanyName, setEditCompanyName] = useState("");
  const [updating, setUpdating] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCompany, setDeleteCompany] = useState<CompanyWithUsers | null>(null);
  const [deleting, setDeleting] = useState(false);

  // User management state
  const [roleDialogUser, setRoleDialogUser] = useState<{ user: CompanyUser; companyId: string } | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("user");
  const [updatingRole, setUpdatingRole] = useState(false);

  const [passwordDialogUser, setPasswordDialogUser] = useState<CompanyUser | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [addUserCompanyId, setAddUserCompanyId] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("user");
  const [showPassword, setShowPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  const [deleteUserDialog, setDeleteUserDialog] = useState<{ user: CompanyUser; companyId: string } | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const [categoriesUser, setCategoriesUser] = useState<{ userId: string; name: string } | null>(null);

  const toggleCompany = (id: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredCompanies = (companies || []).filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.users.some((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  });

  // Company actions
  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-company", {
        body: { name: newCompanyName.trim() },
      });
      if (error || data?.error) throw new Error(data?.error || "Ошибка");
      toast.success("Компания создана");
      setCreateDialogOpen(false);
      setNewCompanyName("");
      await Promise.all([refetch(), refreshProfile()]);
    } catch (e: any) {
      toast.error(e.message || "Не удалось создать компанию");
    } finally {
      setCreating(false);
    }
  };

  const handleEditCompany = async () => {
    if (!editCompanyId || !editCompanyName.trim()) return;
    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-company", {
        body: { id: editCompanyId, name: editCompanyName.trim() },
      });
      if (error || data?.error) throw new Error(data?.error || "Ошибка");
      toast.success("Компания обновлена");
      setEditDialogOpen(false);
      await Promise.all([refetch(), refreshProfile()]);
    } catch (e: any) {
      toast.error(e.message || "Не удалось обновить компанию");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!deleteCompany) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-company", {
        body: { id: deleteCompany.id },
      });
      if (error || data?.error) throw new Error(data?.error || "Ошибка");
      toast.success("Компания удалена");
      setDeleteDialogOpen(false);
      setDeleteCompany(null);
      await Promise.all([refetch(), refreshProfile()]);
    } catch (e: any) {
      toast.error(e.message || "Не удалось удалить компанию");
    } finally {
      setDeleting(false);
    }
  };

  // User actions
  const handleChangeRole = async () => {
    if (!roleDialogUser) return;
    setUpdatingRole(true);
    try {
      const { error } = await supabase
        .from("user_companies" as any)
        .update({ role: selectedRole })
        .eq("user_id", roleDialogUser.user.user_id)
        .eq("company_id", roleDialogUser.companyId);
      if (error) throw error;
      toast.success(`Роль обновлена на "${roleLabels[selectedRole]}"`);
      setRoleDialogUser(null);
      refetch();
    } catch {
      toast.error("Не удалось обновить роль");
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleResetPassword = async () => {
    if (!passwordDialogUser || !resetNewPassword) return;
    if (resetNewPassword.length < 6) {
      toast.error("Пароль должен быть не менее 6 символов");
      return;
    }
    setResettingPassword(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ userId: passwordDialogUser.user_id, newPassword: resetNewPassword }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка");
      }
      toast.success("Пароль обновлён");
      setPasswordDialogUser(null);
    } catch (e: any) {
      toast.error(e.message || "Ошибка сброса пароля");
    } finally {
      setResettingPassword(false);
    }
  };

  const handleAddUser = async () => {
    if (!newEmail || !newName || !newPassword || !addUserCompanyId) {
      toast.error("Заполните все поля");
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
            role: newRole,
            company_id: addUserCompanyId,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка");
      }
      toast.success(`Пользователь ${newName} добавлен`);
      setAddUserDialogOpen(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("user");
      setShowPassword(false);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Ошибка создания пользователя");
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserDialog) return;
    setDeletingUser(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ userId: deleteUserDialog.user.user_id }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка");
      }
      toast.success(`Пользователь удалён`);
      setDeleteUserDialog(null);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Ошибка удаления");
    } finally {
      setDeletingUser(false);
    }
  };

  if (isLoading) {
    return (
      <Layout title="Управление компаниями">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const totalUsers = (companies || []).reduce((sum, c) => sum + c.users.length, 0);

  return (
    <Layout title="Управление компаниями">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{(companies || []).length}</div>
              <p className="text-xs text-muted-foreground">Компаний</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">Пользователей</p>
            </CardContent>
          </Card>
        </div>

        {/* Search + Create */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по компании или пользователю..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Создать компанию
          </Button>
        </div>

        {/* Companies list */}
        <div className="space-y-4">
          {filteredCompanies.map((company) => {
            const isExpanded = expandedCompanies.has(company.id);
            const adminCount = company.users.filter((u) => u.role === "admin").length;
            const executorCount = company.users.filter((u) => u.role === "executor").length;
            const userCount = company.users.filter((u) => u.role === "user").length;

            return (
              <Card key={company.id}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleCompany(company.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{company.name}</CardTitle>
                            <div className="flex gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">
                                <Users className="h-3 w-3 inline mr-1" />
                                {company.users.length}
                              </span>
                              {adminCount > 0 && (
                                <span className="text-xs text-priority-critical">
                                  <Shield className="h-3 w-3 inline mr-1" />{adminCount}
                                </span>
                              )}
                              {executorCount > 0 && (
                                <span className="text-xs text-priority-high">
                                  <CheckCircle className="h-3 w-3 inline mr-1" />{executorCount}
                                </span>
                              )}
                              {userCount > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  <UserIcon className="h-3 w-3 inline mr-1" />{userCount}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditCompanyId(company.id);
                              setEditCompanyName(company.name);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteCompany(company);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="flex justify-end mb-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAddUserCompanyId(company.id);
                            setAddUserDialogOpen(true);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Добавить пользователя
                        </Button>
                      </div>

                      {company.users.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Нет пользователей
                        </p>
                      ) : (
                        <>
                          {/* Desktop table */}
                          <div className="hidden md:block rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Пользователь</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Роль</TableHead>
                                  <TableHead className="w-[50px]" />
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {company.users.map((user) => (
                                  <TableRow key={user.user_id}>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                          <span className="text-xs font-medium text-primary">
                                            {user.name.charAt(0).toUpperCase()}
                                          </span>
                                        </div>
                                        <span className="font-medium">{user.name}</span>
                                        {user.user_id === currentUser?.id && (
                                          <span className="text-xs text-muted-foreground">(вы)</span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={roleColors[user.role]}>
                                        {roleLabels[user.role]}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <UserActions user={user} companyId={company.id} />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Mobile cards */}
                          <div className="md:hidden space-y-2">
                            {company.users.map((user) => (
                              <div
                                key={user.user_id}
                                className="flex items-center justify-between p-3 rounded-lg border"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-medium text-primary">
                                      {user.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{user.name}</p>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className={`${roleColors[user.role]} text-xs`}>
                                        {roleLabels[user.role]}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <UserActions user={user} companyId={company.id} />
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">Компании не найдены</div>
        )}
      </div>

      {/* Create Company Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать компанию</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Название компании</Label>
              <Input
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Введите название"
                onKeyDown={(e) => e.key === "Enter" && handleCreateCompany()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleCreateCompany} disabled={creating || !newCompanyName.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать компанию</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Название компании</Label>
              <Input
                value={editCompanyName}
                onChange={(e) => setEditCompanyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEditCompany()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleEditCompany} disabled={updating || !editCompanyName.trim()}>
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Company Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить компанию «{deleteCompany?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Будут удалены все данные: заявки, категории, FAQ, инструкции и привязки пользователей. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCompany}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Role Dialog */}
      <Dialog open={!!roleDialogUser} onOpenChange={(open) => !open && setRoleDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить роль</DialogTitle>
            <DialogDescription>
              Выберите роль для <span className="font-medium text-foreground">{roleDialogUser?.user.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {(["admin", "executor", "user"] as UserRole[]).map((r) => {
              const isSelected = selectedRole === r;
              const icons = { admin: Shield, executor: CheckCircle, user: UserIcon };
              const Icon = icons[r];
              return (
                <button
                  key={r}
                  onClick={() => setSelectedRole(r)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-left">
                    <div className={`font-medium ${isSelected ? "text-primary" : ""}`}>{roleLabels[r]}</div>
                    <div className="text-xs text-muted-foreground">
                      {r === "admin" && "Полный доступ к компании"}
                      {r === "executor" && "Может обрабатывать заявки"}
                      {r === "user" && "Может создавать заявки"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogUser(null)}>Отмена</Button>
            <Button
              onClick={handleChangeRole}
              disabled={updatingRole || selectedRole === roleDialogUser?.user.role}
            >
              {updatingRole && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!passwordDialogUser} onOpenChange={(open) => !open && setPasswordDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Сбросить пароль</DialogTitle>
            <DialogDescription>
              Новый пароль для «{passwordDialogUser?.name}»
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Минимум 6 символов"
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
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
                variant="outline"
                size="icon"
                disabled={!resetNewPassword}
                onClick={() => {
                  navigator.clipboard.writeText(resetNewPassword);
                  toast.success("Скопировано");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogUser(null)}>Отмена</Button>
            <Button
              onClick={handleResetPassword}
              disabled={resettingPassword || resetNewPassword.length < 6}
            >
              {resettingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User to Company Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить пользователя</DialogTitle>
            <DialogDescription>Создайте или добавьте пользователя в компанию</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Имя *</Label>
              <Input placeholder="Иванов Иван" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" placeholder="user@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Пароль *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Минимум 8 символов"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";
                    const arr = new Uint8Array(12);
                    crypto.getRandomValues(arr);
                    let pwd = "";
                    for (const b of arr) pwd += chars[b % chars.length];
                    pwd = pwd.slice(0, 9) + "A" + "a" + "1";
                    setNewPassword(pwd);
                    setShowPassword(true);
                    navigator.clipboard.writeText(pwd).then(() => toast.success("Пароль сгенерирован и скопирован"));
                  }}
                >
                  <Dices className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Заглавные, строчные буквы и цифры обязательны</p>
            </div>
            <div className="space-y-2">
              <Label>Роль</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Пользователь</SelectItem>
                  <SelectItem value="executor">Исполнитель</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleAddUser} disabled={creatingUser}>
              {creatingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteUserDialog} onOpenChange={(open) => !open && setDeleteUserDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить пользователя?</AlertDialogTitle>
            <AlertDialogDescription>
              Пользователь «{deleteUserDialog?.user.name}» будет удалён из системы. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deletingUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Categories Dialog */}
      <CategoryMembersForUserDialog
        userId={categoriesUser?.userId || null}
        userName={categoriesUser?.name || ""}
        open={!!categoriesUser}
        onOpenChange={(open) => !open && setCategoriesUser(null)}
      />
    </Layout>
  );

  function UserActions({ user, companyId }: { user: CompanyUser; companyId: string }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setRoleDialogUser({ user, companyId });
              setSelectedRole(user.role);
            }}
          >
            <Shield className="h-4 w-4 mr-2" />
            Изменить роль
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setCategoriesUser({ userId: user.user_id, name: user.name })}
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            Категории
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setPasswordDialogUser(user);
              setResetNewPassword("");
            }}
          >
            <KeyRound className="h-4 w-4 mr-2" />
            Сбросить пароль
          </DropdownMenuItem>
          {user.user_id !== currentUser?.id && (
            <DropdownMenuItem
              onClick={() => setDeleteUserDialog({ user, companyId })}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
}
