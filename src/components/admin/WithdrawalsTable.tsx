import { useState } from "react";
import { Check, X, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  withdrawal_method: string;
  withdrawal_details: string;
  created_at: string;
  worker: {
    full_name: string;
    email: string;
    phone: string;
  } | null;
}

interface WithdrawalsTableProps {
  withdrawals: Withdrawal[];
  onRefresh: () => void;
}

const WithdrawalsTable = ({ withdrawals, onRefresh }: WithdrawalsTableProps) => {
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [withdrawalToReject, setWithdrawalToReject] = useState<Withdrawal | null>(null);

  const handleApprove = async (withdrawal: Withdrawal) => {
    setProcessing(withdrawal.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("withdrawals")
        .update({ 
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq("id", withdrawal.id);

      if (error) throw error;

      // Get worker_id for notification
      const { data: withdrawalData } = await supabase
        .from("withdrawals")
        .select("worker_id")
        .eq("id", withdrawal.id)
        .single();

      if (withdrawalData) {
        await supabase.from("notifications").insert({
          user_id: withdrawalData.worker_id,
          title: "Saque Aprovado!",
          message: `Seu saque de ${withdrawal.amount} Kz foi aprovado e será processado em breve.`
        });
      }

      toast.success("Saque aprovado com sucesso!");
      onRefresh();
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      toast.error("Erro ao aprovar saque");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!withdrawalToReject || !rejectReason.trim()) {
      toast.error("Por favor, informe o motivo da rejeição");
      return;
    }

    setProcessing(withdrawalToReject.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("withdrawals")
        .update({ 
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          rejection_reason: rejectReason
        })
        .eq("id", withdrawalToReject.id);

      if (error) throw error;

      // Get worker_id for notification
      const { data: withdrawalData } = await supabase
        .from("withdrawals")
        .select("worker_id")
        .eq("id", withdrawalToReject.id)
        .single();

      if (withdrawalData) {
        await supabase.from("notifications").insert({
          user_id: withdrawalData.worker_id,
          title: "Saque Rejeitado",
          message: `Seu saque de ${withdrawalToReject.amount} Kz foi rejeitado. Motivo: ${rejectReason}`
        });
      }

      toast.success("Saque rejeitado");
      setShowRejectDialog(false);
      setRejectReason("");
      setWithdrawalToReject(null);
      onRefresh();
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      toast.error("Erro ao rejeitar saque");
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-AO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-AO", {
      style: "decimal",
      minimumFractionDigits: 0
    }).format(price) + " Kz";
  };

  const getMethodLabel = (method: string) => {
    return method === "iban" ? "IBAN Bancário" : "Multicaixa Express";
  };

  if (withdrawals.length === 0) {
    return (
      <div className="card-elevated p-8 text-center">
        <p className="text-muted-foreground">Nenhum saque pendente</p>
      </div>
    );
  }

  return (
    <>
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Trabalhador
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Valor
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Método
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Data
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {withdrawals.map((withdrawal) => (
                <tr key={withdrawal.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-foreground">{withdrawal.worker?.full_name || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">{withdrawal.worker?.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-semibold text-gold">{formatPrice(withdrawal.amount)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-foreground">{getMethodLabel(withdrawal.withdrawal_method)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-muted-foreground">{formatDate(withdrawal.created_at)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedWithdrawal(withdrawal)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleApprove(withdrawal)}
                        disabled={processing === withdrawal.id}
                        className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                        title="Aprovar"
                      >
                        {processing === withdrawal.id ? (
                          <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setWithdrawalToReject(withdrawal);
                          setShowRejectDialog(true);
                        }}
                        disabled={processing === withdrawal.id}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        title="Rejeitar"
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedWithdrawal} onOpenChange={() => setSelectedWithdrawal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Saque</DialogTitle>
            <DialogDescription>
              Informações para processamento do pagamento
            </DialogDescription>
          </DialogHeader>
          {selectedWithdrawal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedWithdrawal.worker?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{selectedWithdrawal.worker?.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-medium text-gold">{formatPrice(selectedWithdrawal.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Método</p>
                  <p className="font-medium">{getMethodLabel(selectedWithdrawal.withdrawal_method)}</p>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Dados para pagamento:</p>
                <p className="font-mono text-sm break-all">{selectedWithdrawal.withdrawal_details}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Saque</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Ex: Dados bancários inválidos..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={processing !== null}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rejeitar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WithdrawalsTable;
