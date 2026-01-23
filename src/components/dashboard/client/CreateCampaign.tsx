import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Zap, Star, MessageCircle } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface CreateCampaignProps {
  user: User;
  onComplete: () => void;
  onBack: () => void;
}

type PlanType = "limao" | "kwanza";
type Platform = "facebook" | "instagram" | "tiktok" | "youtube";

interface PlanOption {
  name: string;
  count: number;
  price: number;
  popular?: boolean;
  premium?: boolean;
}

const LIMAO_PLANS: PlanOption[] = [
  { name: "Básico", count: 30, price: 6000 },
  { name: "Super Básico", count: 50, price: 8000 },
  { name: "Tá Fixe", count: 100, price: 15000, popular: true },
  { name: "Bronze", count: 200, price: 27000 },
  { name: "Prata", count: 500, price: 75000 },
  { name: "Ouro", count: 1000, price: 125000 },
  { name: "Premium", count: 3500, price: 400000, premium: true },
];

const KWANZA_PLANS: PlanOption[] = [
  { name: "Básico", count: 50, price: 30000 },
  { name: "Super Básico", count: 100, price: 50000 },
  { name: "Tá Fixe", count: 150, price: 70000, popular: true },
  { name: "Bronze", count: 200, price: 100000 },
  { name: "Prata", count: 500, price: 250000 },
  { name: "Ouro", count: 1000, price: 400000 },
  { name: "Premium", count: 2500, price: 850000, premium: true },
];

const PLATFORMS: { id: Platform; name: string; icon: string }[] = [
  { id: "facebook", name: "Facebook", icon: "📘" },
  { id: "instagram", name: "Instagram", icon: "📸" },
  { id: "tiktok", name: "TikTok", icon: "🎵" },
  { id: "youtube", name: "YouTube", icon: "🎬" },
];

const CreateCampaign = ({ user, onComplete, onBack }: CreateCampaignProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [planType, setPlanType] = useState<PlanType | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [pageLink, setPageLink] = useState("");
  const [profileLink, setProfileLink] = useState("");
  const [videoLink, setVideoLink] = useState("");

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-AO").format(price) + " Kz";
  };

  const handleSubmit = async () => {
    if (!planType || !selectedPlan || !platform || !pageLink) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    // Client-side validation
    if (pageLink.length < 10 || !pageLink.startsWith("http")) {
      toast.error("Por favor, insira um link válido");
      return;
    }

    setLoading(true);
    try {
      // Use secure server-side function for campaign creation
      const { data: campaignId, error } = await supabase.rpc('create_campaign_secure', {
        p_plan_type: planType === "limao" ? "ta_no_limao" : "kwanza",
        p_plan_name: selectedPlan.name,
        p_platform: platform,
        p_page_link: pageLink,
        p_profile_link: profileLink || null,
        p_video_link: videoLink || null
      });

      if (error) throw error;

      toast.success("Campanha criada com sucesso!");
      onComplete();
    } catch (error: any) {
      if (error.message?.includes("pending campaign")) {
        toast.error("Você já tem uma campanha pendente de pagamento");
      } else if (error.message?.includes("Only clients")) {
        toast.error("Apenas clientes podem criar campanhas");
      } else {
        toast.error(error.message || "Erro ao criar campanha");
      }
    } finally {
      setLoading(false);
    }
  };

  const whatsappNumber = "244923456789"; // Número do WhatsApp para pagamento
  const whatsappMessage = encodeURIComponent(
    `Olá! Criei uma campanha no MMWL:\n\n` +
    `📦 Plano: ${planType === "limao" ? "Tá no Limão" : "Kwanza"} - ${selectedPlan?.name}\n` +
    `🎯 Meta: ${selectedPlan?.count} ${planType === "limao" ? "seguidores" : "ações"}\n` +
    `💰 Valor: ${formatPrice(selectedPlan?.price || 0)}\n` +
    `📱 Plataforma: ${PLATFORMS.find(p => p.id === platform)?.name}\n` +
    `🔗 Link: ${pageLink}\n\n` +
    `Gostaria de confirmar o pagamento.`
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : step > s
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 4 && (
              <div
                className={`w-16 sm:w-24 h-1 mx-2 rounded ${
                  step > s ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Choose Plan Type */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Escolha o Tipo de Plano
            </h2>
            <p className="text-muted-foreground">
              Selecione entre crescimento de seguidores ou engajamento completo
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <button
              onClick={() => setPlanType("limao")}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                planType === "limao"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-lime flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-foreground">
                    Tá no Limão
                  </h3>
                  <p className="text-sm text-muted-foreground">Foco em seguidores</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Aumente o número de seguidores da sua página de forma rápida e orgânica.
              </p>
            </button>

            <button
              onClick={() => setPlanType("kwanza")}
              className={`p-6 rounded-xl border-2 transition-all text-left ${
                planType === "kwanza"
                  ? "border-gold bg-gold/10"
                  : "border-border hover:border-gold/50"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center">
                  <Star className="w-6 h-6 text-gold-foreground" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-foreground">
                    Kwanza
                  </h3>
                  <p className="text-sm text-muted-foreground">Engajamento completo</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Seguir + Curtir + Comentar + Partilhar. Máximo engajamento garantido.
              </p>
            </button>
          </div>

          {planType && (
            <div className="mt-8">
              <h3 className="font-display font-bold text-lg text-foreground mb-4">
                Selecione o Plano
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(planType === "limao" ? LIMAO_PLANS : KWANZA_PLANS).map((plan) => (
                  <button
                    key={plan.name}
                    onClick={() => setSelectedPlan(plan)}
                    className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                      selectedPlan?.name === plan.name
                        ? planType === "limao"
                          ? "border-primary bg-primary/10"
                          : "border-gold bg-gold/10"
                        : "border-border hover:border-primary/50"
                    } ${plan.premium ? "bg-gradient-gold/10" : ""}`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        Popular
                      </span>
                    )}
                    {plan.premium && (
                      <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-gold text-xs font-semibold text-gold-foreground">
                        Premium
                      </span>
                    )}
                    <h4 className="font-semibold text-foreground">{plan.name}</h4>
                    <div className="text-2xl font-bold text-gradient-lime mt-1">
                      {plan.count.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {planType === "limao" ? "seguidores" : "ações"}
                    </p>
                    <div className="text-lg font-semibold text-foreground">
                      {formatPrice(plan.price)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6">
            <button onClick={onBack} className="btn-secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!planType || !selectedPlan}
              className="btn-primary"
            >
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Choose Platform */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Escolha a Plataforma
            </h2>
            <p className="text-muted-foreground">
              Onde você quer aumentar seu engajamento?
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`p-6 rounded-xl border-2 transition-all flex items-center gap-4 ${
                  platform === p.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="text-4xl">{p.icon}</span>
                <span className="font-display font-bold text-lg text-foreground">
                  {p.name}
                </span>
              </button>
            ))}
          </div>

          <div className="flex justify-between pt-6">
            <button onClick={() => setStep(1)} className="btn-secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!platform}
              className="btn-primary"
            >
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Enter Links */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Links da Página
            </h2>
            <p className="text-muted-foreground">
              Insira os links que os trabalhadores irão acessar
            </p>
          </div>

          <div className="space-y-4 max-w-lg mx-auto">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Link da Página/Perfil *
              </label>
              <input
                type="url"
                value={pageLink}
                onChange={(e) => setPageLink(e.target.value)}
                placeholder="https://facebook.com/suapagina"
                className="input-styled w-full"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Link principal onde os trabalhadores irão seguir
              </p>
            </div>

            {planType === "kwanza" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Link do Perfil (opcional)
                  </label>
                  <input
                    type="url"
                    value={profileLink}
                    onChange={(e) => setProfileLink(e.target.value)}
                    placeholder="https://facebook.com/seuperfil"
                    className="input-styled w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Link do Vídeo/Post (opcional)
                  </label>
                  <input
                    type="url"
                    value={videoLink}
                    onChange={(e) => setVideoLink(e.target.value)}
                    placeholder="https://facebook.com/video/123"
                    className="input-styled w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Vídeo ou post específico para curtir/comentar/partilhar
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-between pt-6">
            <button onClick={() => setStep(2)} className="btn-secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!pageLink}
              className="btn-primary"
            >
              Continuar
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm & Pay */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Confirme sua Campanha
            </h2>
            <p className="text-muted-foreground">
              Revise os detalhes e prossiga para o pagamento via WhatsApp
            </p>
          </div>

          <div className="card-elevated p-6 max-w-lg mx-auto">
            <h3 className="font-display font-bold text-lg text-foreground mb-4">
              Resumo da Campanha
            </h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plano</span>
                <span className="font-medium text-foreground">
                  {planType === "limao" ? "Tá no Limão" : "Kwanza"} - {selectedPlan?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Meta</span>
                <span className="font-medium text-foreground">
                  {selectedPlan?.count.toLocaleString()} {planType === "limao" ? "seguidores" : "ações"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plataforma</span>
                <span className="font-medium text-foreground">
                  {PLATFORMS.find(p => p.id === platform)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Link</span>
                <span className="font-medium text-foreground text-sm truncate max-w-[200px]">
                  {pageLink}
                </span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between text-lg">
                <span className="font-semibold text-foreground">Total</span>
                <span className="font-bold text-gradient-lime">
                  {formatPrice(selectedPlan?.price || 0)}
                </span>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground text-center">
                Após criar a campanha, envie o comprovante de pagamento via WhatsApp para ativar sua campanha.
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Criar Campanha
                </>
              )}
            </button>

            {!loading && (
              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-gold w-full flex items-center justify-center gap-2 mt-3"
              >
                <MessageCircle className="w-5 h-5" />
                Confirmar Pagamento via WhatsApp
              </a>
            )}
          </div>

          <div className="flex justify-center pt-6">
            <button onClick={() => setStep(3)} className="btn-secondary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCampaign;
