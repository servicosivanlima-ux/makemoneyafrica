import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Clock, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface DepositRequest {
    id: string;
    client_id: string;
    amount: number;
    status: string;
    payment_proof_url: string;
    created_at: string;
    profiles?: {
        full_name: string;
        email: string;
    };
}

const DepositsTable = () => {
    const [deposits, setDeposits] = useState<DepositRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        loadDeposits();

        // Subscribe to realtime updates for deposits
        const channel = supabase
            .channel("admin-deposits-all")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "deposits" },
                () => {
                    loadDeposits();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const loadDeposits = async () => {
        try {
            // 1. Fetch deposits
            const { data: depositsData, error: depositsError } = await supabase
                .from("deposits" as any)
                .select("*")
                .order("created_at", { ascending: false });

            if (depositsError) throw depositsError;

            if (!depositsData || depositsData.length === 0) {
                setDeposits([]);
                return;
            }

            // 2. Fetch profiles for these deposits
            const userIds = [...new Set(depositsData.map((d: any) => d.client_id))];
            const { data: profilesData, error: profilesError } = await supabase
                .from("profiles")
                .select("user_id, full_name, email")
                .in("user_id", userIds);

            if (profilesError) throw profilesError;

            // 3. Map profiles to deposits
            const profilesMap = (profilesData || []).reduce((acc: any, profile: any) => {
                acc[profile.user_id] = profile;
                return acc;
            }, {});

            const fullDeposits = depositsData.map((deposit: any) => ({
                ...deposit,
                profiles: profilesMap[deposit.client_id] || { full_name: "Desconhecido", email: "N/A" }
            }));

            setDeposits(fullDeposits);
        } catch (error) {
            console.error("Error loading deposits:", error);
            toast.error("Erro ao carregar depósitos");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id: string) => {
        setProcessing(id);
        try {
            const { error } = await supabase.rpc("admin_approve_deposit", {
                p_deposit_id: id
            });

            if (error) throw error;

            toast.success("Depósito aprovado e saldo creditado!");
            loadDeposits();
        } catch (error: any) {
            console.error("Error approving deposit:", error);
            toast.error(error.message || "Erro ao aprovar depósito");
        } finally {
            setProcessing(null);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm("Tem certeza que deseja rejeitar este depósito?")) return;

        setProcessing(id);
        try {
            const { error } = await supabase.rpc("admin_reject_deposit", {
                p_deposit_id: id
            });

            if (error) throw error;

            toast.success("Depósito rejeitado");
            loadDeposits();
        } catch (error: any) {
            console.error("Error rejecting deposit:", error);
            toast.error(error.message || "Erro ao rejeitar depósito");
        } finally {
            setProcessing(null);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("pt-AO").format(price) + " Kz";
    };

    if (loading) {
        return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-black font-display text-white uppercase tracking-widest">Gerir Depósitos</h2>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[10px] font-black uppercase tracking-widest">
                    <Clock className="w-3 h-3" />
                    {deposits.filter(d => d.status === 'pending').length} Pendentes
                </div>
            </div>

            <div className="card-elevated overflow-hidden border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cliente</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Valor</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Data</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Acções</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {deposits.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-muted-foreground">
                                        Nenhum depósito encontrado.
                                    </td>
                                </tr>
                            ) : (
                                deposits.map((deposit) => (
                                    <tr key={deposit.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-4">
                                            <div className="font-bold text-white">{deposit.profiles?.full_name || "Utilizador"}</div>
                                            <div className="text-[10px] text-muted-foreground lowercase">{deposit.profiles?.email}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-display font-bold text-primary">{formatPrice(deposit.amount)}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(deposit.created_at).toLocaleDateString("pt-AO")}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[10px] font-black uppercase py-1 px-2 rounded-md ${deposit.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                                                deposit.status === 'pending' ? 'bg-orange-500/10 text-orange-500' :
                                                    'bg-red-500/10 text-red-500'
                                                }`}>
                                                {deposit.status === 'pending' ? 'Pendente' :
                                                    deposit.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase border-white/10 hover:bg-white/5">
                                                            Ver Provativo
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-2xl bg-background border-white/10">
                                                        <DialogHeader>
                                                            <DialogTitle className="text-xl font-black font-display text-white">Comprovativo de Depósito</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="mt-4">
                                                            <img
                                                                src={deposit.payment_proof_url}
                                                                alt="Comprovativo"
                                                                className="w-full rounded-xl border border-white/10"
                                                            />
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>

                                                {deposit.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            onClick={() => handleApprove(deposit.id)}
                                                            disabled={!!processing}
                                                            className="h-8 bg-green-500 hover:bg-green-600 text-white text-[10px] font-black uppercase px-4"
                                                        >
                                                            {processing === deposit.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                                                            Aprovar
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleReject(deposit.id)}
                                                            disabled={!!processing}
                                                            variant="destructive"
                                                            className="h-8 text-[10px] font-black uppercase px-4"
                                                        >
                                                            {processing === deposit.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3 mr-1" />}
                                                            Rejeitar
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
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

export default DepositsTable;
