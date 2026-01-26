import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Plus, AlertCircle, CheckCircle, Clock, XCircle, MessageCircle, CreditCard, Building2, Smartphone } from "lucide-react";
import { toast } from "sonner";
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
}

const ClientCampaigns = ({ user, onCreateCampaign }: ClientCampaignsProps) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCampaigns();
  }, [user.id]);

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Error loading campaigns:", error);
      toast.error("Erro ao carregar campanhas");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-AO").format(price) + " Kz";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_payment":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-medium">
            <Clock className="w-3 h-3" />
            Aguardando Pagamento
          </span>
        );
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Ativa
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Concluída
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Cancelada
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  const getPlatformEmoji = (platform: string) => {
    switch (platform) {
      case "facebook": return "📘";
      case "instagram": return "📸";
      case "tiktok": return "🎵";
      case "youtube": return "🎬";
      default: return "📱";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="grid md:grid-cols-2 gap-6">
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
              Nenhuma campanha ativa
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Crie sua primeira campanha para começar a crescer suas redes sociais.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg text-foreground">
          Suas Campanhas
        </h2>
        <button onClick={onCreateCampaign} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
      </div>

      <div className="grid gap-4">
        {campaigns.map((campaign) => {
          const whatsappNumber = "244923456789";
          const whatsappMessage = encodeURIComponent(
            `Olá! Gostaria de confirmar o pagamento da minha campanha:\n\n` +
            `📦 Plano: ${campaign.plan_type === "ta_no_limao" ? "Tá no Limão" : "Kwanza"} - ${campaign.plan_name}\n` +
            `🎯 Meta: ${campaign.target_count} ${campaign.plan_type === "ta_no_limao" ? "seguidores" : "ações"}\n` +
            `💰 Valor: ${formatPrice(campaign.price)}\n` +
            `📱 Plataforma: ${campaign.platform.charAt(0).toUpperCase() + campaign.platform.slice(1)}\n` +
            `🔗 Link: ${campaign.page_link}\n\n` +
            `Segue em anexo o comprovativo de pagamento.`
          );

          return (
            <div key={campaign.id} className="card-elevated p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{getPlatformEmoji(campaign.platform)}</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display font-bold text-foreground">
                        {campaign.plan_type === "ta_no_limao" ? "Tá no Limão" : "Kwanza"} - {campaign.plan_name}
                      </h3>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {campaign.platform.charAt(0).toUpperCase() + campaign.platform.slice(1)}
                    </p>
                    <a 
                      href={campaign.page_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate block max-w-[300px]"
                    >
                      {campaign.page_link}
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">Progresso</div>
                    <div className="font-bold text-foreground">
                      {campaign.completed_count} / {campaign.target_count}
                    </div>
                    <div className="w-24 h-2 bg-muted rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-lime rounded-full transition-all"
                        style={{ width: `${Math.min(100, (campaign.completed_count / campaign.target_count) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Valor</div>
                    <div className="font-bold text-foreground">{formatPrice(campaign.price)}</div>
                  </div>
                </div>
              </div>

              {/* Payment Methods Section - Only show for pending payments */}
              {campaign.status === "pending_payment" && (
                <div className="mt-5 pt-5 border-t border-border">
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
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p><span className="font-medium text-foreground">Banco:</span> BAI</p>
                          <p><span className="font-medium text-foreground">IBAN:</span> AO06.0040.0000.1234.5678.1234.5</p>
                          <p><span className="font-medium text-foreground">Titular:</span> MakeMoneyWithLima Lda</p>
                        </div>
                      </div>

                      {/* Multicaixa Express Option */}
                      <div className="bg-background rounded-lg p-3 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Smartphone className="w-4 h-4 text-primary" />
                          <span className="font-medium text-foreground text-sm">Multicaixa Express</span>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p><span className="font-medium text-foreground">Número:</span> 923 456 789</p>
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
                        <li>Realize o pagamento pelo método escolhido acima</li>
                        <li>Tire uma captura de ecrã ou guarde o comprovativo</li>
                        <li>Envie o comprovativo pelo WhatsApp clicando no botão abaixo</li>
                        <li>Aguarde a confirmação (até 24 horas úteis)</li>
                      </ol>
                    </div>

                    {/* WhatsApp Button */}
                    <a
                      href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold rounded-lg transition-all"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Enviar Comprovativo via WhatsApp
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClientCampaigns;
