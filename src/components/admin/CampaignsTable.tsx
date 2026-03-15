import { useState, useEffect } from "react";
import { Trash2, Eye, Loader2, Search, Youtube, Facebook, Instagram, Music2, Settings, Play, Plus, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Campaign {
    id: string;
    client_id: string;
    plan_name: string;
    platform: string;
    price: number;
    status: string;
    page_link: string;
    created_at: string;
    client: {
        full_name: string;
        email: string;
    } | null;
    video_title?: string;
    video_duration?: number;
    video_link?: string;
    video_id?: string;
}

const CampaignsTable = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [processing, setProcessing] = useState<string | null>(null);
    const [isActivateDialogOpen, setIsActivateDialogOpen] = useState(false);
    const [activatingCampaign, setActivatingCampaign] = useState<Campaign | null>(null);
    const [workerReward, setWorkerReward] = useState("");

    // Edit Modal State
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [editForm, setEditForm] = useState({
        page_link: "",
        video_link: "",
        video_title: "",
        video_duration: 0
    });

    // Diverse Task Creation State
    const [isDiverseTaskDialogOpen, setIsDiverseTaskDialogOpen] = useState(false);
    const [diverseTaskForm, setDiverseTaskForm] = useState({
        title: "",
        description: "",
        target_count: 100,
        reward_amount: 50
    });

    const loadCampaigns = async () => {
        setLoading(true);
        try {
            const { data: campaignsData, error: campaignsError } = await supabase
                .from("campaigns" as any)
                .select("*")
                .order("created_at", { ascending: false });

            if (campaignsError) throw campaignsError;

            if (campaignsData && campaignsData.length > 0) {
                const clientIds = [...new Set(campaignsData.map((c: any) => c.client_id))];
                const { data: clientProfiles, error: profilesError } = await supabase
                    .from("profiles" as any)
                    .select("user_id, full_name, email")
                    .in("user_id", clientIds);

                if (profilesError) throw profilesError;

                const campaignsWithClients = campaignsData.map((campaign: any) => ({
                    ...campaign,
                    client: (clientProfiles as any[])?.find(p => p.user_id === campaign.client_id) || null
                }));
                setCampaigns(campaignsWithClients as any);
            } else {
                setCampaigns([]);
            }
        } catch (error: any) {
            toast.error("Erro ao carregar campanhas: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCampaigns();

        // Subscribe to realtime updates for campaigns
        const channel = supabase
            .channel("admin-campaigns-all")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "campaigns" },
                () => {
                    loadCampaigns();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleDelete = async (campaignId: string) => {
        if (!confirm("Tem certeza que deseja excluir esta campanha permanentemente?")) return;

        setProcessing(campaignId);
        try {
            const { error } = await supabase
                .from("campaigns" as any)
                .delete()
                .eq("id", campaignId);

            if (error) throw error;

            toast.success("Campanha excluída com sucesso!");
            loadCampaigns();
        } catch (error: any) {
            toast.error("Erro ao excluir: " + (error.message || "Erro desconhecido"));
        } finally {
            setProcessing(null);
        }
    };

    const handleActivateYouTube = async () => {
        if (!activatingCampaign || !workerReward) return;

        setProcessing(activatingCampaign.id);
        try {
            const rps = parseFloat(workerReward) / 60;
            const { data, error } = await (supabase.rpc as any)('admin_activate_youtube_campaign', {
                p_campaign_id: activatingCampaign.id,
                p_reward_per_second: rps
            });

            if (error) throw error;
            if (!data) throw new Error("Não foi possível ativar a campanha");

            toast.success("Campanha de YouTube ativada com sucesso!");
            setIsActivateDialogOpen(false);
            setActivatingCampaign(null);
            setWorkerReward("");
            loadCampaigns();
        } catch (error: any) {
            toast.error("Erro ao ativar: " + error.message);
        } finally {
            setProcessing(null);
        }
    };

    const handleUpdateCampaign = async () => {
        if (!editingCampaign) return;

        setProcessing(editingCampaign.id);
        try {
            const extractVideoId = (url: string) => {
                const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
                const match = url.match(regExp);
                return (match && match[7].length === 11) ? match[7] : null;
            };

            const vid = editForm.video_link ? extractVideoId(editForm.video_link) : null;

            const { data, error } = await (supabase.rpc as any)('admin_update_campaign', {
                p_campaign_id: editingCampaign.id,
                p_page_link: editForm.page_link,
                p_video_link: editForm.video_link || null,
                p_video_title: editForm.video_title || null,
                p_video_duration: editForm.video_duration || null,
                p_video_id: vid
            });

            if (error) throw error;
            if (!data) throw new Error("Não foi possível atualizar a campanha");

            toast.success("Campanha atualizada com sucesso!");
            setIsEditDialogOpen(false);
            setEditingCampaign(null);
            loadCampaigns();
        } catch (error: any) {
            toast.error("Erro ao atualizar: " + error.message);
        } finally {
            setProcessing(null);
        }
    };

    const handleCreateDiverseTask = async () => {
        setProcessing("creating_diverse");
        try {
            const { data, error } = await (supabase.rpc as any)('admin_create_diverse_task', {
                p_title: diverseTaskForm.title,
                p_description: diverseTaskForm.description,
                p_target_count: diverseTaskForm.target_count,
                p_reward_amount: diverseTaskForm.reward_amount
            });

            if (error) throw error;
            if (!data) throw new Error("Não foi possível criar a tarefa");

            toast.success("Tarefa diversa criada com sucesso!");
            setIsDiverseTaskDialogOpen(false);
            setDiverseTaskForm({
                title: "",
                description: "",
                target_count: 100,
                reward_amount: 50
            });
            loadCampaigns();
        } catch (error: any) {
            toast.error("Erro ao criar: " + error.message);
        } finally {
            setProcessing(null);
        }
    };

    const filteredCampaigns = campaigns.filter(c =>
        c.plan_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.client?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString("pt-AO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            active: "bg-green-500/10 text-green-500",
            pending_payment: "bg-yellow-500/10 text-yellow-500",
            pending_admin_setup: "bg-yellow-600/10 text-yellow-600 font-bold",
            completed: "bg-blue-500/10 text-blue-500",
            cancelled: "bg-red-500/10 text-red-500",
        };
        const label = status === 'pending_admin_setup' ? 'Setup YouTube' : status.replace('_', ' ');
        return (
            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${styles[status] || "bg-muted text-muted-foreground"}`}>
                {label}
            </span>
        );
    };

    const getPlatformIcon = (platform: string) => {
        switch (platform.toLowerCase()) {
            case 'youtube': return <Youtube className="w-3 h-3 text-red-500" />;
            case 'facebook': return <Facebook className="w-3 h-3 text-blue-500" />;
            case 'instagram': return <Instagram className="w-3 h-3 text-pink-500" />;
            case 'tiktok': return <Music2 className="w-3 h-3 text-slate-400" />;
            case 'diverse': return <FileText className="w-3 h-3 text-primary" />;
            default: return null;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por plano, cliente ou status..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/5 border-white/10"
                />
            </div>

            <div className="flex justify-end">
                <button
                    onClick={() => setIsDiverseTaskDialogOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus className="w-4 h-4" />
                    Nova Tarefa Diversa
                </button>
            </div>

            <div className="card-elevated overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="text-left px-4 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider">Cliente</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider">Plano</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider">Status</th>
                                <th className="text-left px-4 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider">Data</th>
                                <th className="text-right px-4 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-wider">Acções</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredCampaigns.map((campaign) => (
                                <tr key={campaign.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-4">
                                        <p className="font-medium text-sm text-foreground">{campaign.client?.full_name || "N/A"}</p>
                                        <p className="text-[10px] text-muted-foreground italic">{campaign.client?.email}</p>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            {getPlatformIcon(campaign.platform)}
                                            <span className="text-sm font-semibold">{campaign.plan_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        {getStatusBadge(campaign.status)}
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="text-xs text-muted-foreground">{formatDate(campaign.created_at)}</span>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center justify-end gap-2">
                                            {campaign.status === 'pending_admin_setup' && (
                                                <button
                                                    onClick={() => {
                                                        setActivatingCampaign(campaign);
                                                        setIsActivateDialogOpen(true);
                                                    }}
                                                    className="p-2 rounded-lg bg-gold/10 hover:bg-gold/20 transition-colors"
                                                    title="Configurar YouTube"
                                                >
                                                    <Settings className="w-4 h-4 text-gold" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setEditingCampaign(campaign);
                                                    setEditForm({
                                                        page_link: campaign.page_link,
                                                        video_link: campaign.video_link || "",
                                                        video_title: campaign.video_title || "",
                                                        video_duration: campaign.video_duration || 0
                                                    });
                                                    setIsEditDialogOpen(true);
                                                }}
                                                className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                                                title="Editar Campanha"
                                            >
                                                <Settings className="w-4 h-4 text-blue-500" />
                                            </button>
                                            <button
                                                onClick={() => setSelectedCampaign(campaign)}
                                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                            >
                                                <Eye className="w-4 h-4 text-muted-foreground" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(campaign.id)}
                                                disabled={processing === campaign.id}
                                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                            >
                                                {processing === campaign.id ? (
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

            <Dialog open={isActivateDialogOpen} onOpenChange={setIsActivateDialogOpen}>
                <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                            <Youtube className="w-5 h-5 text-red-500" />
                            Configurar Campanha YouTube
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-xs">
                            Defina a recompensa para o trabalhador. O preço para o cliente já foi pago.
                        </DialogDescription>
                    </DialogHeader>
                    {activatingCampaign && (
                        <div className="space-y-4 pt-4">
                            <div className="p-4 rounded-xl bg-white/5 space-y-3">
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Vídeo</p>
                                    <p className="text-sm font-bold text-white">{activatingCampaign.video_title || "Sem título"}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Duração</p>
                                    <p className="text-sm font-bold text-white">{activatingCampaign.video_duration} segundos</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Preço Pago pelo Cliente</p>
                                    <p className="text-lg font-black text-gold">{activatingCampaign.price} Kz</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest ml-1">Recompensa (Kz por cada 60s)</label>
                                <Input
                                    type="number"
                                    value={workerReward}
                                    onChange={(e) => setWorkerReward(e.target.value)}
                                    placeholder="Ex: 10"
                                    className="bg-white/5 border-white/10 h-12 text-lg font-bold text-white focus:border-gold"
                                />
                                <p className="text-[10px] text-muted-foreground italic ml-1 leading-tight">
                                    Isso equivale a {(parseFloat(workerReward || "0") / 60).toFixed(4)} Kz por segundo assistido.
                                    A regra padrão sugerida é 10 Kz por minuto.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setIsActivateDialogOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-muted-foreground"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleActivateYouTube}
                                    disabled={!workerReward || processing === activatingCampaign.id}
                                    className="flex-1 px-4 py-3 rounded-xl bg-gold text-gold-foreground text-xs font-bold uppercase tracking-widest hover:bg-gold/90 transition-all flex items-center justify-center gap-2"
                                >
                                    {processing === activatingCampaign.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4" />
                                            Activar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                            <Settings className="w-5 h-5 text-blue-500" />
                            Editar Campanha
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-xs">
                            Corrija os detalhes da campanha caso o cliente tenha cometido algum erro.
                        </DialogDescription>
                    </DialogHeader>
                    {editingCampaign && (
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest ml-1">Link da Página/Canal (Destino)</label>
                                <Input
                                    value={editForm.page_link}
                                    onChange={(e) => setEditForm({ ...editForm, page_link: e.target.value })}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>

                            {editingCampaign.platform === 'youtube' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest ml-1">Link do Vídeo YouTube</label>
                                        <Input
                                            value={editForm.video_link}
                                            onChange={(e) => setEditForm({ ...editForm, video_link: e.target.value })}
                                            className="bg-white/5 border-white/10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest ml-1">Título do Vídeo</label>
                                        <Input
                                            value={editForm.video_title}
                                            onChange={(e) => setEditForm({ ...editForm, video_title: e.target.value })}
                                            className="bg-white/5 border-white/10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest ml-1">Duração (Segundos)</label>
                                        <Input
                                            type="number"
                                            value={editForm.video_duration}
                                            onChange={(e) => setEditForm({ ...editForm, video_duration: parseInt(e.target.value) || 0 })}
                                            className="bg-white/5 border-white/10"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setIsEditDialogOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-muted-foreground"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUpdateCampaign}
                                    disabled={processing === editingCampaign.id}
                                    className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                >
                                    {processing === editingCampaign.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        "Salvar Alterações"
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isDiverseTaskDialogOpen} onOpenChange={setIsDiverseTaskDialogOpen}>
                <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Criar Tarefa Diversa
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-xs">
                            Crie uma missão personalizada com instruções diretas para os trabalhadores.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest ml-1">Título da Tarefa</label>
                            <Input
                                value={diverseTaskForm.title}
                                onChange={(e) => setDiverseTaskForm({ ...diverseTaskForm, title: e.target.value })}
                                placeholder="Ex: Criar vídeo para TikTok"
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest ml-1">Descrição / Guião (Instruções)</label>
                            <textarea
                                value={diverseTaskForm.description}
                                onChange={(e) => setDiverseTaskForm({ ...diverseTaskForm, description: e.target.value })}
                                placeholder="Descreva o que o trabalhador deve fazer..."
                                className="w-full min-h-[120px] bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary transition-colors"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest ml-1">Recompensa (Kz)</label>
                                <Input
                                    type="number"
                                    value={diverseTaskForm.reward_amount}
                                    onChange={(e) => setDiverseTaskForm({ ...diverseTaskForm, reward_amount: parseFloat(e.target.value) || 0 })}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest ml-1">Quantidade</label>
                                <Input
                                    type="number"
                                    value={diverseTaskForm.target_count}
                                    onChange={(e) => setDiverseTaskForm({ ...diverseTaskForm, target_count: parseInt(e.target.value) || 0 })}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => setIsDiverseTaskDialogOpen(false)}
                                className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-all text-muted-foreground"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateDiverseTask}
                                disabled={!diverseTaskForm.title || !diverseTaskForm.description || processing === "creating_diverse"}
                                className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2"
                            >
                                {processing === "creating_diverse" ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    "Criar Tarefa"
                                )}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
                <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white font-black uppercase tracking-widest">Detalhes da Campanha</DialogTitle>
                    </DialogHeader>
                    {selectedCampaign && (
                        <div className="space-y-4 pt-4">
                            <div className="grid grid-cols-1 gap-4">
                                <div className="p-4 rounded-xl bg-white/5 space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Link da Página</p>
                                    <a href={selectedCampaign.page_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                                        {selectedCampaign.page_link}
                                    </a>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 space-y-1">
                                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Status Actual</p>
                                    <p className="text-sm font-bold text-white uppercase italic">{selectedCampaign.status}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CampaignsTable;
