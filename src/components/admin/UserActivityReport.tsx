import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Users,
    CheckCircle,
    ExternalLink,
    Search,
    LogIn,
    Clock,
    Wallet,
    Loader2,
    Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";

interface UserActivity {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
    user_type: string;
    wallet_balance: number;
    access_count: number;
    last_access: string | null;
    tasks_completed: number;
    campaigns_created: number;
    created_at: string;
}

const UserActivityReport = () => {
    const [activities, setActivities] = useState<UserActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [userTypeFilter, setUserTypeFilter] = useState("all");
    const [minBalance, setMinBalance] = useState<number | "">("");
    const [minAccess, setMinAccess] = useState<number | "">("");
    const [sortBy, setSortBy] = useState<"created_at" | "wallet_balance" | "access_count" | "tasks">("created_at");

    useEffect(() => {
        fetchActivityData();
    }, []);

    const fetchActivityData = async () => {
        setLoading(true);
        try {
            // Fetch all regular users (excluding admins potentially)
            const { data: profiles, error: profilesError } = await supabase
                .from("profiles")
                .select("*")
                .neq("user_type", "admin")
                .order("created_at", { ascending: false });

            if (profilesError) throw profilesError;

            // Fetch approved tasks counts
            const { data: tasksData } = await supabase
                .from("tasks")
                .select("worker_id, status")
                .eq("status", "approved");

            // Fetch campaigns counts
            const { data: campaignsData } = await supabase
                .from("campaigns")
                .select("client_id");

            // Aggregate data
            const aggregated = profiles.map((p: any) => {
                const tasksCompleted = tasksData?.filter(t => t.worker_id === p.user_id).length || 0;
                const campaignsCreated = campaignsData?.filter(c => c.client_id === p.user_id).length || 0;

                return {
                    ...p,
                    tasks_completed: tasksCompleted,
                    campaigns_created: campaignsCreated
                };
            });

            setActivities(aggregated);
        } catch (error) {
            console.error("Error fetching activity report:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredData = activities
        .filter(user => {
            const matchesSearch =
                user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = userTypeFilter === "all" || user.user_type === userTypeFilter;
            const matchesBalance = minBalance === "" || user.wallet_balance >= Number(minBalance);
            const matchesAccess = minAccess === "" || user.access_count >= Number(minAccess);

            return matchesSearch && matchesType && matchesBalance && matchesAccess;
        })
        .sort((a, b) => {
            if (sortBy === "wallet_balance") return b.wallet_balance - a.wallet_balance;
            if (sortBy === "access_count") return (b.access_count || 0) - (a.access_count || 0);
            if (sortBy === "tasks") return (b.tasks_completed + b.campaigns_created) - (a.tasks_completed + a.campaigns_created);
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

    const formatDate = (date: string | null) => {
        if (!date) return "Nuncas";
        return new Date(date).toLocaleString("pt-AO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-muted-foreground animate-pulse">Gerando relatório detalhado...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-4 md:space-y-0 md:space-x-4 md:flex-row justify-between items-start md:items-center bg-white/5 p-6 rounded-2xl border border-white/5">
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Pesquisar por nome ou e-mail..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-black/20 border-white/10 h-11"
                    />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full flex-1 md:w-auto">
                    <div className="relative">
                        <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
                        <Input
                            type="number"
                            placeholder="Mín. Saldo"
                            value={minBalance}
                            onChange={(e) => setMinBalance(e.target.value === "" ? "" : Number(e.target.value))}
                            className="pl-10 bg-black/20 border-white/10 h-11 text-xs"
                        />
                    </div>

                    <div className="relative">
                        <LogIn className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
                        <Input
                            type="number"
                            placeholder="Mín. Acessos"
                            value={minAccess}
                            onChange={(e) => setMinAccess(e.target.value === "" ? "" : Number(e.target.value))}
                            className="pl-10 bg-black/20 border-white/10 h-11 text-xs"
                        />
                    </div>

                    <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                        <SelectTrigger className="bg-black/20 border-white/10 h-11 text-xs">
                            <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Tipos</SelectItem>
                            <SelectItem value="worker">Trabalhadores</SelectItem>
                            <SelectItem value="client">Clientes</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                        <SelectTrigger className="bg-black/20 border-white/10 h-11 text-xs">
                            <div className="flex items-center gap-2">
                                <Filter className="w-3 h-3 text-primary" />
                                <SelectValue placeholder="Ordenar" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="created_at">Data de Cadastro</SelectItem>
                            <SelectItem value="wallet_balance">Maior Saldo</SelectItem>
                            <SelectItem value="access_count">Mais Acessos</SelectItem>
                            <SelectItem value="tasks">Mais Actividade</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="card-elevated overflow-hidden border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="text-left px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider">Utilizador</th>
                                <th className="text-left px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider">Metricas</th>
                                <th className="text-left px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider">Saldo Atual</th>
                                <th className="text-left px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider">Acessos</th>
                                <th className="text-left px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider">Ultimo Login</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredData.map((user) => (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white group-hover:text-primary transition-colors">{user.full_name}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                            <span className={`inline-block w-fit mt-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${user.user_type === 'client' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'
                                                }`}>
                                                {user.user_type === 'client' ? 'Cliente' : 'Trabalhador'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1">
                                            {user.user_type === 'worker' ? (
                                                <div className="flex items-center gap-2 text-sm text-foreground/80">
                                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                                    <span>{user.tasks_completed} Tarefas Aprovadas</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-sm text-foreground/80">
                                                    <CheckCircle className="w-3 h-3 text-blue-500" />
                                                    <span>{user.campaigns_created} Campanhas Criadas</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="font-mono font-black text-primary">
                                                {user.wallet_balance.toLocaleString('pt-AO')} Kz
                                            </span>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">Saldo em Carteira</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <LogIn className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-lg leading-none">{user.access_count || 0}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase">Entradas</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Clock className="w-3 h-3 text-primary/60" />
                                            <span>{formatDate(user.last_access)}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {filteredData.length === 0 && (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground">Nenhum registo encontrado para os filtros actuais.</p>
                </div>
            )}
        </div>
    );
};

export default UserActivityReport;
