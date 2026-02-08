import { Bell, Menu, CreditCard, CheckSquare, Wallet, PlusCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardStats {
  pendingPayments: number;
  pendingTasks: number;
  pendingWithdrawals: number;
  pendingDeposits: number;
}

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  userName: string;
  stats: DashboardStats;
  onNavigate: (section: string) => void;
  onToggleSidebar?: () => void;
}

const AdminHeader = ({ title, subtitle, userName, stats, onNavigate, onToggleSidebar }: AdminHeaderProps) => {
  const totalPending = stats.pendingPayments + stats.pendingTasks + stats.pendingWithdrawals + stats.pendingDeposits;

  return (
    <header className="border-b border-white/5 bg-background/40 backdrop-blur-xl sticky top-0 z-40 transition-all duration-300">
      <div className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95"
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-black text-white tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[10px] uppercase font-black tracking-[0.2em] text-primary mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all group active:scale-95 outline-none">
                <Bell className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                {totalPending > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-black rounded-full flex items-center justify-center shadow-neon ring-2 ring-background">
                    {totalPending > 9 ? "9+" : totalPending}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-zinc-950 border-white/10">
              <DropdownMenuLabel className="font-black uppercase tracking-widest text-xs text-muted-foreground">
                Alertas do Sistema
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />

              {totalPending === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Nenhuma pendência encontrada.
                </div>
              ) : (
                <>
                  {stats.pendingPayments > 0 && (
                    <DropdownMenuItem
                      onClick={() => onNavigate("pagamentos")}
                      className="cursor-pointer flex items-center justify-between group focus:bg-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Pagamentos</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                        {stats.pendingPayments}
                      </span>
                    </DropdownMenuItem>
                  )}

                  {stats.pendingDeposits > 0 && (
                    <DropdownMenuItem
                      onClick={() => onNavigate("depositos")}
                      className="cursor-pointer flex items-center justify-between group focus:bg-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <PlusCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">Depósitos</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-500 text-[10px] font-bold">
                        {stats.pendingDeposits}
                      </span>
                    </DropdownMenuItem>
                  )}

                  {stats.pendingTasks > 0 && (
                    <DropdownMenuItem
                      onClick={() => onNavigate("tarefas")}
                      className="cursor-pointer flex items-center justify-between group focus:bg-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium">Tarefas</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500 text-[10px] font-bold">
                        {stats.pendingTasks}
                      </span>
                    </DropdownMenuItem>
                  )}

                  {stats.pendingWithdrawals > 0 && (
                    <DropdownMenuItem
                      onClick={() => onNavigate("saques")}
                      className="cursor-pointer flex items-center justify-between group focus:bg-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">Saques</span>
                      </div>
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-bold">
                        {stats.pendingWithdrawals}
                      </span>
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-1.5 pr-4 rounded-2xl group cursor-pointer hover:bg-white/10 transition-all">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-green-400 flex items-center justify-center shadow-neon shadow-primary/20 transition-transform group-hover:scale-105">
              <span className="font-black text-primary-foreground text-sm">
                {userName[0]?.toUpperCase()}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-black text-white tracking-tight">{userName}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-primary leading-none mt-0.5">Administrador</p>
            </div>
          </div>
        </div>
      </div>
      {/* Bottom neon line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </header>
  );
};

export default AdminHeader;
