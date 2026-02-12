import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, Settings, CheckCircle, XCircle, Loader2, TrendingUp, Handshake } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface ReferralCommission {
    id: string;
    worker_id: string;
    client_id: string;
    deposit_amount: number;
    commission_amount: number;
    commission_percentage: number;
    status: string;
    created_at: string;
    worker?: {
        full_name: string;
        email: string;
    };
    client?: {
        full_name: string;
        email: string;
    };
}

const ReferralsManager = () => {
    const [loading, setLoading] = useState(true);
    const [commissions, setCommissions] = useState<ReferralCommission[]>([]);
    const [stats, setStats] = useState({
        total_commissions_paid: 0,
        total_referrals: 0,
    });
    const [settings, setSettings] = useState({
        active: true,
        percentage: 10,
    });
    const [updatingSettings, setUpdatingSettings] = useState(false);

    useEffect(() => {
        loadReferralData();
    }, []);

    const loadReferralData = async () => {
        setLoading(true);
        try {
            // Load stats
            const { data: statsData, error: statsError } = await supabase.rpc("get_referral_stats");
            if (statsError) throw statsError;
            setStats(statsData || { total_commissions_paid: 0, total_referrals: 0 });

            // Load settings
            const { data: settingsData, error: settingsError } = await (supabase
                .from("system_settings" as any)
                .select("value")
                .eq("key", "referral") as any)
                .single();

            if (!settingsError && settingsData) {
                setSettings(settingsData.value as any);
            }

            // Load commissions with worker and client profiles
            const { data: commsData, error: commsError } = await (supabase
                .from("referral_commissions")
                .select(`
                    *,
                    worker:profiles!referral_commissions_worker_id_fkey(full_name, email),
                    client:profiles!referral_commissions_client_id_fkey(full_name, email)
                `) as any)
                .order("created_at", { ascending: false });

            if (commsError) throw commsError;
            setCommissions((commsData || []) as unknown as ReferralCommission[]);

        } catch (error: any) {
            console.error("Error loading referral data:", error);
            const errorMessage = error?.message || error?.details || "Erro desconhecido";
            toast.error(`Erro ao carregar dados: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSettings = async () => {
        setUpdatingSettings(true);
        try {
            const { error } = await (supabase.rpc as any)("update_referral_settings", {
                p_active: settings.active,
                p_percentage: settings.percentage
            });

            if (error) throw error;
            toast.success("Configurações actualizadas com sucesso!");
        } catch (error: any) {
            console.error("Error updating settings:", error);
            toast.error("Erro ao actualizar configurações");
        } finally {
            setUpdatingSettings(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("pt-AO").format(price) + " Kz";
    };

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Settings Panel */}
            <div className="card-premium-glow p-8 bg-zinc-950/50">
                <div className="flex items-center gap-3 mb-6">
                    <Settings className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-display font-black text-white uppercase tracking-widest">Configuração da Campanha</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-end">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold text-white uppercase tracking-tight">Status da Campanha</p>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Activar ou desactivar bónus de indicação</p>
                            </div>
                            <Switch
                                checked={settings.active}
                                onCheckedChange={(val) => setSettings({ ...settings, active: val })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Percentagem da Comissão (%)</label>
                            <Input
                                type="number"
                                value={settings.percentage}
                                onChange={(e) => setSettings({ ...settings, percentage: parseInt(e.target.value) || 0 })}
                                className="input-premium h-12"
                                min="1"
                                max="50"
                            />
                        </div>
                    </div>

                    <Button
                        onClick={handleUpdateSettings}
                        disabled={updatingSettings}
                        className="btn-premium h-12 w-full md:w-auto px-8"
                    >
                        {updatingSettings ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                        Guardar Configurações
                    </Button>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid sm:grid-cols-2 gap-6">
                <div className="card-premium-glow p-6 group">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <Users className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total de Indicações</p>
                    </div>
                    <p className="text-3xl font-black font-display text-white">{stats.total_referrals}</p>
                </div>

                <div className="card-premium-glow p-6 group">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 rounded-xl bg-green-500/10 text-green-500 border border-green-500/20">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comissões Pagas</p>
                    </div>
                    <p className="text-3xl font-black font-display text-white">{formatPrice(stats.total_commissions_paid)}</p>
                </div>
            </div>

            {/* Commissions Table */}
            <div className="card-elevated overflow-hidden border-white/5">
                <div className="p-6 border-b border-white/5 bg-white/5 flex items-center gap-2">
                    <Handshake className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Histórico de Comissões</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Trabalhador</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Novo Cliente</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Depósito</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comissão (%)</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Acções</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {commissions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-muted-foreground text-sm">
                                        Nenhuma comissão registada ainda.
                                    </td>
                                </tr>
                            ) : (
                                commissions.map((comm) => (
                                    <tr key={comm.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-white text-sm">{comm.worker?.full_name}</div>
                                            <div className="text-[9px] text-muted-foreground uppercase">{comm.worker?.email}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-white text-sm">{comm.client?.full_name}</div>
                                            <div className="text-[9px] text-muted-foreground uppercase">{comm.client?.email}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-display font-medium text-white">{formatPrice(comm.deposit_amount)}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-display font-bold text-primary">{formatPrice(comm.commission_amount)}</span>
                                                <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-black">{comm.commission_percentage}%</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[9px] px-2 py-1 rounded-full font-black uppercase tracking-widest ${comm.status === 'paid' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {comm.status === 'paid' ? 'Pago' : 'Bloqueado'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right space-y-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={async () => {
                                                    const newStatus = comm.status === 'paid' ? 'blocked' : 'paid';
                                                    const { error } = await supabase
                                                        .from("referral_commissions" as any)
                                                        .update({ status: newStatus })
                                                        .eq("id", comm.id);

                                                    if (error) {
                                                        toast.error("Erro ao alterar status");
                                                    } else {
                                                        toast.success(`Comissão ${newStatus === 'paid' ? 'activada' : 'bloqueada'}!`);
                                                        loadReferralData();
                                                    }
                                                }}
                                                className={`h-7 text-[8px] font-black uppercase tracking-widest px-2 ${comm.status === 'paid' ? 'hover:bg-red-500/10 hover:text-red-500' : 'hover:bg-green-500/10 hover:text-green-500'}`}
                                            >
                                                {comm.status === 'paid' ? <XCircle className="w-3 h-3 mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                                                {comm.status === 'paid' ? 'Bloquear' : 'Desbloquear'}
                                            </Button>
                                            <span className="block text-[8px] text-muted-foreground lowercase">
                                                {new Date(comm.created_at).toLocaleDateString("pt-AO")}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReferralsManager;
