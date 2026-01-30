import { ReactNode } from "react";
import { DesktopSidebar } from "./DesktopSidebar";
import { MobileNav } from "./MobileNav";
import { Header } from "./Header";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showSearch?: boolean;
}

export function Layout({ children, title, showSearch = true }: LayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <DesktopSidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <Header title={title} showSearch={showSearch} />
        
        <main className="flex-1 pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}
