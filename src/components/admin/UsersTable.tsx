import { useState } from "react";
import { Ban, CheckCircle, Eye, Loader2, ExternalLink, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  user_type: string;
  account_type: string | null;
  company_name: string | null;
  nif: string | null;
  country: string | null;
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

const phoneConfigs: Record<string, { prefix: string }> = {
  AO: { prefix: "+244" },
  PT: { prefix: "+351" },
  MZ: { prefix: "+258" },
  BR: { prefix: "+55" },
};

const UsersTable = ({ users, onRefresh }: UsersTableProps) => {
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [userToBlock, setUserToBlock] = useState<Profile | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [userToEdit, setUserToEdit] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    account_type: "personal",
    company_name: "",
    nif: "",
    country: "AO"
  });
  const [activeTab, setActiveTab] = useState<"all" | "clients" | "workers">("all");

  const filteredUsers = users.filter(user => {
    if (user.user_type === "admin") return false;
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
          reason: blockReason || "Utilizador bloqueado",
          blocked_by: user?.id
        }, { onConflict: "device_hash" });
      }

      // Send notification
      await supabase.from("notifications" as any).insert({
        user_id: userToBlock.user_id,
        title: "Conta Bloqueada",
        message: `A sua conta foi bloqueada. Motivo: ${blockReason || "Violação dos termos de uso"}`
      });

      toast.success("Utilizador bloqueado com sucesso");
      setShowBlockDialog(false);
      setBlockReason("");
      setUserToBlock(null);
      onRefresh();
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("Erro ao bloquear utilizador");
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
      await supabase.from("notifications" as any).insert({
        user_id: user.user_id,
        title: "Conta Desbloqueada",
        message: "A sua conta foi desbloqueada. Pode voltar a usar a plataforma normalmente."
      });

      toast.success("Utilizador desbloqueado");
      onRefresh();
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast.error("Erro ao desbloquear utilizador");
    } finally {
      setProcessing(null);
    }
  };

  const handleEdit = (user: Profile) => {
    setSelectedUser(null);
    setEditForm({
      full_name: user.full_name || "",
      phone: user.phone || "",
      account_type: (user.account_type as any) || "personal",
      company_name: user.company_name || "",
      nif: user.nif || "",
      country: user.country || "AO"
    });
    setUserToEdit(user);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!userToEdit) return;

    // Validation
    if (userToEdit.user_type === "client" && editForm.account_type === "company") {
      const nif = editForm.nif.replace(/\D/g, "");
      const nifRegex = /^(\d{9}|\d{10}|\d{11})$/;

      if (!nifRegex.test(nif)) {
        toast.error("O NIF/CPF deve conter 9, 10 ou 11 dígitos numéricos");
        return;
      }

      const rules: Record<string, { len: number, name: string }> = {
        "PT": { len: 9, name: "NIF (Portugal)" },
        "MZ": { len: 9, name: "NUIT (Moçambique)" },
        "AO": { len: 10, name: "NIF (Angola)" },
        "BR": { len: 11, name: "CPF (Brasil)" }
      };

      const rule = rules[editForm.country];
      if (rule && nif.length !== rule.len) {
        toast.error(`Formato inválido: O ${rule.name} deve ter exatamente ${rule.len} dígitos`);
        return;
      }
    }

    setProcessing(userToEdit.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          phone: editForm.phone,
          account_type: editForm.account_type,
          company_name: editForm.account_type === "company" ? editForm.company_name : null,
          nif: editForm.account_type === "company" ? editForm.nif : null,
          country: editForm.country
        })
        .eq("id", userToEdit.id);

      if (error) throw error;

      toast.success("Utilizador actualizado com sucesso");
      setShowEditDialog(false);
      onRefresh();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(`Erro ao actualizar utilizador: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (user: Profile) => {
    setProcessing(user.id);
    try {
      // Chama a função RPC V3 (aceita TEXT e retorna JSON para evitar erros de cache/tipo)
      const { data, error } = await supabase.rpc('delete_user_v3', {
        target_id_text: user.user_id
      });

      if (error) throw error;

      if (data && !data.success) {
        throw new Error(data.message || "Erro ao eliminar utilizador");
      }

      toast.success("Utilizador eliminado com sucesso");
      onRefresh();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(`Erro ao eliminar utilizador: ${error.message || 'Erro desconhecido'}`);
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

  const getAccountTypeLabel = (type: string | null) => {
    return type === "company" ? "Empresarial" : "Pessoal";
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
              <p className="text-muted-foreground">Nenhum utilizador encontrado</p>
            </div>
          ) : (
            <div className="card-elevated overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Utilizador
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
                        Acções
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
                              Activo
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
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 rounded-lg hover:bg-muted transition-colors"
                              title="Editar utilizador"
                            >
                              <Pencil className="w-4 h-4 text-primary" />
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
                            <button
                              onClick={() => {
                                if (window.confirm("ATENÇÃO: Tem a certeza que deseja eliminar este utilizador? Esta acção é irreversível e apagará todos os dados associados.")) {
                                  handleDelete(user);
                                }
                              }}
                              disabled={processing === user.id}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50 ml-2"
                              title="Eliminar Utilizador"
                            >
                              {processing === user.id ? (
                                <Loader2 className="w-4 h-4 text-red-500 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-red-500" />
                              )}
                            </button>
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
            <DialogTitle>Detalhes do Utilizador</DialogTitle>
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
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Conta</p>
                  <p className="font-medium">{getAccountTypeLabel(selectedUser.account_type)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">País</p>
                  <p className="font-medium">{selectedUser.country || "Não informado"}</p>
                </div>
              </div>

              {selectedUser.account_type === "company" && (
                <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Empresa</p>
                    <p className="font-medium">{selectedUser.company_name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">NIF / CPF</p>
                    <p className="font-medium">{selectedUser.nif || "N/A"}</p>
                  </div>
                </div>
              )}

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

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Utilizador</DialogTitle>
            <DialogDescription>
              Altere as informações cadastrais do utilizador
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Primeiro e último nome</Label>
              <Input
                id="edit_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone">Telefone</Label>
              <Input
                id="edit_phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_country">País</Label>
              <Select
                value={editForm.country || "AO"}
                onValueChange={(v) => {
                  const config = phoneConfigs[v];
                  let newPhone = editForm.phone;

                  if (config) {
                    const currentPhone = editForm.phone.trim();
                    const existingPrefix = Object.values(phoneConfigs).find(cfg =>
                      currentPhone.startsWith(cfg.prefix)
                    );

                    if (existingPrefix) {
                      newPhone = currentPhone.replace(existingPrefix.prefix, config.prefix);
                    } else if (!currentPhone || !currentPhone.startsWith("+")) {
                      newPhone = config.prefix + " " + currentPhone;
                    }
                  }

                  setEditForm({
                    ...editForm,
                    country: v,
                    phone: newPhone
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o país" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AO">Angola</SelectItem>
                  <SelectItem value="PT">Portugal</SelectItem>
                  <SelectItem value="MZ">Moçambique</SelectItem>
                  <SelectItem value="BR">Brasil</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {userToEdit?.user_type === "client" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit_account_type">Tipo de Conta</Label>
                  <Select
                    value={editForm.account_type}
                    onValueChange={(v) => setEditForm({ ...editForm, account_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Pessoal</SelectItem>
                      <SelectItem value="company">Empresarial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editForm.account_type === "company" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="edit_company">Nome da Empresa</Label>
                      <Input
                        id="edit_company"
                        value={editForm.company_name}
                        onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_nif">NIF / CPF</Label>
                      <Input
                        id="edit_nif"
                        value={editForm.nif}
                        onChange={(e) => setEditForm({ ...editForm, nif: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={processing !== null}
              className="bg-primary text-primary-foreground"
            >
              {processing === userToEdit?.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Guardar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block User Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bloquear Utilizador</DialogTitle>
            <DialogDescription>
              Esta acção irá bloquear o utilizador e seu dispositivo (se disponível)
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
