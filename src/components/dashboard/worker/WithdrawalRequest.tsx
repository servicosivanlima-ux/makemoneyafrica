import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Wallet, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface WithdrawalRequestProps {
  user: User;
  balance: number;
  onWithdrawalComplete: () => void;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  withdrawal_method: string;
  withdrawal_details: string;
  created_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

const WithdrawalRequest = ({ user, balance, onWithdrawalComplete }: WithdrawalRequestProps) => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"iban" | "multicaixa">("multicaixa");
  const [details, setDetails] = useState("");

  const MIN_WITHDRAWAL = 500;

  useEffect(() => {
    loadWithdrawals();
  }, [user.id]);

  const loadWithdrawals = async () => {
    try {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("worker_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setWithdrawals(data || []);
    } catch (error) {
      console.error("Error loading withdrawals:", error);
      toast.error("Erro ao carregar saques");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const amountNum = parseInt(amount);
    
    if (isNaN(amountNum) || amountNum < MIN_WITHDRAWAL) {
      toast.error(`O valor mínimo de saque é ${MIN_WITHDRAWAL} Kz`);
      return;
    }

    if (amountNum > balance) {
      toast.error("Saldo insuficiente");
      return;
    }

    if (!details.trim()) {
      toast.error(method === "iban" ? "Insira o IBAN" : "Insira o número Multicaixa Express");
      return;
    }

    // Check for pending withdrawal
    const hasPending = withdrawals.some(w => w.status === "pending");
    if (hasPending) {
      toast.error("Você já tem um saque pendente");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("withdrawals").insert({
        worker_id: user.id,
        amount: amountNum,
        withdrawal_method: method,
        withdrawal_details: details,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Solicitação de saque enviada!");
      setAmount("");
      setDetails("");
      setDialogOpen(false);
      loadWithdrawals();
      onWithdrawalComplete();
    } catch (error) {
      console.error("Error creating withdrawal:", error);
      toast.error("Erro ao solicitar saque");
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-AO").format(price) + " Kz";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-medium">
            <Clock className="w-3 h-3" />
            Pendente
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Aprovado
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Rejeitado
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-AO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canWithdraw = balance >= MIN_WITHDRAWAL && !withdrawals.some(w => w.status === "pending");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="card-glow p-6 border-gold/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="w-6 h-6 text-gold" />
              <h2 className="font-display font-bold text-lg text-foreground">
                Saldo Disponível
              </h2>
            </div>
            <div className="text-3xl font-bold text-gradient-gold">
              {formatPrice(balance)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Saque mínimo: {formatPrice(MIN_WITHDRAWAL)}
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button 
                className={canWithdraw ? "btn-gold" : "btn-secondary opacity-50"}
                disabled={!canWithdraw}
              >
                {balance < MIN_WITHDRAWAL 
                  ? "Saldo insuficiente" 
                  : withdrawals.some(w => w.status === "pending")
                  ? "Saque pendente"
                  : "Solicitar Saque"}
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Solicitar Saque</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Valor do Saque
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Mínimo ${MIN_WITHDRAWAL} Kz`}
                    min={MIN_WITHDRAWAL}
                    max={balance}
                    className="input-styled w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Disponível: {formatPrice(balance)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Método de Pagamento
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMethod("multicaixa")}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        method === "multicaixa"
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="font-medium text-foreground">Multicaixa Express</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod("iban")}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        method === "iban"
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="font-medium text-foreground">IBAN</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {method === "iban" ? "IBAN" : "Número Multicaixa Express"}
                  </label>
                  <input
                    type="text"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder={method === "iban" ? "AO06..." : "9XX XXX XXX"}
                    className="input-styled w-full"
                  />
                </div>

                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Os saques são processados manualmente e podem levar até 48 horas úteis.
                  </p>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-gold w-full"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-gold-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Confirmar Saque"
                  )}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Withdrawal History */}
      <div>
        <h2 className="font-display font-bold text-lg text-foreground mb-4">
          Histórico de Saques
        </h2>
        
        {withdrawals.length === 0 ? (
          <div className="card-elevated p-6 text-center">
            <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display font-bold text-foreground mb-2">
              Nenhum saque ainda
            </h3>
            <p className="text-sm text-muted-foreground">
              Complete tarefas para ganhar dinheiro e solicitar seu primeiro saque.
            </p>
          </div>
        ) : (
          <div className="card-elevated divide-y divide-border">
            {withdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-foreground">
                      {formatPrice(withdrawal.amount)}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      via {withdrawal.withdrawal_method === "iban" ? "IBAN" : "Multicaixa Express"}
                    </span>
                  </div>
                  {getStatusBadge(withdrawal.status)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Solicitado em {formatDate(withdrawal.created_at)}
                </p>
                {withdrawal.rejection_reason && (
                  <p className="text-xs text-destructive mt-1">
                    Motivo: {withdrawal.rejection_reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WithdrawalRequest;
