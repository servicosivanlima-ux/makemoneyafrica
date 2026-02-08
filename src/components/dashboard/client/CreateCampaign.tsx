import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Zap, Star, MessageCircle, Clock, AlertTriangle, Copy, Upload, Loader2, Wallet } from "lucide-react";
import { User } from "@supabase/supabase-js";
import FileUpload from "../common/FileUpload";
interface CreateCampaignProps {
  user: User;
  onComplete: () => void;
  onBack: () => void;
  onRecharge?: () => void;
}
type PlanType = "limao" | "kwanza";
type Platform = "facebook" | "instagram" | "tiktok" | "youtube";
type PaymentMethod = "iban" | "multicaixa";
interface PlanOption {
  name: string;
  count: number;
  price: number;
  popular?: boolean;
  premium?: boolean;
}
const LIMAO_PLANS: PlanOption[] = [{
  name: "Básico",
  count: 30,
  price: 6000
}, {
  name: "Super Básico",
  count: 50,
  price: 8000
}, {
  name: "Tá Fixe",
  count: 100,
  price: 15000,
  popular: true
}, {
  name: "Bronze",
  count: 200,
  price: 27000
}, {
  name: "Prata",
  count: 500,
  price: 75000
}, {
  name: "Ouro",
  count: 1000,
  price: 125000
}, {
  name: "Premium",
  count: 3500,
  price: 400000,
  premium: true
}];
const KWANZA_PLANS: PlanOption[] = [{
  name: "Básico",
  count: 50,
  price: 30000
}, {
  name: "Super Básico",
  count: 100,
  price: 50000
}, {
  name: "Tá Fixe",
  count: 150,
  price: 70000,
  popular: true
}, {
  name: "Bronze",
  count: 200,
  price: 100000
}, {
  name: "Prata",
  count: 500,
  price: 250000
}, {
  name: "Ouro",
  count: 1000,
  price: 400000
}, {
  name: "Premium",
  count: 2500,
  price: 850000,
  premium: true
}];
const PLATFORMS: {
  id: Platform;
  name: string;
  icon: string;
}[] = [{
  id: "facebook",
  name: "Facebook",
  icon: "📘"
}, {
  id: "instagram",
  name: "Instagram",
  icon: "📸"
}, {
  id: "tiktok",
  name: "TikTok",
  icon: "🎵"
}, {
  id: "youtube",
  name: "YouTube",
  icon: "🎬"
}];
const CreateCampaign = ({
  user,
  onComplete,
  onBack,
  onRecharge
}: CreateCampaignProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    (supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("user_id", user.id)
      .single() as any)
      .then(({ data }: any) => setBalance(data?.wallet_balance || 0));
  }, [user.id]);
  const [planType, setPlanType] = useState<PlanType | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null); // Changed Plan to PlanOption
  const [platform, setPlatform] = useState<Platform | "">(""); // Changed Platform | null to Platform | ""
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("iban");
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [pageLink, setPageLink] = useState("");
  const [profileLink, setProfileLink] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-AO").format(price) + " Kz";
  };
  const getDeadline = (count: number) => {
    if (count <= 200) return "1 Semana";
    if (count <= 500) return "2 Semanas";
    if (count <= 1500) return "3 Semanas";
    return "4 Semanas";
  };
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const checkDuplicateLink = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id')
        .eq('client_id', user.id)
        .eq('plan_type', planType === 'limao' ? 'ta_no_limao' : 'kwanza')
        .in('status', ['active', 'pending_payment'])
        .filter(
          planType === 'limao' ? 'page_link' : 'video_link',
          'eq',
          planType === 'limao' ? pageLink : videoLink
        );

      if (error) throw error;

      if (data && data.length > 0) {
        const message = planType === 'limao'
          ? "Já tens uma campanha de seguidores ativa para esta página."
          : "Já tens uma campanha ativa para este post específico.";
        toast.error(message);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error checking duplicate link:", error);
      return true;
    }
  };

  const handleFinalSubmit = async () => {
    if (!planType || !selectedPlan || !platform || !pageLink) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (planType === "kwanza" && !videoLink) {
      toast.error("Por favor, insira o link da publicação para engajamento");
      return;
    }

    if (balance < selectedPlan.price) {
      toast.error("Saldo insuficiente. Por favor, recarregue sua carteira.");
      return;
    }

    setLoading(true);
    try {
      const {
        data: campaignId,
        error
      } = await supabase.rpc('create_campaign_with_balance' as any, {
        p_plan_type: planType === "limao" ? "ta_no_limao" : "kwanza",
        p_plan_name: selectedPlan.name,
        p_platform: platform,
        p_page_link: pageLink,
        p_profile_link: profileLink || null,
        p_video_link: videoLink || null
      });
      if (error) throw error;

      toast.success("Campanha ativada com sucesso!");
      onComplete();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar campanha");
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getPaymentInstructions = () => {
    if (paymentMethod === "iban") {
      return `💳 Método de Pagamento: Por IBAN\n🏦 Bancos:\n- BFA: 0006.0000.5639.8986.3012.6\n- BIC: 0051.0000.2346.1271.10.13.1\n- SOL: 0044.0000.4275.0148.1018.5\n👤 Titular: Ivan Geraldo Manuel Lima`;
    }
    return `📱 Método de Pagamento: Multicaixa Express\n📞 Número: 923 066 682\n👤 Nome: MakeMoneyWithLima`; // Modified multicaixa instruction
  };

  const whatsappNumber = "244923066682";
  const whatsappMessage = encodeURIComponent(
    `Olá! Criei uma campanha no MMWL e efetuei o pagamento:\n\n` +
    `📦 Plano: ${planType === "limao" ? "Tá no Limão" : "Kwanza"} - ${selectedPlan?.name}\n` +
    `🎯 Meta: ${selectedPlan?.count} ${planType === "limao" ? "seguidores" : "ações"}\n` +
    `⏱️ Prazos: ${getDeadline(selectedPlan?.count || 0)}\n` +
    `💰 Valor: ${formatPrice(selectedPlan?.price || 0)}\n` +
    `📱 Plataforma: ${PLATFORMS.find(p => p.id === platform)?.name}\n` +
    `🔗 Link: ${pageLink}\n\n` +
    `${getPaymentInstructions()}\n\n` +
    `📎 Comprovativo enviado no sistema.`
  );
  return <div className="max-w-4xl mx-auto">
    <div className="mb-8 flex items-center justify-between bg-primary/10 p-4 rounded-xl border border-primary/20">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-primary" />
        <span className="text-sm font-bold text-foreground">Saldo na Carteira</span>
      </div>
      <span className="text-lg font-black font-display text-primary">{formatPrice(balance)}</span>
    </div>

    {/* Progress Steps */}
    <div className="flex items-center justify-between mb-8">
      {[1, 2, 3, 4].map((s, idx) => <div key={s} className="flex items-center">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold transition-all text-sm sm:text-base ${step === s ? "bg-primary text-primary-foreground" : step > s ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
          {step > s ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : idx + 1}
        </div>
        {idx < 3 && <div className={`w-8 sm:w-16 h-1 mx-1 sm:mx-2 rounded ${step > s ? "bg-primary" : "bg-muted"}`} />}
      </div>)}
    </div>

    {/* Step 1: Choose Plan Type */}
    {step === 1 && <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          Escolha o Tipo de Plano
        </h2>
        <p className="text-muted-foreground">
          Selecione entre crescimento de seguidores ou engajamento completo
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <button onClick={() => setPlanType("limao")} className={`p-6 rounded-xl border-2 transition-all text-left ${planType === "limao" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
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

        <button onClick={() => setPlanType("kwanza")} className={`p-6 rounded-xl border-2 transition-all text-left ${planType === "kwanza" ? "border-gold bg-gold/10" : "border-border hover:border-gold/50"}`}>
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

      {planType && <div className="mt-8">
        <h3 className="font-display font-bold text-lg text-foreground mb-4">
          Selecione o Plano
        </h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(planType === "limao" ? LIMAO_PLANS : KWANZA_PLANS).map(plan => <button key={plan.name} onClick={() => setSelectedPlan(plan)} className={`relative p-4 rounded-xl border-2 transition-all text-left ${selectedPlan?.name === plan.name ? planType === "limao" ? "border-primary bg-primary/10" : "border-gold bg-gold/10" : "border-border hover:border-primary/50"} ${plan.premium ? "bg-gradient-gold/10" : ""}`}>
            {plan.popular && <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              Popular
            </span>}
            {plan.premium && <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-gold text-xs font-semibold text-gold-foreground">
              Premium
            </span>}
            <h4 className="font-semibold text-foreground">{plan.name}</h4>
            <div className="text-2xl font-bold text-gradient-lime mt-1">
              {plan.count.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mb-1">
              {planType === "limao" ? "seguidores" : "ações"}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
              <Clock className="w-3 h-3 text-primary/60" />
              Entrega: <b>{getDeadline(plan.count)}</b>
            </div>
            <div className="text-lg font-semibold text-foreground">
              {formatPrice(plan.price)}
            </div>
          </button>)}
        </div>
      </div>}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-10 border-t border-white/5">
        <button onClick={onBack} className="btn-secondary w-full sm:w-auto min-w-[160px]">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Dashboard
        </button>
        <button onClick={() => setStep(2)} disabled={!planType || !selectedPlan} className="btn-primary w-full sm:w-auto min-w-[200px]">
          Próximo Passo
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>

      {selectedPlan && balance < selectedPlan.price && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between gap-4">
          <p className="text-sm text-red-500 font-medium">Você não tem saldo suficiente para este plano.</p>
          <button
            onClick={() => onRecharge ? onRecharge() : window.location.href = '#carteira'}
            className="text-xs font-black uppercase text-red-500 underline"
          >
            Recarregar
          </button>
        </div>
      )}
    </div>}

    {/* Step 2: Choose Platform */}
    {step === 2 && <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          Escolha a Plataforma
        </h2>
        <p className="text-muted-foreground">
          Onde você quer aumentar seu engajamento?
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {PLATFORMS.map(p => <button key={p.id} onClick={() => setPlatform(p.id)} className={`p-6 rounded-xl border-2 transition-all flex items-center gap-4 ${platform === p.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
          <span className="text-4xl">{p.icon}</span>
          <span className="font-display font-bold text-lg text-foreground">
            {p.name}
          </span>
        </button>)}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-10 border-t border-white/5">
        <button onClick={() => setStep(1)} className="btn-secondary w-full sm:w-auto min-w-[160px]">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Alterar Plano
        </button>
        <button onClick={() => setStep(3)} disabled={!platform} className="btn-primary w-full sm:w-auto min-w-[200px]">
          Configurar Links
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>}

    {/* Step 3: Enter Links */}
    {step === 3 && <div className="space-y-6">
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
          <label className="block text-sm font-medium text-foreground mb-2">Link da Página ou Perfil*</label>
          <input type="url" value={pageLink} onChange={e => setPageLink(e.target.value)} className="input-styled w-full" required placeholder="inserir o link da campanha em https//exemplo.com" />
          <p className="text-xs text-muted-foreground mt-1">Link principal da página ou perfil para novos seguidores</p>
        </div>

        {planType === "kwanza" && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Link da Publicação/Post *</label>
            <input
              type="url"
              value={videoLink}
              onChange={e => setVideoLink(e.target.value)}
              className="input-styled w-full border-gold/50 focus:border-gold"
              required
              placeholder="https//facebook.com/posts/123..."
            />
            <p className="text-xs text-muted-foreground mt-1">Link do post específico que os trabalhadores devem Curtir/Comentar/Partilhar</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-10 border-t border-white/5">
        <button onClick={() => setStep(2)} className="btn-secondary w-full sm:w-auto min-w-[160px]">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Mudar Plataforma
        </button>
        <button
          onClick={async () => {
            const isNotDuplicate = await checkDuplicateLink();
            if (isNotDuplicate) setStep(4);
          }}
          disabled={!pageLink || (selectedPlan && balance < selectedPlan.price)}
          className="btn-primary w-full sm:w-auto min-w-[200px]"
        >
          Revisar Campanha
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>}

    {/* Step 4: Final Confirmation */}
    {step === 4 && <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          Confirmar Ativação
        </h2>
        <p className="text-muted-foreground">
          Sua campanha será ativada instantaneamente após a confirmação
        </p>
      </div>

      <div className="card-elevated p-6 max-w-lg mx-auto space-y-4">
        <div className="flex justify-between items-center pb-4 border-b border-border">
          <span className="text-muted-foreground">Plano</span>
          <span className="font-bold">{planType === "limao" ? "Tá no Limão" : "Kwanza"} - {selectedPlan?.name}</span>
        </div>
        <div className="flex justify-between items-center pb-4 border-b border-border">
          <span className="text-muted-foreground">Plataforma</span>
          <span className="font-bold capitalize">{platform}</span>
        </div>
        <div className="flex justify-between items-center pb-4 border-b border-border">
          <span className="text-muted-foreground">Custo</span>
          <span className="font-bold text-gradient-gold">{formatPrice(selectedPlan?.price || 0)}</span>
        </div>
        {planType === "kwanza" && (
          <div className="flex justify-between items-center pb-4 border-b border-border">
            <span className="text-muted-foreground">Link do Post</span>
            <span className="font-bold text-xs truncate max-w-[200px]">{videoLink}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2">
          <span className="text-muted-foreground">Saldo após ativação</span>
          <span className="font-bold text-primary">{formatPrice(balance - (selectedPlan?.price || 0))}</span>
        </div>

        <button
          onClick={handleFinalSubmit}
          disabled={loading}
          className="w-full btn-primary h-14 mt-6 rounded-2xl font-black uppercase tracking-widest text-xs"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar e Ativar Agora"}
        </button>
      </div>

      <div className="flex justify-center pt-8 border-t border-white/5">
        <button onClick={() => setStep(3)} className="btn-secondary min-w-[200px]">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Links
        </button>
      </div>
    </div>}
  </div>;
};
export default CreateCampaign;