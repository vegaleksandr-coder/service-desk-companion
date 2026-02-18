import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Building2, Loader2, Shield, CheckCircle, User as UserIcon, Plus, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const roleLabels: Record<string, string> = {
  admin: "Администратор",
  executor: "Исполнитель",
  user: "Пользователь",
};

const roleIcons: Record<string, typeof Shield> = {
  admin: Shield,
  executor: CheckCircle,
  user: UserIcon,
};

export default function CompanySelector() {
  const { companies, setCurrentCompanyId, isLoading, user, isGlobalAdmin, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isLoading && companies.length === 1 && !isGlobalAdmin) {
      setCurrentCompanyId(companies[0].company_id);
      navigate("/", { replace: true });
    }
  }, [companies, isLoading, isGlobalAdmin]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (companies.length === 0 && !isGlobalAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-bold">Нет доступных компаний</h1>
          <p className="text-muted-foreground">Обратитесь к администратору для получения доступа</p>
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>
      </div>
    );
  }

  const handleSelect = (companyId: string) => {
    setCurrentCompanyId(companyId);
    navigate("/", { replace: true });
  };

  const handleCreateCompany = async () => {
    if (!companyName.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-company", {
        body: { name: companyName.trim() },
      });
      if (error || data?.error) {
        toast({ title: "Ошибка", description: data?.error || "Не удалось создать компанию", variant: "destructive" });
      } else {
        toast({ title: "Компания создана" });
        setDialogOpen(false);
        setCompanyName("");
        await refreshProfile();
      }
    } catch {
      toast({ title: "Ошибка", description: "Не удалось создать компанию", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Выберите компанию</h1>
          <p className="text-muted-foreground">Выберите компанию для работы в системе</p>
        </div>
        <div className="space-y-3">
          {companies.map((company) => {
            const RoleIcon = roleIcons[company.role] || UserIcon;
            return (
              <Card
                key={company.company_id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleSelect(company.company_id)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{company.company_name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <RoleIcon className="h-3 w-3" />
                      {roleLabels[company.role] || company.role}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {isGlobalAdmin && (
            <Button
              variant="outline"
              className="w-full h-14 border-dashed"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              Создать компанию
            </Button>
          )}
        </div>

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="h-4 w-4 mr-2" />
            Выйти
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать компанию</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="company-name">Название компании</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Введите название"
                onKeyDown={(e) => e.key === "Enter" && handleCreateCompany()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateCompany} disabled={creating || !companyName.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
