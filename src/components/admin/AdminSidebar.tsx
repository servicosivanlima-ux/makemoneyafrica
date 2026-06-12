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
  MessageSquare,
  UserPlus,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  onLogout: () => void;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  stats?: {
    pendingPayments: number;
    pendingTasks: number;
    pendingWithdrawals: number;
    pendingDeposits: number;
    pendingKyc: number;
  };
}

const AdminSidebar = ({
  onLogout,
  activeSection = "dashboard",
  onSectionChange,
  isOpen,
  onClose,
  stats
}: AdminSidebarProps) => {
  const menuItems = [
    { icon: LayoutDashboard, label: "Painel", section: "dashboard" },
    { icon: FileText, label: "Gestão", section: "campanhas", count: stats?.pendingPayments },
    { icon: CreditCard, label: "Pagamentos", section: "pagamentos", count: stats?.pendingPayments },
    { icon: Wallet, label: "Depósitos", section: "depositos", count: stats?.pendingDeposits },
    { icon: Users, label: "Utilizadores", section: "usuarios" },
    { icon: UserPlus, label: "Indicações", section: "indicacoes" },
    { icon: CheckSquare, label: "Tarefas", section: "tarefas", count: stats?.pendingTasks },
    { icon: Shield, label: "Verificações", section: "verificacoes", count: stats?.pendingKyc },
    { icon: Wallet, label: "Levantamentos", section: "saques", count: stats?.pendingWithdrawals },
    { icon: Shield, label: "Antifraude", section: "antifraude" },
    { icon: Bell, label: "Notificações", section: "notificacoes" },
    { icon: FileText, label: "Registos", section: "registros" },
    { icon: MessageSquare, label: "Chat & Moderação", section: "chat-moderacao" },
    { icon: Settings, label: "Configurações", section: "configuracoes" },
  ];

  const handleSectionClick = (section: string) => {
    if (onSectionChange) {
      onSectionChange(section);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-full w-72 bg-background/60 backdrop-blur-3xl border-r border-white/5 z-50 overflow-hidden transition-transform duration-500 ease-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Mesh Glow Background */}
        <div className="absolute top-0 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-40 -right-20 w-40 h-40 bg-gold/10 rounded-full blur-[80px]" />

        <div className="p-8 h-full flex flex-col relative z-10">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3 group cursor-default">
              <img
                src="/logo.png"
                alt="+Kumbú"
                className="w-10 h-10 object-contain group-hover:rotate-12 transition-transform duration-500"
              />
              <div>
                <span className="font-display font-black text-2xl text-white tracking-tighter leading-none block">+K</span>
                <span className="text-[10px] font-black tracking-[0.3em] text-primary uppercase">Kumbú Admin</span>
              </div>
            </div>
            <button onClick={onClose} className="lg:hidden p-2 rounded-xl bg-white/5 text-muted-foreground hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-1.5 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {menuItems.map((item) => {
              const isActive = activeSection === item.section;
              return (
                <button
                  key={item.section}
                  onClick={() => handleSectionClick(item.section)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative w-full text-left",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20 shadow-neon shadow-primary/5"
                      : "text-muted-foreground/80 hover:bg-white/5 hover:text-white border border-transparent"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-transform group-hover:scale-110",
                    isActive ? "text-primary" : "text-muted-foreground/40"
                  )} />
                  <span className="font-black text-xs uppercase tracking-[0.15em] flex-1">{item.label}</span>

                  {item.count !== undefined && item.count > 0 && (
                    <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black shadow-neon">
                      {item.count}
                    </span>
                  )}

                  {isActive && (
                    <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-primary shadow-neon" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
            <button
              onClick={onLogout}
              className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-muted-foreground/80 hover:bg-red-500/10 hover:text-red-500 border border-transparent hover:border-red-500/20 transition-all group w-full"
            >
              <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              <span className="font-black text-xs uppercase tracking-[0.15em]">Encerrar Sessão</span>
            </button>

            <div className="flex items-center justify-center gap-2 group cursor-default pt-2">
              <span className="text-[8px] text-muted-foreground uppercase tracking-widest font-black">Developed by</span>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/5 group-hover:border-primary/20 transition-colors">
                <img src="/bytekwanza-logo.png" alt="ByteKwanza" className="h-3 w-auto object-contain" />
                <span className="text-[8px] font-black tracking-tight text-white">ByteKwanza</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
