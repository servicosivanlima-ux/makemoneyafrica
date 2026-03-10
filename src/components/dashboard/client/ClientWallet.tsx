import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Wallet, Plus, Clock, CheckCircle, XCircle, AlertCircle, Copy, HelpCircle, Smartphone, MessageCircle, Upload, Loader2 } from "lucide-react";
import { formatPrice } from "@/lib/currency-utils";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FileUpload from "../common/FileUpload";

interface Deposit {
    id: string;
    amount: number;
    status: string;
    payment_proof_url: string;
    created_at: string;
}

interface ClientWalletProps {
    user: User;
}

const ClientWallet = ({ user }: ClientWalletProps) => {
    const [balance, setBalance] = useState(0);
    const [deposits, setDeposits] = useState<Deposit[]>([]);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const [amount, setAmount] = useState("");
    const [proofUrl, setProofUrl] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        loadWalletData();

        // Subscribe to balance changes in profile
        const profileChannel = supabase
            .channel(`profile-balance-${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "profiles",
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    loadWalletData();
                }
            )
            .subscribe();

        // Subscribe to deposit changes for this client
        const depositsChannel = supabase
            .channel(`client-deposits-${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "deposits",
                    filter: `client_id=eq.${user.id}`
                },
                () => {
                    loadWalletData();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(profileChannel);
            supabase.removeChannel(depositsChannel);
        };
    }, [user.id]);

    const loadWalletData = async () => {
        try {
            // Get balance from profile
            const { data: profile } = await supabase
                .from("profiles")
                .select("wallet_balance")
                .eq("user_id", user.id)
                .single() as any;

            setProfile(profile);
            setBalance(profile?.wallet_balance || 0);

            // Get deposits
            const { data: depositsData } = await supabase
                .from("deposits")
                .select("*")
                .eq("client_id", user.id)
                .order("created_at", { ascending: false }) as any;

            setDeposits(depositsData || []);
        } catch (error) {
            console.error("Error loading wallet data:", error);
        } finally {
            setLoading(false);
        }
    };



    const handleDepositRequest = async () => {
        if (!amount || parseInt(amount) < 6000) {
            toast.error("O valor mínimo de depósito é 6.000 Kz");
            return;
        }
        if (!proofUrl) {
            toast.error("Carregue o comprovativo do pagamento");
            return;
        }

        setRequesting(true);
        try {
            const { error } = await (supabase
                .from("deposits" as any)
                .insert({
                    client_id: user.id,
                    amount: parseInt(amount),
                    payment_proof_url: proofUrl,
                    status: "pending"
                } as any) as any);

            if (error) throw error;

            toast.success("Pedido de depósito enviado!");
            setAmount("");
            setProofUrl("");
            setIsDialogOpen(false);
            loadWalletData();
        } catch (error) {
            console.error("Error requesting deposit:", error);
            toast.error("Erro ao solicitar depósito");
        } finally {
            setRequesting(false);
        }
    };

    const displayPrice = (price: number) => {
        return formatPrice(price, profile?.country);
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado!`);
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            {/* Balance Card */}
            <div className="card-premium-glow p-8 bg-gradient-to-br from-primary/20 to-gold/10 border-white/10 relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Wallet className="w-5 h-5 text-primary" />
                            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Saldo Disponível</h2>
                        </div>
                        <p className="text-5xl font-black font-display text-white">
                            {displayPrice(balance)}
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary mt-2">Pronto para Investir em Campanhas</p>
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="btn-primary px-8 h-14 rounded-2xl group">
                                <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                                Recarregar Carteira
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md bg-background border-white/10">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black font-display text-white">Recarregar Carteira</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 py-4 overflow-y-auto max-h-[70vh]">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Valor do Depósito (Kz)</label>
                                    <Input
                                        type="number"
                                        placeholder="Mínimo 6.000 Kz"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="h-12 bg-white/5 border-white/10 rounded-xl"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-[#7c3aed] text-sm font-medium cursor-pointer hover:underline">
                                        <HelpCircle className="w-4 h-4" />
                                        <span>Como recarregar com KWiK?</span>
                                    </div>
                                    <p className="text-[#6366f1] text-[13px]">
                                        Recomendado: recarregar com KWiK, mais estável e mais rápido
                                    </p>

                                    {/* KWiK Details */}
                                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0">
                                            <div className="bg-red-500 text-white text-[10px] font-bold px-4 py-1 rotate-45 translate-x-3 -translate-y-1 shadow-sm">
                                                HOT
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 pt-1">
                                                <div className="w-16 h-8 flex items-center justify-center font-black text-[#003366] text-xl italic tracking-tighter">
                                                    KWiK
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className="text-gray-900 font-bold text-sm leading-tight">
                                                    Transferir para o seguinte IBAN para recarregar através do KWiK
                                                </p>
                                                <p className="text-gray-500 font-mono text-sm break-all">
                                                    AO06 0420 0000 0000 0328 9691 7
                                                </p>
                                                <button
                                                    onClick={() => copyToClipboard("AO06 0420 0000 0000 0328 9691 7", "IBAN")}
                                                    className="text-[#7c3aed] text-sm font-medium hover:underline block pt-1"
                                                >
                                                    Cópia
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Multicaixa Details */}
                                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-shrink-0 pt-1">
                                                <div className="w-12 h-12 flex items-center justify-center p-1 border rounded-lg overflow-hidden">
                                                    <img
                                                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Multicaixa_logo.svg/1200px-Multicaixa_logo.svg.png"
                                                        alt="Multicaixa"
                                                        className="w-full h-auto object-contain"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-900 font-bold">Reference ID:</span>
                                                        <span className="text-gray-500 font-mono">923 066 682</span>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard("923 066 682", "Reference ID")}
                                                        className="text-[#7c3aed] text-sm font-medium hover:underline"
                                                    >
                                                        Cópia
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-900 font-bold">EntityId ID:</span>
                                                        <span className="text-gray-500 font-mono">10116</span>
                                                    </div>
                                                    <button
                                                        onClick={() => copyToClipboard("10116", "EntityId ID")}
                                                        className="text-[#7c3aed] text-sm font-medium hover:underline"
                                                    >
                                                        Cópia
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Comprovativo</label>
                                    <FileUpload
                                        userId={user.id}
                                        proofType="deposit"
                                        label="Comprovativo de Pagamento"
                                        required
                                        value={proofUrl}
                                        onChange={setProofUrl}
                                    />
                                </div>

                                <Button
                                    onClick={handleDepositRequest}
                                    disabled={requesting || !amount || !proofUrl}
                                    className="w-full btn-primary h-14 rounded-2xl font-black uppercase tracking-widest text-xs"
                                >
                                    {requesting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Depósito"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* History */}
            <div className="space-y-4">
                <h3 className="text-lg font-black font-display text-white uppercase tracking-widest">Histórico de Depósitos</h3>
                <div className="grid gap-4">
                    {deposits.length === 0 ? (
                        <div className="card-elevated p-12 text-center border-white/5">
                            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                            <p className="text-muted-foreground text-sm">Nenhum histórico de depósitos encontrado.</p>
                        </div>
                    ) : (
                        deposits.map((deposit) => (
                            <div key={deposit.id} className="card-premium-glow p-5 flex items-center justify-between border-white/5 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className={`p-4 rounded-2xl ${deposit.status === 'pending' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                        deposit.status === 'approved' ? 'bg-primary/10 text-primary border border-primary/20' :
                                            'bg-red-500/10 text-red-500 border border-red-500/20'
                                        }`}>
                                        {deposit.status === 'pending' ? <Clock className="w-5 h-5 animate-pulse" /> :
                                            deposit.status === 'approved' ? <CheckCircle className="w-5 h-5 shadow-[0_0_10px_rgba(132,255,46,0.3)]" /> :
                                                <XCircle className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="text-xl font-black font-display text-white mb-1">{formatPrice(deposit.amount)}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black font-display text-muted-foreground uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">
                                                ID: {deposit.id.slice(0, 8)}
                                            </span>
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                                {new Date(deposit.created_at).toLocaleDateString("pt-AO")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right relative z-10">
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${deposit.status === 'pending' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                        deposit.status === 'approved' ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(132,255,46,0.2)]' :
                                            'bg-red-500/20 text-red-400 border border-red-500/30'
                                        }`}>
                                        {deposit.status === 'pending' ? 'Em Processamento' :
                                            deposit.status === 'approved' ? 'Saldo Confirmado' : 'Depósito Rejeitado'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div >
    );
};

export default ClientWallet;
