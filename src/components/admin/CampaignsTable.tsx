import { useState, useEffect } from "react";
import { Trash2, Eye, Loader2, Search, Youtube, Facebook, Instagram, Music2 } from "lucide-react";
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
}

const CampaignsTable = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [processing, setProcessing] = useState<string | null>(null);

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
            completed: "bg-blue-500/10 text-blue-500",
            cancelled: "bg-red-500/10 text-red-500",
        };
        return (
            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${styles[status] || "bg-muted text-muted-foreground"}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    const getPlatformIcon = (platform: string) => {
        switch (platform.toLowerCase()) {
            case 'youtube': return <Youtube className="w-3 h-3 text-red-500" />;
            case 'facebook': return <Facebook className="w-3 h-3 text-blue-500" />;
            case 'instagram': return <Instagram className="w-3 h-3 text-pink-500" />;
            case 'tiktok': return <Music2 className="w-3 h-3 text-slate-400" />;
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
