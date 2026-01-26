import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LayoutDashboard, Bell, LogOut, Plus, Wallet, CheckCircle, Settings, Menu, X } from "lucide-react";
import { useState } from "react";
interface DashboardSidebarProps {
  userType: "client" | "worker";
  activeSection: string;
  onSectionChange: (section: string) => void;
}
const DashboardSidebar = ({
  userType,
  activeSection,
  onSectionChange
}: DashboardSidebarProps) => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate("/");
  };
  const menuItems = userType === "client" ? [{
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard
  }, {
    id: "criar-campanha",
    label: "Criar Campanha",
    icon: Plus
  }, {
    id: "notificacoes",
    label: "Notificações",
    icon: Bell
  }, {
    id: "configuracoes",
    label: "Configurações",
    icon: Settings
  }] : [{
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard
  }, {
    id: "tarefas",
    label: "Tarefas",
    icon: CheckCircle
  }, {
    id: "saques",
    label: "Saques",
    icon: Wallet
  }, {
    id: "notificacoes",
    label: "Notificações",
    icon: Bell
  }, {
    id: "configuracoes",
    label: "Configurações",
    icon: Settings
  }];
  const SidebarContent = () => <>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-lg bg-gradient-lime flex items-center justify-center">
            <span className="font-display font-bold text-primary-foreground">M</span>
          </div>
          <span className="font-display font-bold text-lg text-foreground">MakeMoney</span>
        </div>

        <nav className="space-y-1">
          {menuItems.map(item => <button key={item.id} onClick={() => {
          onSectionChange(item.id);
          setMobileOpen(false);
        }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeSection === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>)}
        </nav>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border">
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full">
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </div>
    </>;
  return <>
      {/* Mobile menu button */}
      <button onClick={() => setMobileOpen(true)} className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border">
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />}

      {/* Mobile sidebar */}
      <aside className={`lg:hidden fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-50 transform transition-transform ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted">
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border hidden lg:block">
        <SidebarContent />
      </aside>
    </>;
};
export default DashboardSidebar;