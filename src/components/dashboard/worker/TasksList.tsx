import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { ExternalLink, Upload, CheckCircle, Clock, XCircle, AlertCircle, ShieldCheck, User as UserIcon, Trash2, Users, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import CountdownTimer from "../common/CountdownTimer";
import ActiveTaskTimer from "./ActiveTaskTimer";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import FileUpload from "../common/FileUpload";
import YouTubeTaskPlayer from "./YouTubeTaskPlayer";
import { formatPrice } from "@/lib/currency-utils";

interface TasksListProps {
  user: User;
  onTaskComplete: () => void;
}

interface AvailableCampaign {
  id: string;
  plan_type: string;
  plan_name: string;
  platform: string;
  page_link: string;
  profile_link: string | null;
  video_link: string | null;
  video_id?: string | null;
  channel_id?: string | null;
  duration?: number | null;
  reward?: number | null;
  total_budget?: number | null;
  remaining_budget?: number | null;
  target_count: number;
  completed_count: number;
  status: string;
  campaign_goal?: "followers" | "engagement";
  description?: string;
  reward_amount_override?: number;
}

interface Task {
  id: string;
  campaign_id: string;
  status: string;
  reward_amount: number;
  assigned_at: string | null;
  completed_at: string | null;
  rejection_reason: string | null;
  follow_proof_url: string | null;
  like_proof_url: string | null;
  comment_proof_url: string | null;
  share_proof_url: string | null;
  submission_link: string | null;
  scheduled_deletion_at?: string | null;
  campaign?: AvailableCampaign;
}

const TasksList = ({ user, onTaskComplete }: TasksListProps) => {
  const [campaigns, setCampaigns] = useState<AvailableCampaign[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setSelectedCampaign] = useState<AvailableCampaign | null>(null);
  const [uploading, setUploading] = useState(false);
  const [proofs, setProofs] = useState({
    follow: "",
    like: "",
    comment: "",
    share: "",
  });
  const [profile, setProfile] = useState<any>(null);
  const [confirmAccount, setConfirmAccount] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [showProofForm, setShowProofForm] = useState(false);
  const [hasOpenedLink, setHasOpenedLink] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  useEffect(() => {
    loadData();

    // Subscribe to realtime updates for campaigns
    const campaignsChannel = supabase
      .channel("campaigns-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaigns" },
        () => {
          loadData();
        }
      )
      .subscribe();

    // Subscribe to realtime updates for tasks assigned to this worker
    const tasksChannel = supabase
      .channel(`worker-tasks-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `worker_id=eq.${user.id}`
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(campaignsChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [user.id]);

  const availableCampaigns = campaigns
    .filter(campaign => !myTasks.some(t => t.campaign_id === campaign.id && t.status !== 'rejected'))
    .filter(campaign => {
      if (campaign.platform === 'diverse') return true;
      const link = profile?.[`${campaign.platform}_link`];
      return link && link.trim() !== "";
    });

  const hiddenByLinksCount = campaigns
    .filter(campaign => !myTasks.some(t => t.campaign_id === campaign.id && t.status !== 'rejected'))
    .filter(campaign => {
      if (campaign.platform === 'diverse') return false;
      const link = profile?.[`${campaign.platform}_link`];
      return !link || link.trim() === "";
    }).length;

  const loadData = async () => {
    try {
      // Load available campaigns using the secure view
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("available_campaigns_for_workers")
        .select("*")
        .eq("status", "active");

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Load my tasks with campaign details joined
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*, campaign:campaigns(*)")
        .eq("worker_id", user.id)
        .order("assigned_at", { ascending: false });

      if (tasksError) throw tasksError;
      setMyTasks(tasksData || []);

      // Load profile to check social links
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setProfile(profileData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  };

  const claimTask = async (campaign: AvailableCampaign) => {
    try {
      // Check if already has an ACTIVE task for this campaign
      const existing = myTasks.find(t => t.campaign_id === campaign.id && t.status !== 'rejected');
      if (existing) {
        toast.error("Você já tem uma tarefa em curso ou a aguardar revisão para esta campanha");
        return;
      }

      // Check if worker has the required social link
      if (campaign.platform !== 'diverse') {
        const platformLink = profile?.[`${campaign.platform}_link`];
        if (!platformLink) {
          toast.error(`Você precisa vincular seu ${campaign.platform} nas configurações antes de aceitar esta tarefa.`);
          return;
        }
      }

      // Use secure RPC function to claim task
      const { data: newTaskId, error } = await supabase.rpc("worker_claim_task", {
        p_campaign_id: campaign.id,
      });

      if (error) {
        console.error("RPC Error:", error);
        if (error.message.includes("já tem uma tarefa")) {
          toast.error("Você já tem uma tarefa para esta campanha");
        } else if (error.message.includes("atingiu o limite")) {
          toast.error("Esta campanha já atingiu o limite de tarefas");
        } else if (error.message.includes("não está ativa")) {
          toast.error("Esta campanha não está mais disponível");
        } else {
          toast.error("Erro ao reservar tarefa. Tente novamente.");
        }
        return;
      }

      toast.success("Tarefa reservada! Verifique 'As Minhas Tarefas em Curso' para finalizar.");

      loadData();
    } catch (error) {
      console.error("Error claiming task:", error);
      toast.error("Erro ao reservar tarefa");
    }
  };
  const handleDeleteTask = async (id: string) => {
    try {
      const {
        error
      } = await supabase.rpc("delete_item_immediately", {
        p_item_id: id,
        p_type: "task"
      });
      if (error) throw error;
      setMyTasks(prev => prev.filter(t => t.id !== id));
      toast.success("Registo apagado com sucesso.");
    } catch (error: any) {
      console.error("Error deleting task:", error);
      toast.error(`Erro ao excluir: ${error?.message || "Erro desconhecido"}`);
    }
  };

  const submitProofs = async (taskId: string, campaignPlanType: string) => {
    const isDiverse = activeTask?.campaign?.platform === 'diverse';

    if (!proofs.follow) {
      toast.error(isDiverse ? "O link de prova é obrigatório" : "O print de seguir é obrigatório");
      return;
    }

    if (!isDiverse && (campaignPlanType === "kwanza" || (activeTask?.campaign?.plan_type === "ta_no_limao" && activeTask?.campaign?.campaign_goal === "engagement"))) {
      if (!proofs.like || !proofs.comment) {
        toast.error("Os prints de seguir, gostar e comentar são obrigatórios para este objetivo");
        return;
      }
      if (campaignPlanType === "kwanza" && !proofs.share) {
        toast.error("Todos os 4 prints são obrigatórios para o plano Kwanza");
        return;
      }
    }

    if (!confirmAccount) {
      toast.error("Você deve confirmar que realizou a tarefa com a sua conta cadastrada");
      return;
    }

    setUploading(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: "pending_review",
          completed_at: new Date().toISOString(),
          follow_proof_url: isDiverse ? null : proofs.follow,
          like_proof_url: isDiverse ? null : proofs.like || null,
          comment_proof_url: isDiverse ? null : proofs.comment || null,
          share_proof_url: isDiverse ? null : proofs.share || null,
          submission_link: isDiverse ? proofs.follow : null, // repurposing proofs.follow as the link for diverse
        })
        .eq("id", taskId)
        .eq("worker_id", user.id);

      if (error) throw error;

      toast.success("Tarefa enviada para revisão!");
      setProofs({ follow: "", like: "", comment: "", share: "" });
      setSelectedCampaign(null);
      loadData();
      onTaskComplete();
    } catch (error) {
      console.error("Error submitting proofs:", error);
      toast.error("Erro ao enviar comprovantes");
    } finally {
      setUploading(false);
    }
  };

  const getPlatformEmoji = (platform: string) => {
    switch (platform) {
      case "facebook": return "📘";
      case "instagram": return "📸";
      case "tiktok": return "🎵";
      case "youtube": return "🎬";
      case "diverse": return "🌟";
      default: return "📱";
    }
  };

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-medium">
            <Clock className="w-3 h-3" />
            Em Progresso
          </span>
        );
      case "pending_review":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-medium">
            <Clock className="w-3 h-3" />
            Aguardando Revisão
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Aprovada
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Rejeitada
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }


  return (
    <div className="space-y-8">
      {/* My Active Tasks */}
      {myTasks.filter(t => t.status === "in_progress").length > 0 && (
        <div>
          <h2 className="font-display font-bold text-lg text-foreground mb-4">
            As Minhas Tarefas em Curso
          </h2>
          <div className="grid gap-4">
            {myTasks
              .filter(t => t.status === "in_progress")
              .map((task) => {
                const campaign = task.campaign;
                return (
                  <div key={task.id} className="card-premium-glow p-6 border-primary/30 group">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-4xl">
                          {getPlatformEmoji(campaign?.platform || "")}
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-xl text-foreground mb-1">
                            {campaign?.plan_type === "ta_no_limao" || campaign?.plan_type === "limao" ? "Tá no Limão" : "Kwanza"} - {campaign?.plan_name}
                          </h3>
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold uppercase tracking-widest text-[9px]">
                              {campaign?.platform}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-gold/10 border border-gold/20 text-gold font-black uppercase tracking-widest text-[9px]">
                              💰 {campaign?.platform === "diverse" && campaign?.reward_amount_override
                                ? formatPrice(campaign.reward_amount_override, profile?.country)
                                : (campaign?.reward ? formatPrice(campaign.reward, profile?.country) : "---")}
                            </span>
                            <a
                              href={campaign?.page_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1 font-bold"
                            >
                              ABRIR LINK <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-3">
                        <ActiveTaskTimer
                          taskId={task.id}
                          assignedAt={task.assigned_at!}
                          timeLimitMinutes={15}
                          onExpire={handleDeleteTask}
                        />
                        <button
                          onClick={() => {
                            setActiveTask(task);
                            setOpenTaskId(task.id);
                            setShowProofForm(false);
                            setHasOpenedLink(false);
                          }}
                          className="btn-primary w-full px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs shadow-neon transition-all active:scale-95"
                        >
                          <Upload className="w-4 h-4 mr-2 inline" />
                          Finalizar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Available Campaigns */}
      <div>
        <h2 className="font-display font-bold text-lg text-foreground mb-4">
          Tarefas Disponíveis
        </h2>

        {availableCampaigns.length === 0 ? (
          <div className="card-elevated p-12 text-center bg-card/10 backdrop-blur-md border border-white/5 rounded-3xl">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-20" />
            <h3 className="font-display font-black text-2xl text-white mb-2 uppercase tracking-tighter">
              Sem Tarefas no Radar
            </h3>
            <p className="text-sm text-muted-foreground max-w-[280px] mx-auto leading-relaxed">
              {hiddenByLinksCount > 0
                ? "Vincule as suas redes sociais nas definições para desbloquear novas oportunidades."
                : "A nossa equipa está a preparar novas missões para ti. Volta daqui a pouco!"}
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {hiddenByLinksCount > 0 && (
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center gap-3 backdrop-blur-sm animate-pulse-slow">
                <ShieldCheck className="w-5 h-5 text-primary" />
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.1em]">
                  {hiddenByLinksCount} missões ocultas! Conecta mais redes para lucrar mais.
                </p>
              </div>
            )}
            {availableCampaigns.map((campaign) => {
              const remaining = campaign.target_count - campaign.completed_count;
              const isYoutube = campaign.platform === "youtube";
              const isDiverse = campaign.platform === "diverse";
              const thumbnailUrl = isYoutube && campaign.video_id
                ? `https://img.youtube.com/vi/${campaign.video_id}/mqdefault.jpg`
                : null;

              return (
                <div
                  key={campaign.id}
                  className="group relative overflow-hidden rounded-3xl bg-card border border-white/5 hover:border-primary/30 transition-all duration-500 hover:shadow-[0_0_40px_-15px_rgba(132,255,46,0.15)] hover:-translate-y-1"
                >
                  {/* Glassmorphism Background Decoration */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-primary/10 transition-all duration-700" />

                  <div className="flex flex-col md:flex-row gap-6 p-1 relative z-10">
                    {/* Thumbnail/Icon Area */}
                    <div className="w-full md:w-56 h-36 relative rounded-2xl overflow-hidden shrink-0 bg-black/40 border border-white/5 shadow-inner">
                      {thumbnailUrl ? (
                        <>
                          <img
                            src={thumbnailUrl}
                            alt="Video Preview"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <div className="absolute bottom-2 left-2 bg-red-600/90 text-[8px] font-black text-white px-2 py-0.5 rounded-full uppercase tracking-tighter backdrop-blur-sm">
                            Youtube View
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-3xl shadow-inner group-hover:bg-primary/20 transition-all">
                            {getPlatformEmoji(campaign.platform)}
                          </div>
                          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{campaign.platform}</span>
                        </div>
                      )}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 flex flex-col py-3 px-5 md:px-0">
                      <div className="flex items-start justify-between mb-auto">
                        <div>
                          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">
                            {isDiverse ? "Missão Especial" : (campaign.plan_type === "ta_no_limao" ? "Missão Social" : "Missão YouTube")}
                          </p>
                          <h3 className="font-display font-black text-xl text-white tracking-tight leading-tight group-hover:text-primary transition-colors">
                            {campaign.plan_name}
                          </h3>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Recompensa</p>
                          <p className="text-2xl font-black text-white tracking-tighter">
                            {isDiverse && campaign.reward_amount_override
                              ? formatPrice(campaign.reward_amount_override, profile?.country)
                              : (campaign.reward ? formatPrice(campaign.reward, profile?.country) : "---")}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-4">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                          <Users className="w-3 h-3 text-primary" />
                          {remaining} vagas disponíveis
                        </div>
                        <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-tighter">
                          {isDiverse ? "Missão Manual" : (campaign.campaign_goal === "engagement" ? "Gostar + Comentar" : "Subscrição Directa")}
                        </div>
                      </div>
                    </div>

                    {/* Action Area */}
                    <div className="flex items-center p-4 md:p-6 md:border-l border-white/5">
                      <button
                        onClick={() => claimTask(campaign)}
                        className="w-full md:w-auto h-14 md:h-24 px-8 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-[0.1em] text-xs shadow-neon hover:scale-105 active:scale-95 transition-all duration-300 md:[writing-mode:vertical-lr] md:rotate-180 flex items-center justify-center"
                      >
                        Começar Agora
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task History */}
      {
        myTasks.filter(t => t.status !== "in_progress" && t.status !== "available").length > 0 && (
          <div>
            <h2 className="font-display font-bold text-lg text-foreground mb-4">
              Histórico de Tarefas
            </h2>
            <div className="grid gap-4">
              {myTasks
                .filter(t => t.status !== "in_progress" && t.status !== "available")
                .slice(0, 10)
                .map((task) => {
                  const campaign = task.campaign;
                  return (
                    <div key={task.id} className="card-premium-glow p-4 flex items-center justify-between border-border bg-card/20">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-card/40 flex items-center justify-center text-xl">
                          {getPlatformEmoji(campaign?.platform || "")}
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">
                            {campaign?.plan_type === "ta_no_limao" || campaign?.plan_type === "limao" ? "Tá no Limão" : "Kwanza"} - {campaign?.plan_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                            {formatPrice(task.reward_amount, profile?.country)} • {new Date(task.completed_at || "").toLocaleDateString()}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {getTaskStatusBadge(task.status)}
                            {task.rejection_reason && (
                              <span className="text-[10px] text-destructive font-medium uppercase truncate max-w-[150px]">{task.rejection_reason}</span>
                            )}
                          </div>
                          {task.status === "rejected" && (
                            <div className="mt-2">
                              <CountdownTimer
                                scheduledDeletionAt={task.scheduled_deletion_at}
                                onExpire={() => handleDeleteTask(task.id)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right whitespace-nowrap">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                            {task.status === "rejected" ? "Recompensa" : "Recebido"}
                          </p>
                          <p className={`font-black ${task.status === "rejected" ? "text-muted-foreground/50 line-through" : "text-foreground"}`}>
                            {task.status === "rejected" ? formatPrice(0, profile?.country) : formatPrice(task.reward_amount, profile?.country)}
                          </p>
                        </div>
                        {task.status === "rejected" ? (
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="w-10 h-10 rounded-xl bg-destructive/10 hover:bg-destructive text-destructive hover:text-white flex items-center justify-center transition-all group"
                            title="Remover e Tentar Novamente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-card/40 flex items-center justify-center">
                            <ExternalLink className="w-3 h-3 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )
      }
      {/* Single Controlled Dialog for Task Completion */}
      <Dialog open={!!openTaskId} onOpenChange={(open) => {
        if (!open) {
          setOpenTaskId(null);
          setActiveTask(null);
          setShowProofForm(false);
          setHasOpenedLink(false);
        }
      }}>
        <DialogContent className="sm:max-w-lg bg-background/95 backdrop-blur-xl border-border shadow-2xl max-h-[95vh] overflow-y-auto p-0 gap-0">
          {activeTask && (
            <>
              <div className="p-6 border-b border-border">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black font-display text-foreground uppercase tracking-tight">
                    {showProofForm ? "Enviar Comprovativos" : "Completar Tarefa"}
                  </DialogTitle>
                </DialogHeader>
              </div>

              <div className="p-6 space-y-6">
                {!showProofForm ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTask.campaign?.platform === 'diverse' ? (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-primary/5 border border-primary/20 p-6 rounded-2xl">
                          <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Instruções da Missão
                          </h4>
                          <div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            {activeTask.campaign?.description}
                          </div>
                        </div>

                        <div className="bg-card/40 border border-border p-5 rounded-2xl">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">O teu progresso</p>
                          <p className="text-xs text-muted-foreground mb-4">
                            Depois de realizares o que foi pedido acima, cola o link do post ou vídeo como prova.
                          </p>
                          <button
                            onClick={() => setShowProofForm(true)}
                            className="btn-primary w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-neon active:scale-95 transition-all"
                          >
                            Entendi, vou realizar a tarefa!
                          </button>
                        </div>
                      </div>
                    ) : activeTask.campaign?.plan_type === "kwanza" ? (
                      <YouTubeTaskPlayer
                        campaign={activeTask.campaign}
                        taskId={activeTask.id}
                        userId={user.id}
                        onComplete={() => {
                          setOpenTaskId(null);
                          loadData();
                        }}
                      />
                    ) : (
                      <>
                        <div className="bg-primary/10 border border-primary/20 p-6 rounded-2xl text-center">
                          <h4 className="text-lg font-bold text-foreground mb-2">Paso 1: Siga o Link</h4>
                          <p className="text-sm text-muted-foreground mb-6">
                            Para concluir esta tarefa, você deve obrigatoriamente seguir o link abaixo e realizar a ação solicitada.
                          </p>
                          <a
                            href={activeTask.campaign?.page_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setHasOpenedLink(true)}
                            className="btn-primary inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm shadow-neon group"
                          >
                            ABRIR MISSÃO <ExternalLink className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                          </a>
                        </div>

                        <div className="bg-card/40 border border-border p-5 rounded-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                              <AlertCircle className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Dica Importante</p>
                              <p className="text-xs text-muted-foreground leading-tight">
                                Tire prints da conclusão da tarefa para enviar no próximo passo.
                              </p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setShowProofForm(true)}
                          disabled={!hasOpenedLink}
                          className="btn-gold w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-gold-premium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {hasOpenedLink ? "JÁ SEGUI / CONCLUÍ" : "SIGA O LINK PRIMEIRO"}
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                    <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-12 -mt-12" />
                      <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs mb-3">
                        <ShieldCheck className="w-4 h-4" />
                        Autenticação da Atividade
                      </div>
                      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                        Esta tarefa deve ser realizada obrigatoriamente pela conta vinculada:
                      </p>
                      <div className="bg-card/40 border border-border p-3 rounded-xl flex items-center justify-between gap-2 overflow-hidden group hover:border-primary/50 transition-all">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                            <UserIcon className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-xs font-black font-mono truncate text-foreground">
                            {activeTask.campaign?.platform === 'diverse'
                              ? (profile?.full_name || profile?.username || user.email)
                              : (profile?.[`${activeTask.campaign?.platform}_link`] || "CONTA NÃO VINCULADA")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Platform-specific proof inputs */}
                      {activeTask.campaign?.platform === "diverse" ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest ml-1">Link do Post/Vídeo (Prova)</label>
                            <Input
                              value={proofs.follow}
                              onChange={(e) => setProofs({ ...proofs, follow: e.target.value })}
                              placeholder="https://sua-rede-social.com/post/..."
                              className="bg-white/5 border-white/10 h-14 text-sm text-white focus:border-primary rounded-2xl"
                            />
                            <p className="text-[10px] text-muted-foreground italic ml-1">
                              O Admin irá verificar manualmente o link enviado.
                            </p>
                          </div>
                        </div>
                      ) : activeTask.campaign?.platform === "youtube" && activeTask.campaign?.video_id ? (
                        <YouTubeTaskPlayer
                          campaign={activeTask.campaign}
                          taskId={activeTask.id}
                          userId={user.id}
                          onComplete={() => {
                            setOpenTaskId(null);
                            setActiveTask(null);
                            setShowProofForm(false);
                            loadData();
                            onTaskComplete();
                          }}
                        />
                      ) : (
                        <>
                          <FileUpload
                            userId={user.id}
                            taskId={activeTask.id}
                            proofType="follow"
                            label="Print de Confirmação (Seguir)"
                            required
                            value={proofs.follow}
                            onChange={(url) => setProofs({ ...proofs, follow: url })}
                          />

                          {(activeTask.campaign?.plan_type === "kwanza" || activeTask.campaign?.campaign_goal === "engagement" || (activeTask.campaign?.plan_type !== "ta_no_limao" && activeTask.campaign?.plan_type !== "limao")) && (
                            <div className="grid grid-cols-1 gap-4">
                              <FileUpload
                                userId={user.id}
                                taskId={activeTask.id}
                                proofType="like"
                                label="Print de Gostar (Reacção)"
                                required
                                value={proofs.like}
                                onChange={(url) => setProofs({ ...proofs, like: url })}
                              />
                              <FileUpload
                                userId={user.id}
                                taskId={activeTask.id}
                                proofType="comment"
                                label="Print de Comentário Positivo"
                                required
                                value={proofs.comment}
                                onChange={(url) => setProofs({ ...proofs, comment: url })}
                              />
                              {(activeTask.campaign?.plan_type === "kwanza" || (activeTask.campaign?.plan_type !== "ta_no_limao" && activeTask.campaign?.plan_type !== "limao")) && (
                                <FileUpload
                                  userId={user.id}
                                  taskId={activeTask.id}
                                  proofType="share"
                                  label="Print de Partilhar"
                                  required
                                  value={proofs.share}
                                  onChange={(url) => setProofs({ ...proofs, share: url })}
                                />
                              )}
                            </div>
                          )}
                        </>
                      )}

                      {/* Shared confirmation + submit (for diverse and social tasks, not YouTube auto-complete) */}
                      {!(activeTask.campaign?.platform === "youtube" && activeTask.campaign?.video_id) && (
                        <>
                          <div className="flex items-start space-x-3 p-4 bg-card/40 border border-border rounded-2xl group cursor-pointer hover:bg-card/60 transition-all">
                            <Checkbox
                              id="confirm-account"
                              checked={confirmAccount}
                              onCheckedChange={(checked) => setConfirmAccount(checked === true)}
                              className="mt-1 border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                            <Label
                              htmlFor="confirm-account"
                              className="text-[10px] font-bold text-muted-foreground leading-relaxed cursor-pointer group-hover:text-foreground transition-colors"
                            >
                              DECLARO SOB PENA DE BLOQUEIO QUE REALIZEI A TAREFA USANDO A CONTA ACIMA E SEGUINDO TODAS AS DIRETRIZES DA PLATAFORMA.
                            </Label>
                          </div>

                          <button
                            onClick={() => submitProofs(activeTask.id, activeTask.campaign?.plan_type || "ta_no_limao")}
                            disabled={uploading || !confirmAccount || !proofs.follow}
                            className="btn-primary w-full h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-neon disabled:opacity-30 disabled:cursor-not-allowed group transition-all"
                          >
                            {uploading ? (
                              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mx-auto" />
                            ) : (
                              <span className="flex items-center justify-center gap-2">
                                <CheckCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                {activeTask.campaign?.platform === "diverse" ? "Enviar Link" : "Submeter Comprovativos"}
                              </span>
                            )}
                          </button>

                          <button
                            onClick={() => setShowProofForm(false)}
                            className="w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors py-2"
                          >
                            Voltar para Instruções
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default TasksList;

