import { Bell } from "lucide-react";

interface DashboardHeaderProps {
  userName: string;
  subtitle: string;
}

const DashboardHeader = ({ userName, subtitle }: DashboardHeaderProps) => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="flex items-center justify-between px-6 py-4 lg:pl-6 pl-16">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Olá, {userName}! 👋
          </h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          </button>
          
          <div className="w-9 h-9 rounded-full bg-gradient-lime flex items-center justify-center">
            <span className="font-semibold text-primary-foreground text-sm">
              {userName[0]?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
