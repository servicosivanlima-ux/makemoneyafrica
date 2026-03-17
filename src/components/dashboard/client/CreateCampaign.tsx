import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Zap, Star, Youtube, MessageCircle, Clock, AlertTriangle, Copy, Upload, Loader2, Wallet, ShieldCheck, Users, Smartphone } from "lucide-react";
import { User } from "@supabase/supabase-js";
import FileUpload from "../common/FileUpload";
import { formatPrice as displayPrice } from "@/lib/currency-utils";

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
  reward?: number;
  popular?: boolean;
  premium?: boolean;
}

const LIMAO_PLANS: PlanOption[] = [{
  name: "Básico",
  count: 30,
  price: 3000,
  reward: 60
}, {
  name: "Super Básico",
  count: 50,
  price: 4000,
  reward: 48
}, {
  name: "Tá Fixe",
  count: 100,
  price: 7500,
  reward: 45,
  popular: true
}, {
  name: "Bronze",
  count: 200,
  price: 13500,
  reward: 40.5
}, {
  name: "Prata",
  count: 500,
  price: 37500,
  reward: 45
}, {
  name: "Ouro",
  count: 1000,
  price: 62500,
  reward: 37.5
}, {
  name: "Premium",
  count: 3500,
  price: 200000,
  reward: 34,
  premium: true
}];

const KWANZA_PLANS: PlanOption[] = [{
  name: "Básico",
  count: 50,
  price: 3000
}, {
  name: "Starter",
  count: 100,
  price: 5000
}, {
  name: "Popular",
  count: 250,
  price: 10000,
  popular: true
}, {
  name: "Bronze",
  count: 500,
  price: 18000
}, {
  name: "Prata",
  count: 1000,
  price: 30000
}, {
  name: "Ouro",
  count: 2500,
  price: 65000
}, {
  name: "Premium",
  count: 5000,
  price: 120000,
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
  const [userCountry, setUserCountry] = useState("AO");

  useEffect(() => {
    (supabase
      .from("profiles")
      .select("wallet_balance, country")
      .eq("user_id", user.id)
      .single() as any)
      .then(({ data }: any) => {
        setBalance(data?.wallet_balance || 0);
        setUserCountry(data?.country || "AO");
      });
  }, [user.id]);

  const [planType, setPlanType] = useState<PlanType | null>("limao");
  const [selectedPlan, setSelectedPlan] = useState<PlanOption | null>(null);
  const [platform, setPlatform] = useState<Platform | "">("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("iban");
  const [paymentProofUrl, setPaymentProofUrl] = useState("");
  const [pageLink, setPageLink] = useState("");
  const [profileLink, setProfileLink] = useState("");
  const [videoLink, setVideoLink] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [campaignGoal, setCampaignGoal] = useState<"followers" | "engagement" | "message">("followers");

  const formatPrice = (price: number) => {
    return displayPrice(price, userCountry);
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
          ? "Já tens uma campanha de seguidores activa para esta página."
          : "Já tens uma campanha activa para este post específico.";
        toast.error(message);
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error checking duplicate link:", error);
      return true;
    }
  };

  const extractVideoId = (url: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const [videoId, setVideoId] = useState("");
  const [customBudget, setCustomBudget] = useState(0);
  const [rewardPerTask, setRewardPerTask] = useState(0);

  const handleFinalSubmit = async () => {
    if (!planType || !platform || !pageLink) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    if (planType === "kwanza" && (!videoLink || !selectedPlan || !videoTitle || !videoDuration)) {
      toast.error("Por favor, preencha todos os campos do vídeo (Link, Título e Tempo)");
      return;
    }

    const priceToDeduct = selectedPlan?.price || customBudget;

    if (balance < priceToDeduct) {
      toast.error("Saldo insuficiente. Por favor, recarregue a sua carteira.");
      return;
    }

    setLoading(true);
    try {
      const vid = extractVideoId(videoLink);

      const {
        data: campaignId,
        error
      } = await supabase.rpc('create_campaign_with_balance_v5' as any, {
        p_plan_type: planType === "limao" ? "ta_no_limao" : "kwanza",
        p_plan_name: selectedPlan?.name || "Custom Kwanza",
        p_platform: platform,
        p_page_link: pageLink, // Agora mantemos o link do canal aqui
        p_target_count: selectedPlan?.count || 0,
        p_price: priceToDeduct,
        p_campaign_goal: campaignGoal,
        p_video_title: videoTitle || null,
        p_video_duration: videoDuration || null,
        p_video_id: vid || null,
        p_video_link: videoLink || null // Enviamos o link do vídeo separadamente
      });

      if (error) throw error;

      if (planType === "kwanza") {
        toast.success("Campanha enviada para revisão do Admin!");
      } else {
        toast.success("Campanha activada com sucesso!");
      }
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
    if (userCountry !== "AO") {
      return `💳 Método de Pagamento: PayPal\n📧 Email: ivan.luanda19@gmail.com\n👤 Nome: Ivan Lima\n\n⚠️ Envie o comprovativo via WhatsApp após o pagamento.`;
    }
    if (paymentMethod === "iban") {
      return `💳 Método de Pagamento: Por IBAN\n🏦 Bancos:\n- BFA: 0006.0000.5639.8986.3012.6\n- BIC: 0051.0000.2346.1271.10.13.1\n- SOL: 0044.0000.4275.0148.1018.5\n👤 Titular: Ivan Geraldo Manuel Lima`;
    }
    return `📱 Método de Pagamento: Multicaixa Express\n📞 Número: 923 066 682\n👤 Nome: MakeMoneyWithLima`;
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

  const validatePlatformUrl = (url: string, platform: Platform): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    switch (platform) {
      case "facebook":
        return lowerUrl.includes("facebook.com") || lowerUrl.includes("fb.com");
      case "instagram":
        return lowerUrl.includes("instagram.com");
      case "tiktok":
        return lowerUrl.includes("tiktok.com");
      case "youtube":
        return lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be");
      default:
        return true;
    }
  };

  return <div className="max-w-4xl mx-auto">
    <div className="mb-8 flex items-center justify-between bg-primary/10 p-4 rounded-xl border border-primary/20">
      <div className="flex items-center gap-2">
        <Wallet className="w-5 h-5 text-primary" />
        <span className="text-sm font-bold text-foreground">Saldo na Carteira</span>
      </div>
      <span className="text-lg font-black font-display text-primary">{formatPrice(balance)}</span>
    </div>

    <div className="flex items-center justify-between mb-8">
      {[1, 2, 3, 4].map((s, idx) => <div key={s} className="flex items-center">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold transition-all text-sm sm:text-base ${step === s ? "bg-primary text-primary-foreground" : step > s ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
          {step > s ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : idx + 1}
        </div>
        {idx < 3 && <div className={`w-8 sm:w-16 h-1 mx-1 sm:mx-2 rounded ${step > s ? "bg-primary" : "bg-muted"}`} />}
      </div>)}
    </div>

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

        <button
          onClick={() => {
            setPlanType("kwanza");
            setPlatform("youtube");
            setSelectedPlan(null);
            setCampaignGoal("engagement");
          }}
          className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${planType === "kwanza" ? "border-gold bg-gold/10" : "border-border hover:border-gold/50"}`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${planType === "kwanza" ? "bg-gold text-gold-foreground" : "bg-muted text-muted-foreground"}`}>
            <Youtube className="w-6 h-6" />
          </div>
          <h3 className="font-display font-black text-xs uppercase tracking-widest text-foreground">Pacote Kwanza</h3>
          <p className="text-[10px] text-muted-foreground text-center leading-tight">
            Aumente as visualizações e o engajamento dos seus vídeos do YouTube.
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
            <div className={`text-2xl font-black mb-1 ${planType === "limao" ? "text-primary" : "text-red-500"}`}>
              {plan.count} {planType === "limao" ? "seguidores" : "visualizações"}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
              <Clock className="w-3 h-3 text-primary/60" />
              Entrega: <b>{getDeadline(plan.count)}</b>
            </div>
            <div className="text-lg font-semibold text-foreground">
              {formatPrice(plan.price)}
            </div>
          </button>)}
        </div>

        <div className="mt-10 pt-10 border-t border-white/5">
          <h3 className="font-display font-bold text-lg text-foreground mb-4 text-center">
            O que pretende com esta campanha?
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            <button
              onClick={() => setCampaignGoal("followers")}
              className={`p-5 rounded-xl border-2 transition-all text-left flex items-start gap-4 ${campaignGoal === "followers" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${campaignGoal === "followers" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-foreground">Seguidores</h4>
                <p className="text-[10px] text-muted-foreground leading-tight mt-1">
                  Os trabalhadores irão seguir ou subscrever-se na sua página.
                </p>
              </div>
            </button>

            <button
              onClick={() => setCampaignGoal("engagement")}
              className={`p-5 rounded-xl border-2 transition-all text-left flex items-start gap-4 ${campaignGoal === "engagement" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${campaignGoal === "engagement" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-foreground">Reacção + Comentário</h4>
                <p className="text-[10px] text-muted-foreground leading-tight mt-1">
                  Os trabalhadores irão reagir (gostar) e deixar um comentário positivo.
                </p>
              </div>
            </button>

            <button
              onClick={() => setCampaignGoal("message")}
              className={`p-5 rounded-xl border-2 transition-all text-left flex items-start gap-4 ${campaignGoal === "message" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${campaignGoal === "message" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-foreground">Seguir e Enviar Mensagem</h4>
                <p className="text-[10px] text-muted-foreground leading-tight mt-1">
                  Os trabalhadores irão seguir a página e enviar uma mensagem de saudação/interesse.
                </p>
              </div>
            </button>
          </div>
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
          <p className="text-sm text-red-500 font-medium">Não tem saldo suficiente para este plano.</p>
          <button
            onClick={() => onRecharge ? onRecharge() : window.location.href = '#carteira'}
            className="text-xs font-black uppercase text-red-500 underline"
          >
            Recarregar
          </button>
        </div>
      )}
    </div>}

    {step === 2 && <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">
          Escolha a Plataforma
        </h2>
        <p className="text-muted-foreground">
          Onde quer aumentar o seu engajamento?
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {PLATFORMS
          .filter(p => planType === "kwanza" ? p.id === "youtube" : p.id !== "youtube")
          .map(p => <button key={p.id} onClick={() => setPlatform(p.id)} className={`p-6 rounded-xl border-2 transition-all flex items-center gap-4 ${platform === p.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
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

    {step === 3 && (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            Links da Página
          </h2>
          <p className="text-muted-foreground">
            Insira os links que os trabalhadores irão aceder
          </p>
        </div>

        <div className="space-y-6 max-w-lg mx-auto">
          <div>
            <label className="block text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Link da Página ou Canal (Destino Final)*
            </label>
            <input type="url" value={pageLink} onChange={e => setPageLink(e.target.value)} className="input-styled w-full" required placeholder="https://youtube.com/@seucanal" />
            <p className="text-[10px] text-muted-foreground mt-2 font-medium uppercase tracking-wider">Link onde o utilizador deve se subscrever ou seguir</p>
          </div>

          {planType === "kwanza" && (
            <div className="space-y-6 mt-4 p-6 rounded-2xl bg-gold/5 border border-gold/10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-gold rounded-full shadow-neon" />
                <h3 className="font-display font-bold text-lg text-foreground uppercase tracking-tight">Detalhes do Vídeo</h3>
              </div>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Link do Vídeo YouTube</label>
                  <div className="relative group">
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={videoLink}
                      onChange={(e) => setVideoLink(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 group-hover:border-gold/50 transition-all h-12 pl-10 rounded-xl outline-none focus:border-gold"
                    />
                    <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-gold transition-colors" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Título do Vídeo</label>
                  <input
                    placeholder="Insira o título conforme o YouTube"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 h-12 rounded-xl outline-none focus:border-gold px-4"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tempo Total do Vídeo</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group">
                      <input
                        type="number"
                        placeholder="Minutos"
                        value={Math.floor(videoDuration / 60) || ""}
                        onChange={(e) => {
                          const mins = Math.max(0, Number(e.target.value));
                          const secs = videoDuration % 60;
                          setVideoDuration(mins * 60 + secs);
                        }}
                        className="w-full bg-white/5 border border-white/10 group-hover:border-gold/50 transition-all h-12 pl-10 rounded-xl outline-none focus:border-gold"
                      />
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-gold transition-colors" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-bold uppercase">MIN</span>
                    </div>
                    <div className="relative group">
                      <input
                        type="number"
                        placeholder="Segundos"
                        max="59"
                        value={videoDuration % 60 || ""}
                        onChange={(e) => {
                          const mins = Math.floor(videoDuration / 60);
                          const secs = Math.min(59, Math.max(0, Number(e.target.value)));
                          setVideoDuration(mins * 60 + secs);
                        }}
                        className="w-full bg-white/5 border border-white/10 group-hover:border-gold/50 transition-all h-12 pl-10 rounded-xl outline-none focus:border-gold"
                      />
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-gold transition-colors" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-bold uppercase">SEG</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground ml-1 italic">
                    Total: <span className="text-white font-bold">{videoDuration} segundos</span>. O tempo necessário baseia-se neste valor.
                    <span className="text-gold block font-bold mt-1 uppercase">⚠️ Atenção: Ganhos limitados a 5 minutos (300s) por vídeo.</span>
                  </p>
                </div>
              </div>

              <div className="bg-gold/10 border border-gold/20 p-4 rounded-xl flex items-start gap-4">
                <div className="p-2 rounded-lg bg-gold/20">
                  <ShieldCheck className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gold mb-1">Aprovação Necessária</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    As campanhas de vídeo requerem revisão administrativa. Após o seu pagamento ser confirmado, o administrador configurará a recompensa para os trabalhadores para activar a campanha.
                  </p>
                </div>
              </div>
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
              if (!validatePlatformUrl(pageLink, platform as Platform)) {
                const platformName = PLATFORMS.find(p => p.id === platform)?.name;
                toast.error(`O link da página não corresponde à plataforma selecionada (${platformName}). Por favor, verifique o link.`);
                return;
              }

              if (planType === "kwanza" && videoLink && !validatePlatformUrl(videoLink, platform as Platform)) {
                const platformName = PLATFORMS.find(p => p.id === platform)?.name;
                toast.error(`O link da publicação não corresponde à plataforma selecionada (${platformName}). Por favor, verifique o link.`);
                return;
              }

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
      </div>
    )}

    {step === 4 && (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            Confirmar Ativação
          </h2>
          <p className="text-muted-foreground">
            A sua campanha será activada instantaneamente após a confirmação
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
          <div className="flex justify-between items-center pb-4 border-b border-border">
            <span className="text-muted-foreground">Objectivo</span>
            <span className="font-bold text-primary">
              {campaignGoal === "followers" ? "Seguidores" :
                campaignGoal === "engagement" ? "Reacção + Comentário Positivo" :
                  "Seguir + Mensagem"}
            </span>
          </div>
          {planType === "kwanza" && (
            <div className="flex justify-between items-center pb-4 border-b border-border">
              <span className="text-muted-foreground">Link do Post</span>
              <span className="font-bold text-xs truncate max-w-[200px]">{videoLink}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2">
            <span className="text-muted-foreground">Saldo após activação</span>
            <span className="font-bold text-primary">{formatPrice(balance - (selectedPlan?.price || 0))}</span>
          </div>

          <button
            onClick={handleFinalSubmit}
            disabled={loading}
            className="w-full btn-primary h-14 mt-6 rounded-2xl font-black uppercase tracking-widest text-xs"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar e Activar Agora"}
          </button>
        </div>

        <div className="flex justify-center pt-8 border-t border-white/5">
          <button onClick={() => setStep(3)} className="btn-secondary min-w-[200px]">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Links
          </button>
        </div>
      </div>
    )}
  </div>;
};

export default CreateCampaign;
