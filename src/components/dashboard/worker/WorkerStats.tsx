import { Wallet, Clock, CheckCircle, TrendingUp } from "lucide-react";

interface WorkerStatsProps {
  balance: number;
  availableTasks: number;
  completedTasks: number;
  totalEarned: number;
}

const WorkerStats = ({ balance, availableTasks, completedTasks, totalEarned }: WorkerStatsProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-AO").format(price) + " Kz";
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      <div className="card-premium-glow p-6 overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-gold/10 rounded-full blur-2xl group-hover:bg-gold/20 transition-all" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-gold/10 border border-gold/20 text-gold">
            <Wallet className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Saldo Disponível</h3>
        </div>
        <p className="text-4xl font-black font-display text-white">{formatPrice(balance)}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-gold mt-2">Pronto para Levantamento</p>
      </div>

      <div className="card-premium-glow p-6 overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Disponíveis</h3>
        </div>
        <p className="text-4xl font-black font-display text-white">{availableTasks}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-2">Novas Oportunidades</p>
      </div>

      <div className="card-premium-glow p-6 overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Concluídas</h3>
        </div>
        <p className="text-4xl font-black font-display text-white">{completedTasks}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-2">Trabalhos Realizados</p>
      </div>

      <div className="card-premium-glow p-6 overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all" />
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground whitespace-nowrap">Total Ganho</h3>
        </div>
        <p className="text-4xl font-black font-display text-white">{formatPrice(totalEarned)}</p>
        <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-2">Carreira MMWL</p>
      </div>
    </div>
  );
};

export default WorkerStats;
