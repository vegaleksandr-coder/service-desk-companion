import { 
  Home, 
  ClipboardList, 
  PlusCircle, 
  BookOpen, 
  User,
  Settings,
  Users,
  BarChart3,
  LogOut,
  Building2
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { useIsCategoryAdmin } from "@/hooks/useIsCategoryAdmin";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const mainNavItems = [
  { path: '/', icon: Home, label: 'Главная' },
  { path: '/tickets', icon: ClipboardList, label: 'Заявки' },
  { path: '/tickets/new', icon: PlusCircle, label: 'Создать заявку' },
  { path: '/knowledge', icon: BookOpen, label: 'База знаний' },
];

const userNavItems = [
  { path: '/profile', icon: User, label: 'Мой профиль' },
  { path: '/dashboard', icon: BarChart3, label: 'Дашборд' },
  { path: '/executor', icon: ClipboardList, label: 'Мои задачи', roles: ['executor', 'admin'] as string[] },
];

const adminNavItems = [
  { path: '/admin/users', icon: Users, label: 'Пользователи' },
  { path: '/admin/categories', icon: ClipboardList, label: 'Категории' },
  { path: '/admin/settings', icon: Settings, label: 'Настройки' },
];

interface MobileMenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMenuSheet({ open, onOpenChange }: MobileMenuSheetProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, isGlobalAdmin, isChiefAdmin, signOut } = useAuth();
  const { data: categoryAdminData } = useIsCategoryAdmin();
  const isCategoryAdmin = categoryAdminData?.isCategoryAdmin || false;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const NavLink = ({ path, icon: Icon, label }: { path: string; icon: typeof Home; label: string }) => {
    const isActive = location.pathname === path || 
      (path !== '/' && location.pathname.startsWith(path));

    return (
      <Link
        to={path}
        onClick={() => onOpenChange(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
          "hover:bg-accent",
          isActive 
            ? "bg-accent text-accent-foreground font-medium" 
            : "text-muted-foreground"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-primary-foreground" />
            </div>
            ServiceDesk
          </SheetTitle>
        </SheetHeader>

        <div className="px-3 pt-2">
          <CompanySwitcher variant="mobile" />
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <span className="text-xs font-medium text-muted-foreground px-3 uppercase tracking-wider">
            Меню
          </span>
          {mainNavItems.map((item) => (
            <NavLink key={item.path} {...item} />
          ))}

          <Separator className="my-4" />

          <span className="text-xs font-medium text-muted-foreground px-3 uppercase tracking-wider">
            Личное
          </span>
          {userNavItems
            .filter((item) => !('roles' in item) || (role && (item as any).roles?.includes(role)))
            .map((item) => (
              <NavLink key={item.path} {...item} />
            ))}

          {(role === 'admin' || isGlobalAdmin || isChiefAdmin || profile?.can_manage_users) && (
            <>
              <Separator className="my-4" />
              <span className="text-xs font-medium text-muted-foreground px-3 uppercase tracking-wider">
                Администрирование
              </span>
              {(role === 'admin' || isGlobalAdmin || isChiefAdmin) ? (
                <>
                  {adminNavItems.map((item) => (
                    <NavLink key={item.path} {...item} />
                  ))}
                  {(isGlobalAdmin || isChiefAdmin) && (
                    <NavLink path="/admin/companies" icon={Building2} label="Компании" />
                  )}
                </>
              ) : (
                <NavLink path="/admin/users" icon={Users} label="Пользователи" />
              )}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-border mt-auto">
          <div className="flex items-center gap-3 p-2">
            <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.name || "Загрузка..."}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.email}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 shrink-0"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
