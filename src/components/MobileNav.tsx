import { 
  Home, 
  ClipboardList, 
  PlusCircle, 
  BookOpen, 
  User 
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { path: '/', icon: Home, label: 'Главная' },
  { path: '/tickets', icon: ClipboardList, label: 'Заявки' },
  { path: '/tickets/new', icon: PlusCircle, label: 'Создать' },
  { path: '/knowledge', icon: BookOpen, label: 'База знаний' },
  { path: '/profile', icon: User, label: 'Профиль' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-inset md:hidden z-50">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "mobile-nav-item flex-1",
                isActive && "active"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 mb-1 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-[10px] font-medium",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
