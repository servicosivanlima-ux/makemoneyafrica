import { Bell, Menu } from "lucide-react";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  userName: string;
  pendingCount?: number;
}

const AdminHeader = ({ title, subtitle, userName, pendingCount = 0 }: AdminHeaderProps) => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <button className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors">
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <span className="font-semibold text-white text-sm">
                {userName[0]?.toUpperCase()}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="text-xs text-red-400">Administrador</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
