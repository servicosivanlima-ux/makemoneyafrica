import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { ExternalLink, Upload, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  target_count: number;
  completed_count: number;
  status: string;
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
  campaign?: AvailableCampaign;
}

const TasksList = ({ user, onTaskComplete }: TasksListProps) => {
  const [campaigns, setCampaigns] = useState<AvailableCampaign[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<AvailableCampaign | null>(null);
  const [uploading, setUploading] = useState(false);
  const [proofs, setProofs] = useState({
    follow: "",
    like: "",
    comment: "",
    share: "",
  });

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    try {
      // Load available campaigns using the secure view
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("available_campaigns_for_workers")
        .select("*")
        .eq("status", "active");

      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);

      // Load my tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("worker_id", user.id)
        .order("assigned_at", { ascending: false });

      if (tasksError) throw tasksError;
      setMyTasks(tasksData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  };

  const claimTask = async (campaign: AvailableCampaign) => {
    try {
      // Check if already has task for this campaign
      const existing = myTasks.find(t => t.campaign_id === campaign.id);
      if (existing) {
        toast.error("Você já tem uma tarefa para esta campanha");
        return;
      }

      // Use secure RPC function to claim task
      const { data, error } = await supabase.rpc("worker_claim_task", {
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

      toast.success("Tarefa reservada! Complete-a em até 24 horas.");
      setSelectedCampaign(campaign);
      loadData();
    } catch (error) {
      console.error("Error claiming task:", error);
      toast.error("Erro ao reservar tarefa");
    }
  };

  const submitProofs = async (taskId: string, campaignPlanType: string) => {
    if (!proofs.follow) {
      toast.error("O print de seguir é obrigatório");
      return;
    }

    if (campaignPlanType === "kwanza") {
      if (!proofs.like || !proofs.comment || !proofs.share) {
        toast.error("Todos os 4 prints são obrigatórios para o plano Kwanza");
        return;
      }
    }

    setUploading(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: "pending_review",
          completed_at: new Date().toISOString(),
          follow_proof_url: proofs.follow,
          like_proof_url: proofs.like || null,
          comment_proof_url: proofs.comment || null,
          share_proof_url: proofs.share || null,
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
            Minhas Tarefas em Andamento
          </h2>
          <div className="grid gap-4">
            {myTasks
              .filter(t => t.status === "in_progress")
              .map((task) => {
                const campaign = campaigns.find(c => c.id === task.campaign_id);
                return (
                  <div key={task.id} className="card-glow p-5 border-primary/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <span className="text-3xl">{getPlatformEmoji(campaign?.platform || "")}</span>
                        <div>
                          <h3 className="font-display font-bold text-foreground">
                            {campaign?.plan_type === "limao" ? "Tá no Limão" : "Kwanza"} - {campaign?.plan_name}
                          </h3>
                          <a 
                            href={campaign?.page_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            Abrir Link <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Recompensa</div>
                          <div className="font-bold text-gradient-gold">{task.reward_amount} Kz</div>
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <button 
                              onClick={() => setSelectedCampaign(campaign || null)}
                              className="btn-primary"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Enviar Prints
                            </button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                              <DialogTitle>Enviar Comprovantes</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                  Print de Seguir *
                                </label>
                                <input
                                  type="url"
                                  value={proofs.follow}
                                  onChange={(e) => setProofs({ ...proofs, follow: e.target.value })}
                                  placeholder="Cole o link do print (Google Drive, Imgur, etc.)"
                                  className="input-styled w-full"
                                />
                              </div>

                              {campaign?.plan_type === "kwanza" && (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                      Print de Curtir *
                                    </label>
                                    <input
                                      type="url"
                                      value={proofs.like}
                                      onChange={(e) => setProofs({ ...proofs, like: e.target.value })}
                                      placeholder="Cole o link do print"
                                      className="input-styled w-full"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                      Print de Comentar *
                                    </label>
                                    <input
                                      type="url"
                                      value={proofs.comment}
                                      onChange={(e) => setProofs({ ...proofs, comment: e.target.value })}
                                      placeholder="Cole o link do print"
                                      className="input-styled w-full"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                      Print de Partilhar *
                                    </label>
                                    <input
                                      type="url"
                                      value={proofs.share}
                                      onChange={(e) => setProofs({ ...proofs, share: e.target.value })}
                                      placeholder="Cole o link do print"
                                      className="input-styled w-full"
                                    />
                                  </div>
                                </>
                              )}

                              <div className="bg-muted/50 p-3 rounded-lg">
                                <p className="text-xs text-muted-foreground">
                                  Dica: Use serviços como Google Drive, Dropbox ou Imgur para hospedar suas imagens e cole o link aqui.
                                </p>
                              </div>

                              <button
                                onClick={() => submitProofs(task.id, campaign?.plan_type || "limao")}
                                disabled={uploading}
                                className="btn-primary w-full"
                              >
                                {uploading ? (
                                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  "Enviar para Revisão"
                                )}
                              </button>
                            </div>
                          </DialogContent>
                        </Dialog>
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
        
        {campaigns.length === 0 ? (
          <div className="card-elevated p-6 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display font-bold text-foreground mb-2">
              Nenhuma tarefa disponível
            </h3>
            <p className="text-sm text-muted-foreground">
              Volte mais tarde para ver novas oportunidades de trabalho.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => {
              const alreadyClaimed = myTasks.some(t => t.campaign_id === campaign.id);
              const remaining = campaign.target_count - campaign.completed_count;

              return (
                <div key={campaign.id} className="card-elevated p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <span className="text-3xl">{getPlatformEmoji(campaign.platform)}</span>
                      <div>
                        <h3 className="font-display font-bold text-foreground">
                          {campaign.plan_type === "limao" ? "Tá no Limão" : "Kwanza"} - {campaign.plan_name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-1">
                          {campaign.platform.charAt(0).toUpperCase() + campaign.platform.slice(1)} • {remaining} vagas restantes
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {campaign.plan_type === "limao" 
                            ? "Seguir a página" 
                            : "Seguir + Curtir + Comentar + Partilhar"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Recompensa</div>
                        <div className="font-bold text-gradient-gold">
                          {campaign.plan_type === "limao" ? "100" : "200"} Kz
                        </div>
                      </div>
                      <button
                        onClick={() => claimTask(campaign)}
                        disabled={alreadyClaimed}
                        className={alreadyClaimed ? "btn-secondary opacity-50" : "btn-gold"}
                      >
                        {alreadyClaimed ? "Já reservada" : "Reservar"}
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
      {myTasks.filter(t => t.status !== "in_progress" && t.status !== "available").length > 0 && (
        <div>
          <h2 className="font-display font-bold text-lg text-foreground mb-4">
            Histórico de Tarefas
          </h2>
          <div className="card-elevated divide-y divide-border">
            {myTasks
              .filter(t => t.status !== "in_progress" && t.status !== "available")
              .slice(0, 10)
              .map((task) => {
                const campaign = campaigns.find(c => c.id === task.campaign_id);
                return (
                  <div key={task.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getPlatformEmoji(campaign?.platform || "")}</span>
                      <div>
                        <p className="font-medium text-foreground text-sm">
                          {campaign?.plan_type === "limao" ? "Tá no Limão" : "Kwanza"} - {campaign?.plan_name}
                        </p>
                        {task.rejection_reason && (
                          <p className="text-xs text-destructive">{task.rejection_reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold text-foreground">{task.reward_amount} Kz</div>
                      </div>
                      {getTaskStatusBadge(task.status)}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksList;
