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
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Saldo Disponível</span>
          <Wallet className="w-4 h-4 text-gold" />
        </div>
        <div className="text-2xl font-bold text-gradient-gold">{formatPrice(balance)}</div>
      </div>
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">Tarefas Disponíveis</span>
          <Clock className="w-4 h-4 text-primary" />
        </div>
        <div className="text-2xl font-bold text-foreground">{availableTasks}</div>
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
          <span className="text-sm text-muted-foreground">Total Ganho</span>
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <div className="text-2xl font-bold text-foreground">{formatPrice(totalEarned)}</div>
      </div>
    </div>
  );
};

export default WorkerStats;
