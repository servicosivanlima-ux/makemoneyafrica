import { TrendingUp, Wallet, CheckCircle, Clock } from "lucide-react";

interface ClientStatsProps {
  activeCampaigns: number;
  totalSpent: number;
  completedTasks: number;
  pendingTasks: number;
  totalTargetTasks: number;
  walletBalance: number;
}

const ClientStats = ({ activeCampaigns, totalSpent, completedTasks, pendingTasks, totalTargetTasks, walletBalance }: ClientStatsProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-AO").format(price) + " Kz";
  };

  const remainingTasks = Math.max(0, totalTargetTasks - completedTasks);

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
      <div className="card-premium-glow p-6 overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Campanhas Ativas</h3>
        </div>
        <p className="text-4xl font-black font-display text-white">{activeCampaigns}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-2 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Em Tempo Real
        </p>
      </div>

      <div className="card-premium-glow p-6 overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-gold/10 rounded-full blur-2xl group-hover:bg-gold/20 transition-all" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-gold/10 border border-gold/20 text-gold">
            <Wallet className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Saldo Carteira</h3>
        </div>
        <p className="text-4xl font-black font-display text-white">{formatPrice(walletBalance)}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-gold mt-2">Disponível</p>
      </div>

      <div className="card-premium-glow p-6 overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Total Gasto</h3>
        </div>
        <p className="text-4xl font-black font-display text-white">{formatPrice(totalSpent)}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-2">Investimento Total</p>
      </div>

      <div className="card-premium-glow p-6 overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Concluídas</h3>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-4xl font-black font-display text-white">{completedTasks}</p>
          {totalTargetTasks > 0 && (
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              / {totalTargetTasks}
            </span>
          )}
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-2">
          {remainingTasks > 0 ? `Faltam ${remainingTasks} seguidores` : "Meta Atingida"}
        </p>
      </div>

      <div className="card-premium-glow p-6 overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-gold/10 rounded-full blur-2xl group-hover:bg-gold/20 transition-all" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-gold/10 border border-gold/20 text-gold">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Pendentes</h3>
        </div>
        <p className="text-4xl font-black font-display text-white">{pendingTasks}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-gold mt-2">Aguardando Pagamento</p>
      </div>
    </div>
  );
};

export default ClientStats;
