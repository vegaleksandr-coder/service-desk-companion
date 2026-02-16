import { useAuth } from "@/contexts/AuthContext";
import { Building2, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CompanySwitcherProps {
  collapsed?: boolean;
  variant?: "header" | "sidebar" | "mobile";
}

export function CompanySwitcher({ collapsed = false, variant = "header" }: CompanySwitcherProps) {
  const { companies, currentCompanyId, currentCompanyName, setCurrentCompanyId } = useAuth();

  if (companies.length <= 1) return null;

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Building2 className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="bg-popover z-50">
          {companies.map((company) => (
            <DropdownMenuItem
              key={company.company_id}
              onClick={() => setCurrentCompanyId(company.company_id)}
              className="gap-2"
            >
              {company.company_id === currentCompanyId && <Check className="h-3 w-3" />}
              <span className={cn(company.company_id !== currentCompanyId && "ml-5")}>
                {company.company_name}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "gap-2 h-auto py-1.5 px-2 text-left justify-start max-w-full",
            variant === "sidebar" && "w-full text-sidebar-foreground hover:bg-sidebar-accent",
            variant === "mobile" && "w-full",
          )}
        >
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate text-sm font-medium">{currentCompanyName || "Компания"}</span>
          <ChevronDown className="h-3 w-3 shrink-0 ml-auto opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px] bg-popover z-50">
        {companies.map((company) => (
          <DropdownMenuItem
            key={company.company_id}
            onClick={() => setCurrentCompanyId(company.company_id)}
            className="gap-2"
          >
            {company.company_id === currentCompanyId && <Check className="h-3 w-3" />}
            <span className={cn("truncate", company.company_id !== currentCompanyId && "ml-5")}>
              {company.company_name}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
