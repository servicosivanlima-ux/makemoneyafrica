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
  FileText,
  MessageSquare
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
    { icon: FileText, label: "Gestão", section: "campanhas" },
    { icon: CreditCard, label: "Pagamentos", section: "pagamentos" },
    { icon: Wallet, label: "Depósitos", section: "depositos" },
    { icon: Users, label: "Usuários", section: "usuarios" },
    { icon: Shield, label: "Verificações", section: "verificacoes" },
    { icon: Wallet, label: "Saques", section: "saques" },
    { icon: Shield, label: "Antifraude", section: "antifraude" },
    { icon: Bell, label: "Notificações", section: "notificacoes" },
    { icon: FileText, label: "Registros", section: "registros" },
    { icon: MessageSquare, label: "Chat & Moderação", section: "chat-moderacao" },
    { icon: Settings, label: "Configurações", section: "configuracoes" },
  ];

  const handleSectionClick = (section: string) => {
    if (onSectionChange) {
      onSectionChange(section);
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-background/40 backdrop-blur-2xl border-r border-white/5 hidden lg:block z-50 overflow-hidden">
      {/* Mesh Glow Background */}
      <div className="absolute top-0 -left-20 w-40 h-40 bg-primary/10 rounded-full blur-[80px]" />
      <div className="absolute bottom-40 -right-20 w-40 h-40 bg-gold/5 rounded-full blur-[80px]" />

      <div className="p-8 relative z-10">
        <div className="flex items-center gap-3 mb-10 group cursor-default">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-10 h-10 object-contain drop-shadow-neon group-hover:rotate-12 transition-transform duration-500"
          />
          <div>
            <span className="font-display font-black text-xl text-white tracking-tighter leading-none block">MMWL</span>
            <span className="text-[10px] font-black tracking-[0.3em] text-primary uppercase">Admin</span>
          </div>
        </div>

        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = activeSection === item.section;
            return (
              <button
                key={item.section}
                onClick={() => handleSectionClick(item.section)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative w-full text-left",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 shadow-neon shadow-primary/5"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white border border-transparent"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 transition-transform group-hover:scale-110",
                  isActive ? "text-primary" : "text-muted-foreground/60"
                )} />
                <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>

                {isActive && (
                  <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary shadow-neon" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-8 border-t border-white/5 bg-background/20">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-500 border border-transparent hover:border-red-500/20 transition-all group w-full"
        >
          <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="font-black text-xs uppercase tracking-widest">Encerrar Sessão</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
