import { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { parseUsersExcel, type ImportUserRow } from "@/utils/excelExport";
import { useCreateUser } from "@/hooks/useAdminUsers";
import { useAuth } from "@/contexts/AuthContext";
import type { AdminUser } from "@/hooks/useAdminUsers";

interface ImportUsersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingUsers: AdminUser[];
}

export function ImportUsersDialog({ open, onOpenChange, existingUsers }: ImportUsersDialogProps) {
  const [parsedUsers, setParsedUsers] = useState<ImportUserRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const createUser = useCreateUser();
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const users = await parseUsersExcel(file);
      setParsedUsers(users);
    } catch {
      toast.error("Не удалось прочитать файл");
    }
  };

  const newUsers = parsedUsers.filter((u) => !existingEmails.has(u.email.toLowerCase()));
  const skippedUsers = parsedUsers.filter((u) => existingEmails.has(u.email.toLowerCase()));
  const usersWithoutPassword = newUsers.filter((u) => !u.password || u.password.length < 6);

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";
    const arr = new Uint8Array(12);
    crypto.getRandomValues(arr);
    let pwd = "";
    for (const b of arr) pwd += chars[b % chars.length];
    return pwd.slice(0, 9) + "A1a";
  };

  const handleImport = async () => {
    const toImport = newUsers.map((u) => ({
      ...u,
      password: u.password && u.password.length >= 6 ? u.password : generatePassword(),
      role: !isAdmin && u.role === "admin" ? "user" : u.role,
    }));

    if (toImport.length === 0) {
      toast.info("Нет новых пользователей для импорта");
      return;
    }

    setImporting(true);
    let created = 0;
    let failed = 0;

    for (const user of toImport) {
      try {
        await createUser.mutateAsync({
          email: user.email,
          password: user.password,
          name: user.name || user.email.split("@")[0],
          role: user.role as any,
        });
        created++;
      } catch {
        failed++;
      }
    }

    setImporting(false);
    toast.success(`Импорт завершён: создано ${created}, ошибок ${failed}, пропущено ${skippedUsers.length}`);
    setParsedUsers([]);
    setFileName("");
    onOpenChange(false);
  };

  const roleLabels: Record<string, string> = {
    admin: "Администратор",
    executor: "Исполнитель",
    user: "Пользователь",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!importing) { onOpenChange(v); setParsedUsers([]); setFileName(""); } }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Импорт пользователей
          </DialogTitle>
          <DialogDescription>
            Загрузите Excel файл с колонками: Имя, Email, Роль, Пароль. Существующие пользователи будут пропущены.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {fileName || "Выберите файл Excel"}
          </Button>

          {parsedUsers.length > 0 && (
            <>
              <div className="flex gap-3 text-sm">
                <span className="text-muted-foreground">Всего: <strong>{parsedUsers.length}</strong></span>
                <span className="text-green-600">Новых: <strong>{newUsers.length}</strong></span>
                {skippedUsers.length > 0 && (
                  <span className="text-yellow-600">Пропущено: <strong>{skippedUsers.length}</strong></span>
                )}
              </div>

              {usersWithoutPassword.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>У {usersWithoutPassword.length} пользователей нет пароля — будет сгенерирован автоматически</span>
                </div>
              )}

              <div className="rounded-md border max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedUsers.map((user, i) => {
                      const isDuplicate = existingEmails.has(user.email.toLowerCase());
                      return (
                        <TableRow key={i} className={isDuplicate ? "opacity-50" : ""}>
                          <TableCell>{user.name || "—"}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{roleLabels[user.role] || user.role}</TableCell>
                          <TableCell>
                            {isDuplicate ? (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-300">Пропущен</Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600 border-green-300">Новый</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>Отмена</Button>
          <Button onClick={handleImport} disabled={importing || newUsers.length === 0}>
            {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Импортировать ({newUsers.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
