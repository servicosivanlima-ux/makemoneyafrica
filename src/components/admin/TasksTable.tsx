import { useState } from "react";
import { Check, X, Eye, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatPrice as displayPrice } from "@/lib/currency-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Task {
  id: string;
  worker_id: string | null;
  status: string;
  reward_amount: number;
  follow_proof_url: string | null;
  like_proof_url: string | null;
  comment_proof_url: string | null;
  share_proof_url: string | null;
  completed_at: string | null;
  campaign: {
    plan_type: string;
    plan_name: string;
    platform: string;
    page_link: string;
  } | null;
  worker: {
    full_name: string;
    email: string;
    country: string | null;
    facebook_link?: string | null;
    instagram_link?: string | null;
    tiktok_link?: string | null;
    youtube_link?: string | null;
  } | null;
}

interface TasksTableProps {
  tasks: Task[];
  onRefresh: () => void;
}

const TasksTable = ({ tasks, onRefresh }: TasksTableProps) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [taskToReject, setTaskToReject] = useState<Task | null>(null);

  const handleApprove = async (task: Task) => {
    setProcessing(task.id);
    try {
      // Use secure server-side function
      const { error } = await supabase.rpc('admin_approve_task', {
        p_task_id: task.id
      });

      if (error) throw error;

      // Send notification to worker
      if (task.worker_id) {
        const formattedReward = displayPrice(task.reward_amount, task.worker?.country || "AO");
        await supabase.from("notifications" as any).insert({
          user_id: task.worker_id,
          title: "Tarefa Aprovada!",
          message: `A sua tarefa foi aprovada. ${formattedReward} foram adicionados ao seu saldo.`,
          is_read: false,
          link: "/dashboard/worker/tasks"
        });
      }

      toast.success("Tarefa aprovada com sucesso!");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao aprovar tarefa");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!taskToReject || !rejectReason.trim()) {
      toast.error("Por favor, informe o motivo da rejeição");
      return;
    }

    setProcessing(taskToReject.id);
    try {
      // Use secure server-side function
      const { error } = await supabase.rpc('admin_reject_task', {
        p_task_id: taskToReject.id,
        p_reason: rejectReason
      });

      if (error) throw error;

      // Send notification to worker
      if (taskToReject.worker_id) {
        await supabase.from("notifications" as any).insert({
          user_id: taskToReject.worker_id,
          title: "Tarefa Rejeitada",
          message: `A sua tarefa foi rejeitada. Motivo: ${rejectReason}`,
          is_read: false,
          link: "/dashboard/worker/tasks"
        });
      }

      toast.success("Tarefa rejeitada");
      setShowRejectDialog(false);
      setRejectReason("");
      setTaskToReject(null);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Erro ao rejeitar tarefa");
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

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      facebook: "bg-blue-500/10 text-blue-500",
      instagram: "bg-pink-500/10 text-pink-500",
      tiktok: "bg-slate-500/10 text-slate-400",
      youtube: "bg-red-500/10 text-red-500"
    };
    return colors[platform] || "bg-muted text-muted-foreground";
  };

  if (tasks.length === 0) {
    return (
      <div className="card-elevated p-8 text-center">
        <p className="text-muted-foreground">Nenhuma tarefa para revisar</p>
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
                  Campanha
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Plataforma
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Recompensa
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Data
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Acções
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-foreground">{task.worker?.full_name || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">{task.worker?.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-medium text-foreground">{task.campaign?.plan_name}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getPlatformColor(task.campaign?.platform || "")}`}>
                      {task.campaign?.platform}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-semibold text-gold">{displayPrice(task.reward_amount, task.worker?.country || "AO")}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-muted-foreground">
                      {task.completed_at ? formatDate(task.completed_at) : "N/A"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                        title="Ver prints"
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleApprove(task)}
                        disabled={processing === task.id}
                        className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                        title="Aprovar"
                      >
                        {processing === task.id ? (
                          <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 text-green-500" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setTaskToReject(task);
                          setShowRejectDialog(true);
                        }}
                        disabled={processing === task.id}
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

      {/* View Proofs Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comprovantes da Tarefa</DialogTitle>
            <DialogDescription>
              Verifique os prints enviados pelo trabalhador
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Link da Campanha:</span>
                  <a
                    href={selectedTask.campaign?.page_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm font-medium"
                  >
                    Abrir Campanha <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Perfil do Trabalhador */}
                {(() => {
                  const platform = selectedTask.campaign?.platform;
                  let workerSocialLink = null;
                  let platformLabel = "Social";

                  if (platform === 'facebook') {
                    workerSocialLink = selectedTask.worker?.facebook_link;
                    platformLabel = "Facebook";
                  } else if (platform === 'instagram') {
                    workerSocialLink = selectedTask.worker?.instagram_link;
                    platformLabel = "Instagram";
                  } else if (platform === 'tiktok') {
                    workerSocialLink = selectedTask.worker?.tiktok_link;
                    platformLabel = "TikTok";
                  } else if (platform === 'youtube') {
                    workerSocialLink = selectedTask.worker?.youtube_link;
                    platformLabel = "YouTube";
                  }

                  if (!workerSocialLink) return null;

                  return (
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary">Perfil do Trabalhador:</span>
                      <a
                        href={workerSocialLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 text-sm font-bold bg-primary/10 px-2 py-1 rounded"
                      >
                        Abrir Canal {platformLabel} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {selectedTask.follow_proof_url && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Seguiu</p>
                    <a href={selectedTask.follow_proof_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={selectedTask.follow_proof_url}
                        alt="Prova de seguir"
                        className="w-full h-40 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity"
                      />
                    </a>
                  </div>
                )}
                {selectedTask.like_proof_url && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Curtiu</p>
                    <a href={selectedTask.like_proof_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={selectedTask.like_proof_url}
                        alt="Prova de curtir"
                        className="w-full h-40 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity"
                      />
                    </a>
                  </div>
                )}
                {selectedTask.comment_proof_url && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Comentou</p>
                    <a href={selectedTask.comment_proof_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={selectedTask.comment_proof_url}
                        alt="Prova de comentar"
                        className="w-full h-40 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity"
                      />
                    </a>
                  </div>
                )}
                {selectedTask.share_proof_url && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Partilhou</p>
                    <a href={selectedTask.share_proof_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={selectedTask.share_proof_url}
                        alt="Prova de partilhar"
                        className="w-full h-40 object-cover rounded-lg border border-border hover:opacity-80 transition-opacity"
                      />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Tarefa</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Ex: Print não corresponde à acção solicitada..."
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

export default TasksTable;
