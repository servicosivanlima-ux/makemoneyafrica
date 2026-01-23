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

interface Campaign {
  id: string;
  client_id: string;
  plan_name: string;
  platform: string;
  price: number;
  status: string;
  page_link: string;
  created_at: string;
  client: {
    full_name: string;
    email: string;
    phone: string;
  } | null;
}

interface PaymentsTableProps {
  campaigns: Campaign[];
  onRefresh: () => void;
}

const PaymentsTable = ({ campaigns, onRefresh }: PaymentsTableProps) => {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const handleApprove = async (campaignId: string) => {
    setProcessing(campaignId);
    try {
      // Use secure server-side function
      const { error } = await supabase.rpc('admin_approve_campaign', {
        p_campaign_id: campaignId
      });

      if (error) throw error;

      // Find campaign for notification
      const campaign = campaigns.find(c => c.id === campaignId);
      if (campaign?.client_id) {
        await supabase.from("notifications").insert({
          user_id: campaign.client_id,
          title: "Pagamento Aprovado!",
          message: `Seu pagamento para a campanha "${campaign.plan_name}" foi aprovado. A campanha está agora ativa!`
        });
      }

      toast.success("Pagamento aprovado com sucesso!");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao aprovar pagamento");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (campaignId: string) => {
    setProcessing(campaignId);
    try {
      // Use secure server-side function
      const { error } = await supabase.rpc('admin_reject_campaign', {
        p_campaign_id: campaignId
      });

      if (error) throw error;

      // Find campaign for notification
      const campaign = campaigns.find(c => c.id === campaignId);
      if (campaign?.client_id) {
        await supabase.from("notifications").insert({
          user_id: campaign.client_id,
          title: "Pagamento Rejeitado",
          message: `Seu pagamento para a campanha "${campaign.plan_name}" foi rejeitado. Entre em contato para mais informações.`
        });
      }

      toast.success("Pagamento rejeitado");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao rejeitar pagamento");
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

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      facebook: "bg-blue-500/10 text-blue-500",
      instagram: "bg-pink-500/10 text-pink-500",
      tiktok: "bg-slate-500/10 text-slate-400",
      youtube: "bg-red-500/10 text-red-500"
    };
    return colors[platform] || "bg-muted text-muted-foreground";
  };

  if (campaigns.length === 0) {
    return (
      <div className="card-elevated p-8 text-center">
        <p className="text-muted-foreground">Nenhum pagamento pendente</p>
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
                  Cliente
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Plano
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Plataforma
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Valor
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
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-foreground">{campaign.client?.full_name || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">{campaign.client?.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-medium text-foreground">{campaign.plan_name}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPlatformColor(campaign.platform)}`}>
                      {campaign.platform}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-semibold text-gold">{formatPrice(campaign.price)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-muted-foreground">{formatDate(campaign.created_at)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedCampaign(campaign)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleApprove(campaign.id)}
                        disabled={processing === campaign.id}
                        className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                        title="Aprovar"
                      >
                        {processing === campaign.id ? (
                          <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(campaign.id)}
                        disabled={processing === campaign.id}
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

      <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Campanha</DialogTitle>
            <DialogDescription>
              Informações completas sobre a campanha
            </DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{selectedCampaign.client?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedCampaign.client?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{selectedCampaign.client?.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plano</p>
                  <p className="font-medium">{selectedCampaign.plan_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="font-medium text-gold">{formatPrice(selectedCampaign.price)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plataforma</p>
                  <p className="font-medium capitalize">{selectedCampaign.platform}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Link da Página</p>
                <a 
                  href={selectedCampaign.page_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {selectedCampaign.page_link}
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PaymentsTable;
