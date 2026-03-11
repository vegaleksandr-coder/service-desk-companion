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
  ChevronLeft,
  ChevronRight,
  Building2
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { useIsCategoryAdmin } from "@/hooks/useIsCategoryAdmin";

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

export function DesktopSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
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
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
          "hover:bg-sidebar-accent",
          isActive 
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
            : "text-sidebar-foreground/80"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  return (
    <aside className={cn(
      "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border h-screen sticky top-0 transition-all duration-300",
      collapsed ? "w-[72px]" : "w-[260px]"
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">ServiceDesk</span>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center mx-auto">
            <ClipboardList className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "hidden"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 mx-auto mt-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => setCollapsed(false)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Company switcher */}
      <div className="px-3 pt-2">
        <CompanySwitcher collapsed={collapsed} variant="sidebar" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Main navigation */}
        <div className="space-y-1">
          {!collapsed && (
            <span className="text-xs font-medium text-sidebar-foreground/50 px-3 uppercase tracking-wider">
              Меню
            </span>
          )}
          {mainNavItems.map((item) => (
            <NavLink key={item.path} {...item} />
          ))}
        </div>

        <Separator className="my-4 bg-sidebar-border" />

        {/* User navigation */}
        <div className="space-y-1">
          {!collapsed && (
            <span className="text-xs font-medium text-sidebar-foreground/50 px-3 uppercase tracking-wider">
              Личное
            </span>
          )}
          {userNavItems
            .filter((item) => !('roles' in item) || (role && (item as any).roles?.includes(role)))
            .map((item) => (
            <NavLink key={item.path} {...item} />
          ))}
        </div>

        {/* Admin navigation */}
        {(role === 'admin' || isGlobalAdmin || isChiefAdmin || profile?.can_manage_users || isCategoryAdmin) && (
          <>
            <Separator className="my-4 bg-sidebar-border" />
            <div className="space-y-1">
              {!collapsed && (
                <span className="text-xs font-medium text-sidebar-foreground/50 px-3 uppercase tracking-wider">
                  Администрирование
                </span>
              )}
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
                <>
                  {profile?.can_manage_users && (
                    <NavLink path="/admin/users" icon={Users} label="Пользователи" />
                  )}
                  {isCategoryAdmin && (
                    <NavLink path="/admin/categories" icon={ClipboardList} label="Категории" />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </nav>

      {/* User profile footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors cursor-pointer",
          collapsed && "justify-center"
        )}>
          <div className="h-9 w-9 rounded-full bg-sidebar-primary flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile?.name || "Загрузка..."}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {profile?.email}
              </p>
            </div>
          )}
          {!collapsed && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
