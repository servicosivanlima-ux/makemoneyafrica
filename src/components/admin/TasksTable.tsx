import { useState } from "react";
import { Check, X, Eye, Loader2, ExternalLink } from "lucide-react";
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

interface Task {
  id: string;
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
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update task status
      const { error: taskError } = await supabase
        .from("tasks")
        .update({ 
          status: "approved",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq("id", task.id);

      if (taskError) throw taskError;

      // Update campaign completed count
      const { data: taskData } = await supabase
        .from("tasks")
        .select("campaign_id")
        .eq("id", task.id)
        .single();

      if (taskData) {
        const { data: campaignData } = await supabase
          .from("campaigns")
          .select("completed_count")
          .eq("id", taskData.campaign_id)
          .single();

        if (campaignData) {
          await supabase
            .from("campaigns")
            .update({ completed_count: (campaignData.completed_count || 0) + 1 })
            .eq("id", taskData.campaign_id);
        }
      }

      // Send notification to worker
      if (task.worker) {
        const { data: taskData } = await supabase
          .from("tasks")
          .select("worker_id")
          .eq("id", task.id)
          .single();

        if (taskData) {
          await supabase.from("notifications").insert({
            user_id: taskData.worker_id,
            title: "Tarefa Aprovada!",
            message: `Sua tarefa foi aprovada. ${task.reward_amount} Kz foram adicionados ao seu saldo.`
          });
        }
      }

      toast.success("Tarefa aprovada com sucesso!");
      onRefresh();
    } catch (error) {
      console.error("Error approving task:", error);
      toast.error("Erro ao aprovar tarefa");
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
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("tasks")
        .update({ 
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          rejection_reason: rejectReason
        })
        .eq("id", taskToReject.id);

      if (error) throw error;

      // Send notification to worker
      const { data: taskData } = await supabase
        .from("tasks")
        .select("worker_id")
        .eq("id", taskToReject.id)
        .single();

      if (taskData) {
        await supabase.from("notifications").insert({
          user_id: taskData.worker_id,
          title: "Tarefa Rejeitada",
          message: `Sua tarefa foi rejeitada. Motivo: ${rejectReason}`
        });
      }

      toast.success("Tarefa rejeitada");
      setShowRejectDialog(false);
      setRejectReason("");
      setTaskToReject(null);
      onRefresh();
    } catch (error) {
      console.error("Error rejecting task:", error);
      toast.error("Erro ao rejeitar tarefa");
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
                  Ações
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
                    <span className="font-semibold text-gold">{task.reward_amount} Kz</span>
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
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Link da página:</span>
                <a 
                  href={selectedTask.campaign?.page_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  Abrir <ExternalLink className="w-3 h-3" />
                </a>
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
              placeholder="Ex: Print não corresponde à ação solicitada..."
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
