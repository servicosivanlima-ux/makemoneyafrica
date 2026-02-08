import { useState } from "react";
import { Send, Users, User, Briefcase, UserCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const NotificationsManager = () => {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [link, setLink] = useState("");
    const [targetType, setTargetType] = useState<"all" | "clients" | "workers" | "specific">("all");
    const [specificEmail, setSpecificEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            toast.error("Preencha o título e a mensagem");
            return;
        }

        if (targetType === "specific" && !specificEmail.trim()) {
            toast.error("Digite o email do usuário");
            return;
        }

        setLoading(true);
        try {
            let userIds: string[] = [];

            if (targetType === "specific") {
                const { data: userData, error: userError } = await supabase
                    .from("profiles")
                    .select("user_id")
                    .eq("email", specificEmail.trim())
                    .single();

                if (userError || !userData) throw new Error("Usuário não encontrado");
                userIds = [userData.user_id];
            } else {
                let query = supabase.from("profiles").select("user_id");

                if (targetType === "clients") {
                    query = query.eq("user_type", "client");
                } else if (targetType === "workers") {
                    query = query.eq("user_type", "worker");
                }
                // 'all' doesn't need a filter, but we exclude admins usually? 
                // Let's include everyone for 'all', or maybe exclude current admin?
                // For safety, let's keep it simple.

                const { data: usersData, error: usersError } = await query;
                if (usersError) throw usersError;
                userIds = usersData.map(u => u.user_id);
            }

            if (userIds.length === 0) {
                toast.warning("Nenhum usuário encontrado para este grupo");
                return;
            }

            // Batch insert
            // Note: If sending to many users, batching might be needed. 
            // For now, assuming < 1000 users or Supabase handles it.
            const notifications = userIds.map(id => ({
                user_id: id,
                title,
                message,
                link: link.trim() || null,
                is_read: false
            }));

            const { error: insertError } = await supabase
                .from("notifications" as any)
                .insert(notifications);

            if (insertError) throw insertError;

            toast.success(`Notificação enviada para ${userIds.length} usuário(s)!`);
            setTitle("");
            setMessage("");
            setLink("");
            setSpecificEmail("");
        } catch (error: any) {
            toast.error("Erro ao enviar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                    onClick={() => setTargetType("all")}
                    className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-3 ${targetType === "all"
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                        }`}
                >
                    <Users className="w-6 h-6" />
                    <span className="font-bold text-sm uppercase tracking-wider">Todos</span>
                </button>
                <button
                    onClick={() => setTargetType("clients")}
                    className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-3 ${targetType === "clients"
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                        }`}
                >
                    <UserCheck className="w-6 h-6" />
                    <span className="font-bold text-sm uppercase tracking-wider">Clientes</span>
                </button>
                <button
                    onClick={() => setTargetType("workers")}
                    className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-3 ${targetType === "workers"
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                        }`}
                >
                    <Briefcase className="w-6 h-6" />
                    <span className="font-bold text-sm uppercase tracking-wider">Trabalhadores</span>
                </button>
                <button
                    onClick={() => setTargetType("specific")}
                    className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-3 ${targetType === "specific"
                            ? "bg-primary/20 border-primary text-primary"
                            : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                        }`}
                >
                    <User className="w-6 h-6" />
                    <span className="font-bold text-sm uppercase tracking-wider">Específico</span>
                </button>
            </div>

            <div className="card-elevated p-6 space-y-4">
                {targetType === "specific" && (
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Email do Usuário</label>
                        <Input
                            value={specificEmail}
                            onChange={(e) => setSpecificEmail(e.target.value)}
                            placeholder="exemplo@email.com"
                            className="bg-white/5 border-white/10"
                        />
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Título</label>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Nova Promoção!"
                        className="bg-white/5 border-white/10"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Mensagem</label>
                    <Textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Digite o conteúdo da notificação..."
                        className="bg-white/5 border-white/10 min-h-[100px]"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Link (Opcional)</label>
                    <Input
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="Ex: /dashboard/tasks ou https://..."
                        className="bg-white/5 border-white/10"
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                        *Para funcionar o clique, certifique-se que o usuário rodou o comando SQL para adicionar a coluna 'link'.
                    </p>
                </div>

                <button
                    onClick={handleSend}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            Enviar Notificação
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default NotificationsManager;
