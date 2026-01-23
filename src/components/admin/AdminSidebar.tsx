import { useState } from "react";
import { 
  LayoutDashboard, 
  CreditCard, 
  Users, 
  CheckSquare, 
  Wallet, 
  Shield, 
  Bell,
  LogOut,
  Settings,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  onLogout: () => void;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
}

const AdminSidebar = ({ onLogout, activeSection = "dashboard", onSectionChange }: AdminSidebarProps) => {
  const menuItems = [
    { icon: LayoutDashboard, label: "Painel", section: "dashboard" },
    { icon: CreditCard, label: "Pagamentos", section: "pagamentos" },
    { icon: CheckSquare, label: "Tarefas", section: "tarefas" },
    { icon: Users, label: "Usuários", section: "usuarios" },
    { icon: Wallet, label: "Saques", section: "saques" },
    { icon: Shield, label: "Antifraude", section: "antifraude" },
    { icon: Bell, label: "Notificações", section: "notificacoes" },
    { icon: FileText, label: "Registros", section: "registros" },
    { icon: Settings, label: "Configurações", section: "configuracoes" },
  ];

  const handleSectionClick = (section: string) => {
    if (onSectionChange) {
      onSectionChange(section);
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border hidden lg:block z-50">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-display font-bold text-lg text-foreground block">MMWL</span>
            <span className="text-xs text-red-400 font-medium">ADMIN</span>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.section}
              onClick={() => handleSectionClick(item.section)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted transition-colors w-full text-left",
                activeSection === item.section && "bg-primary/10 text-primary"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
