import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Plus, AlertCircle, CheckCircle, Clock, XCircle, MessageCircle, CreditCard, Building2, Smartphone, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import CountdownTimer from "../common/CountdownTimer";

interface ClientCampaignsProps {
  user: User;
  onCreateCampaign: () => void;
}
interface Campaign {
  id: string;
  plan_type: string;
  plan_name: string;
  platform: string;
  page_link: string;
  target_count: number;
  completed_count: number;
  price: number;
  status: string;
  created_at: string;
  scheduled_deletion_at?: string | null;
}
const ClientCampaigns = ({
  user,
  onCreateCampaign
}: ClientCampaignsProps) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    loadCampaigns();
  }, [user.id]);
  const loadCampaigns = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from("campaigns").select("*").eq("client_id", user.id).order("created_at", {
        ascending: false
      });
      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Error loading campaigns:", error);
      toast.error("Erro ao carregar campanhas");
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (id: string) => {
    try {
      const {
        error
      } = await supabase.rpc("delete_item_immediately", {
        p_item_id: id,
        p_type: "campaign"
      });
      if (error) throw error;
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error("Error deleting campaign:", error);
    }
  };
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-AO").format(price) + " Kz";
  };
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_payment":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-medium">
          <Clock className="w-3 h-3" />
          Aguardando Pagamento
        </span>;
      case "active":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <CheckCircle className="w-3 h-3" />
          Activa
        </span>;
      case "completed":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
          <CheckCircle className="w-3 h-3" />
          Concluída
        </span>;
      case "cancelled":
        return <div className="flex flex-col gap-1 items-start">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Cancelada
          </span>
        </div>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
          {status}
        </span>;
    }
  };
  const getPlatformEmoji = (platform: string) => {
    switch (platform) {
      case "facebook":
        return "📘";
      case "instagram":
        return "📸";
      case "tiktok":
        return "🎵";
      case "youtube":
        return "🎬";
      default:
        return "📱";
    }
  };
  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }
  if (campaigns.length === 0) {
    return <div className="grid md:grid-cols-2 gap-6">
      <div className="card-glow p-6">
        <h3 className="font-display font-bold text-lg text-foreground mb-2">
          Criar Nova Campanha
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Comece a promover sua página nas redes sociais
        </p>
        <button onClick={onCreateCampaign} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Criar Campanha
        </button>
      </div>

      <div className="card-elevated p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-gold" />
          <h3 className="font-display font-bold text-lg text-foreground">
            Nenhuma campanha activa
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Crie a sua primeira campanha para começar a crescer as suas redes sociais.
        </p>
      </div>
    </div>;
  }
  return <div className="space-y-8">
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight">
          As Suas Campanhas
        </h2>
        <p className="text-sm text-muted-foreground font-medium">Acompanhe o crescimento orgânico do seu perfil</p>
      </div>
      <button onClick={onCreateCampaign} className="btn-gold px-8 py-4 rounded-xl flex items-center gap-3 shadow-gold-premium group transition-all duration-300">
        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
        <span className="font-black uppercase tracking-widest text-xs">Nova Campanha</span>
      </button>
    </div>

    <div className="grid gap-6">
      {campaigns.map(campaign => {
        const whatsappNumber = "244923066682";
        const whatsappMessage = encodeURIComponent(`Olá! Gostaria de confirmar o pagamento da minha campanha:\n\n` + `📦 Plano: ${campaign.plan_type === "ta_no_limao" ? "Tá no Limão" : "Kwanza"} - ${campaign.plan_name}\n` + `🎯 Meta: ${campaign.target_count} ${campaign.plan_type === "ta_no_limao" ? "seguidores" : "ações"}\n` + `💰 Valor: ${formatPrice(campaign.price)}\n` + `📱 Plataforma: ${campaign.platform.charAt(0).toUpperCase() + campaign.platform.slice(1)}\n` + `🔗 Link: ${campaign.page_link}\n\n` + `Segue em anexo o comprovativo de pagamento.`);

        return <div key={campaign.id} className="card-premium-glow p-6 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl group-hover:bg-primary/10 group-hover:border-primary/20 transition-all shadow-lg">
                {getPlatformEmoji(campaign.platform)}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display font-black text-xl text-white uppercase tracking-tight">
                    {campaign.plan_type === "ta_no_limao" ? "Tá no Limão" : "Kwanza"} - {campaign.plan_name}
                  </h3>
                  {getStatusBadge(campaign.status)}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">{campaign.platform}</span>
                  {campaign.status === "cancelled" && (
                    <CountdownTimer
                      scheduledDeletionAt={campaign.scheduled_deletion_at}
                      onExpire={() => handleDelete(campaign.id)}
                    />
                  )}
                </div>
                <a
                  href={campaign.page_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:text-white transition-colors underline decoration-primary/30 hover:decoration-white mt-2 block truncate max-w-[250px] font-medium"
                >
                  {campaign.page_link}
                </a>
              </div>
            </div>

            <div className="flex items-center gap-10">
              <div className="flex flex-col gap-2 min-w-[120px]">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  <span>Progresso</span>
                  <span className="text-white">{Math.round(campaign.completed_count / campaign.target_count * 100)}%</span>
                </div>
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                  <div
                    className="h-full bg-gradient-neon rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(132,255,46,0.5)]"
                    style={{
                      width: `${Math.min(100, campaign.completed_count / campaign.target_count * 100)}%`
                    }}
                  />
                </div>
                <div className="text-[10px] font-bold text-center text-muted-foreground mt-1 tracking-widest uppercase">
                  {campaign.completed_count} <span className="text-primary">/ {campaign.target_count}</span>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Custo Total</p>
                <p className="text-2xl font-black font-display text-white">{formatPrice(campaign.price)}</p>
              </div>
            </div>
          </div>

          {/* Payment Methods Section - Only show for pending payments */}
          {campaign.status === "pending_payment" && <div className="mt-5 pt-5 border-t border-border">
            <div className="bg-muted/30 rounded-xl p-4 space-y-4">
              <h4 className="font-display font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" />
                Métodos de Pagamento
              </h4>

              <div className="grid sm:grid-cols-2 gap-3">
                {/* IBAN Option */}
                <div className="bg-background rounded-lg p-3 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-gold" />
                    <span className="font-medium text-foreground text-sm">Transferência Bancária (IBAN)</span>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="border-b border-border/50 pb-2 mb-2">
                      <p className="font-medium text-foreground mb-1">Titular: IVAN GERALDO MANUEL LIMA</p>
                    </div>
                    <div className="flex justify-between items-center gap-2 group">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">BFA:</span>
                        <span className="font-mono">0006.0000.5639.8986.3012.6</span>
                      </div>
                      <button onClick={() => copyToClipboard("0006.0000.5639.8986.3012.6", "IBAN BFA")} className="p-1 hover:bg-primary/20 rounded transition-colors text-primary opacity-0 group-hover:opacity-100" title="Copiar IBAN">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex justify-between items-center gap-2 group">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">BIC:</span>
                        <span className="font-mono">0051.0000.2346.1271.10.13.1</span>
                      </div>
                      <button onClick={() => copyToClipboard("0051.0000.2346.1271.10.13.1", "IBAN BIC")} className="p-1 hover:bg-primary/20 rounded transition-colors text-primary opacity-0 group-hover:opacity-100" title="Copiar IBAN">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex justify-between items-center gap-2 group">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">SOL:</span>
                        <span className="font-mono">0044.0000.4275.0148.1018.5</span>
                      </div>
                      <button onClick={() => copyToClipboard("0044.0000.4275.0148.1018.5", "IBAN SOL")} className="p-1 hover:bg-primary/20 rounded transition-colors text-primary opacity-0 group-hover:opacity-100" title="Copiar IBAN">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Multicaixa Express Option */}
                <div className="bg-background rounded-lg p-3 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground text-sm">Multicaixa Express</span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between items-center group">
                      <p><span className="font-medium text-foreground">Número:</span> 923 066 682</p>
                      <button onClick={() => copyToClipboard("923066682", "Número Multicaixa")} className="p-1 hover:bg-primary/20 rounded transition-colors text-primary opacity-0 group-hover:opacity-100" title="Copiar Número">
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <p><span className="font-medium text-foreground">Nome:</span> MakeMoneyWithLima</p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-gold/10 rounded-lg p-3 border border-gold/20">
                <h5 className="font-medium text-gold text-sm mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Instruções após o pagamento:
                </h5>
                <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Efectue o pagamento pelo método escolhido acima</li>
                  <li>Tire uma captura de ecrã ou guarde o comprovativo</li>
                  <li>Envie o comprovativo pelo WhatsApp clicando no botão abaixo</li>
                  <li>Aguarde a confirmação (até 24 horas úteis)</li>
                </ol>
              </div>

              {/* WhatsApp Button */}
              <a href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold rounded-lg transition-all">
                <MessageCircle className="w-5 h-5" />
                Enviar Comprovativo via WhatsApp
              </a>
            </div>
          </div>}
        </div>;
      })}
    </div>
  </div>;
};
export default ClientCampaigns;