import { useState } from "react";
import { Ban, CheckCircle, Eye, Loader2, ExternalLink } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  user_type: string;
  is_blocked: boolean;
  blocked_reason: string | null;
  device_hash: string | null;
  facebook_link: string | null;
  instagram_link: string | null;
  tiktok_link: string | null;
  youtube_link: string | null;
  created_at: string;
}

interface UsersTableProps {
  users: Profile[];
  onRefresh: () => void;
}

const UsersTable = ({ users, onRefresh }: UsersTableProps) => {
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [userToBlock, setUserToBlock] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "clients" | "workers">("all");

  const filteredUsers = users.filter(user => {
    if (activeTab === "all") return true;
    if (activeTab === "clients") return user.user_type === "client";
    if (activeTab === "workers") return user.user_type === "worker";
    return true;
  });

  const handleBlock = async () => {
    if (!userToBlock) return;

    setProcessing(userToBlock.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_blocked: true,
          blocked_reason: blockReason || "Bloqueado pelo administrador"
        })
        .eq("id", userToBlock.id);

      if (error) throw error;

      // Block device if hash exists
      if (userToBlock.device_hash) {
        await supabase.from("blocked_devices").upsert({
          device_hash: userToBlock.device_hash,
          reason: blockReason || "Usuário bloqueado",
          blocked_by: user?.id
        }, { onConflict: "device_hash" });
      }

      // Send notification
      await supabase.from("notifications").insert({
        user_id: userToBlock.user_id,
        title: "Conta Bloqueada",
        message: `Sua conta foi bloqueada. Motivo: ${blockReason || "Violação dos termos de uso"}`
      });

      toast.success("Usuário bloqueado com sucesso");
      setShowBlockDialog(false);
      setBlockReason("");
      setUserToBlock(null);
      onRefresh();
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("Erro ao bloquear usuário");
    } finally {
      setProcessing(null);
    }
  };

  const handleUnblock = async (user: Profile) => {
    setProcessing(user.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          is_blocked: false,
          blocked_reason: null
        })
        .eq("id", user.id);

      if (error) throw error;

      // Unblock device if hash exists
      if (user.device_hash) {
        await supabase
          .from("blocked_devices")
          .delete()
          .eq("device_hash", user.device_hash);
      }

      // Send notification
      await supabase.from("notifications").insert({
        user_id: user.user_id,
        title: "Conta Desbloqueada",
        message: "Sua conta foi desbloqueada. Você pode voltar a usar a plataforma normalmente."
      });

      toast.success("Usuário desbloqueado");
      onRefresh();
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast.error("Erro ao desbloquear usuário");
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-AO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const getUserTypeLabel = (type: string) => {
    return type === "client" ? "Cliente" : "Trabalhador";
  };

  const getUserTypeColor = (type: string) => {
    return type === "client" 
      ? "bg-blue-500/10 text-blue-500" 
      : "bg-green-500/10 text-green-500";
  };

  return (
    <>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "all" | "clients" | "workers")}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">Todos ({users.length})</TabsTrigger>
          <TabsTrigger value="clients">
            Clientes ({users.filter(u => u.user_type === "client").length})
          </TabsTrigger>
          <TabsTrigger value="workers">
            Trabalhadores ({users.filter(u => u.user_type === "worker").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {filteredUsers.length === 0 ? (
            <div className="card-elevated p-8 text-center">
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="card-elevated overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Telefone
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Cadastro
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-foreground">{user.full_name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getUserTypeColor(user.user_type)}`}>
                            {getUserTypeLabel(user.user_type)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-muted-foreground">{user.phone}</span>
                        </td>
                        <td className="px-4 py-4">
                          {user.is_blocked ? (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-500">
                              Bloqueado
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-500">
                              Ativo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-muted-foreground">{formatDate(user.created_at)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="p-2 rounded-lg hover:bg-muted transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            </button>
                            {user.is_blocked ? (
                              <button
                                onClick={() => handleUnblock(user)}
                                disabled={processing === user.id}
                                className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                                title="Desbloquear"
                              >
                                {processing === user.id ? (
                                  <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setUserToBlock(user);
                                  setShowBlockDialog(true);
                                }}
                                disabled={processing === user.id}
                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                title="Bloquear"
                              >
                                <Ban className="w-4 h-4 text-red-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>
              Informações completas do perfil
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nome</p>
                  <p className="font-medium">{selectedUser.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{selectedUser.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">{getUserTypeLabel(selectedUser.user_type)}</p>
                </div>
              </div>
              
              {selectedUser.user_type === "worker" && (
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium mb-2">Redes Sociais</p>
                  <div className="space-y-2">
                    {selectedUser.facebook_link && (
                      <a 
                        href={selectedUser.facebook_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
                      >
                        Facebook <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {selectedUser.instagram_link && (
                      <a 
                        href={selectedUser.instagram_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-pink-500 hover:underline"
                      >
                        Instagram <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {selectedUser.tiktok_link && (
                      <a 
                        href={selectedUser.tiktok_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-slate-400 hover:underline"
                      >
                        TikTok <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {selectedUser.youtube_link && (
                      <a 
                        href={selectedUser.youtube_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-red-500 hover:underline"
                      >
                        YouTube <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {selectedUser.is_blocked && selectedUser.blocked_reason && (
                <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <p className="text-sm font-medium text-red-500">Motivo do bloqueio:</p>
                  <p className="text-sm text-red-400">{selectedUser.blocked_reason}</p>
                </div>
              )}

              {selectedUser.device_hash && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Device Hash:</p>
                  <p className="text-xs font-mono text-foreground break-all">{selectedUser.device_hash}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Block User Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear Usuário</DialogTitle>
            <DialogDescription>
              Esta ação irá bloquear o usuário e seu dispositivo (se disponível)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Motivo do bloqueio (opcional)..."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBlockDialog(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleBlock}
                disabled={processing !== null}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Bloquear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UsersTable;
