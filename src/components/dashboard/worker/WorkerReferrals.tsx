import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, Gift, Copy, Check, ExternalLink, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ReferralCommission {
    id: string;
    deposit_amount: number;
    commission_amount: number;
    commission_percentage: number;
    status: string;
    created_at: string;
    client: {
        full_name: string;
        email: string;
    } | null;
}

const WorkerReferrals = ({ user }: { user: any }) => {
    const [loading, setLoading] = useState(true);
    const [commissions, setCommissions] = useState<ReferralCommission[]>([]);
    const [stats, setStats] = useState({
        total_commissions_paid: 0,
        total_referrals: 0,
    });
    const [referredUsers, setReferredUsers] = useState<any[]>([]);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (user) {
            loadReferralData();

            // Realtime for commissions
            const commsChannel = supabase
                .channel(`worker-commissions-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'referral_commissions',
                        filter: `worker_id=eq.${user.id}`
                    },
                    () => {
                        console.log("Realtime: Commissions updated, reloading...");
                        loadReferralData();
                    }
                )
                .subscribe();

            // Realtime for referred users (profiles)
            const referralsChannel = supabase
                .channel(`worker-referrals-${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'profiles',
                        filter: `referred_by=eq.${user.id}`
                    },
                    () => {
                        console.log("Realtime: New referral detected, reloading...");
                        loadReferralData();
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(commsChannel);
                supabase.removeChannel(referralsChannel);
            };
        }
    }, [user]);

    const loadReferralData = async () => {
        setLoading(true);
        try {
            // Load stats for current worker (using the new accessible RPC)
            const { data: statsData, error: statsError } = await (supabase.rpc("get_worker_referral_stats") as any);
            if (statsError) throw statsError;
            setStats((statsData as any) || { total_commissions_paid: 0, total_referrals: 0 });

            // Load commissions
            const { data: commsData, error: commsError } = await ((supabase as any)
                .from("referral_commissions")
                .select(`
                    *,
                    client:profiles!referral_commissions_client_id_fkey(full_name, email)
                `)
                .eq("worker_id", user.id)
                .order("created_at", { ascending: false }) as any);

            if (commsError) throw commsError;
            setCommissions(commsData || []);

            // Load all referred users (even those without commissions yet)
            const { data: profilesData, error: profilesError } = await supabase
                .from("profiles")
                .select("id, full_name, email, created_at")
                .eq("referred_by", user.id)
                .order("created_at", { ascending: false });

            if (!profilesError) {
                setReferredUsers(profilesData || []);
            }

        } catch (error: any) {
            console.error("Error loading referral data:", error);
            toast.error("Erro ao carregar dados de indicações");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        const text = user?.email || "";
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("E-mail de indicação copiado!");
        setTimeout(() => setCopied(false), 2000);
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
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Referral Link */}
            <div className="card-premium-glow p-8 bg-zinc-950/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
                                <Share2 className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="text-xl font-display font-black text-white uppercase tracking-widest">O Teu Programa de Referência</h2>
                        </div>
                        <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Ganhe 10% de cada depósito feito pelos teus indicados</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between gap-4 min-w-[300px]">
                        <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Teu E-mail de Indicação</p>
                            <p className="text-sm font-bold text-white truncate">{user?.email}</p>
                        </div>
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={copyToClipboard}
                            className="hover:bg-primary/20 hover:text-primary transition-all"
                        >
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid sm:grid-cols-2 gap-6">
                <Card className="glass-card p-6 border-white/5 group hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <Users className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total de Amigos Indicados</p>
                    </div>
                    <p className="text-3xl font-black font-display text-white">{stats.total_referrals}</p>
                </Card>

                <Card className="glass-card p-6 border-white/5 group hover:border-green-500/20 transition-all">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 rounded-xl bg-green-500/10 text-green-500 border border-green-500/20">
                            <DollarSign className="w-5 h-5" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comissões Recebidas</p>
                    </div>
                    <p className="text-3xl font-black font-display text-white">{formatPrice(stats.total_commissions_paid)}</p>
                </Card>
            </div>

            {/* History Table */}
            <div className="card-elevated overflow-hidden border-white/5">
                <div className="p-6 border-b border-white/5 bg-white/5 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Histórico de Comissões</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amigo</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valor do Depósito</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tua Comissão</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Data</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {commissions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-muted-foreground text-sm font-medium">
                                        Ainda não tens comissões registadas. Começa a partilhar e ganha hoje!
                                    </td>
                                </tr>
                            ) : (
                                commissions.map((comm) => (
                                    <tr key={comm.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-white text-sm">
                                                {comm.client?.full_name?.split(' ')[0]}*** {comm.client?.full_name?.split(' ').slice(-1)}
                                            </div>
                                            <div className="text-[9px] text-muted-foreground uppercase">{comm.client?.email?.split('@')[0].slice(0, 3)}***@{comm.client?.email?.split('@')[1]}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-display font-medium text-white">{formatPrice(comm.deposit_amount)}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-display font-bold text-primary">{formatPrice(comm.commission_amount)}</span>
                                                <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] font-black px-1.5 py-0">
                                                    {comm.commission_percentage}%
                                                </Badge>
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs font-medium text-muted-foreground">
                                            {new Date(comm.created_at).toLocaleDateString("pt-AO")}
                                        </td>
                                        <td className="p-4 text-right">
                                            <Badge variant="outline" className={`text-[9px] font-black uppercase tracking-widest ${comm.status === 'paid' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                {comm.status === 'paid' ? 'Disponível' : 'Bloqueado'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* All Referrals Section */}
            <div className="card-elevated overflow-hidden border-white/5">
                <div className="p-6 border-b border-white/5 bg-white/5 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Amigos que usaram o teu link</h3>
                </div>
                <div className="p-6">
                    {referredUsers.length === 0 ? (
                        <p className="text-center text-muted-foreground text-sm py-4">Nenhum amigo registado ainda.</p>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {referredUsers.map((ref) => (
                                <div key={ref.id} className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-2">
                                    <div className="font-bold text-white text-sm truncate">
                                        {ref.full_name?.split(' ')[0]}*** {ref.full_name?.split(' ').slice(-1)}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground uppercase truncate">
                                        {ref.email?.split('@')[0].slice(0, 3)}***@{ref.email?.split('@')[1]}
                                    </div>
                                    <div className="text-[9px] text-primary/70 font-bold uppercase tracking-tighter">
                                        Registado em {new Date(ref.created_at).toLocaleDateString("pt-AO")}
                                    </div>
                                    {/* Link showing if they have already generated commission or not */}
                                    {commissions.some(c => c.client?.email === ref.email) ? (
                                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[8px] font-black uppercase">
                                            Comissão Gerada
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-[8px] font-black uppercase text-muted-foreground border-white/10">
                                            Aguardando Depósito
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkerReferrals;
