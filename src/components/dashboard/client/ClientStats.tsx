import { TrendingUp, Wallet, CheckCircle, Clock } from "lucide-react";

interface ClientStatsProps {
  activeCampaigns: number;
  totalSpent: number;
  completedTasks: number;
  pendingTasks: number;
}

const ClientStats = ({ activeCampaigns, totalSpent, completedTasks, pendingTasks }: ClientStatsProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-AO").format(price) + " Kz";
  };

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Campanhas Ativas</span>
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <div className="text-2xl font-bold text-foreground">{activeCampaigns}</div>
      </div>
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Total Gasto</span>
          <Wallet className="w-4 h-4 text-gold" />
        </div>
        <div className="text-2xl font-bold text-foreground">{formatPrice(totalSpent)}</div>
      </div>
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Tarefas Concluídas</span>
          <CheckCircle className="w-4 h-4 text-primary" />
        </div>
        <div className="text-2xl font-bold text-foreground">{completedTasks}</div>
      </div>
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Pendentes</span>
          <Clock className="w-4 h-4 text-gold" />
        </div>
        <div className="text-2xl font-bold text-foreground">{pendingTasks}</div>
      </div>
    </div>
  );
};

export default ClientStats;
