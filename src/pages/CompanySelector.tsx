import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Loader2, Shield, CheckCircle, User as UserIcon } from "lucide-react";

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
  const { companies, setCurrentCompanyId, isLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && companies.length === 1) {
      setCurrentCompanyId(companies[0].company_id);
      navigate("/", { replace: true });
    }
  }, [companies, isLoading]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-bold">Нет доступных компаний</h1>
          <p className="text-muted-foreground">Обратитесь к администратору для получения доступа</p>
        </div>
      </div>
    );
  }

  const handleSelect = (companyId: string) => {
    setCurrentCompanyId(companyId);
    navigate("/", { replace: true });
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
        </div>
      </div>
    </div>
  );
}
