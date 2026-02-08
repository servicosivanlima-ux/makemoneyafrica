import { useState, useEffect, useRef } from "react";
import { Send, Users, Shield, Smile, Ban, MessageSquare, Loader2, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
    id: string;
    user_id: string;
    content: string;
    is_admin: boolean;
    created_at: string;
    profiles: {
        full_name: string;
        email?: string;
    } | null;
}

interface OnlineUser {
    user_id: string;
    full_name: string;
    is_admin: boolean;
}

interface WorkerChatProps {
    user: User | null;
    profile: any;
}

const COMMON_EMOJIS = ["😀", "😂", "🥰", "😍", "🤩", "🤔", "🙄", "🔥", "💯", "🚀", "💰", "💸", "🤝", "✅", "❌", "⚠️", "👍", "🙌", "👏", "🙏", "❤️", "✨"];

const WorkerChat = ({ user, profile }: WorkerChatProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isModerated, setIsModerated] = useState(false);
    const [moderationReason, setModerationReason] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const [banEndTime, setBanEndTime] = useState<Date | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>("");

    useEffect(() => {
        if (!user || !profile) return;

        const checkAdminAndModeration = async () => {
            // Check if user is admin
            const { data: roleData } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .single();

            setIsAdmin(roleData?.role === "admin");

            // Check if user is moderated
            const { data: modData } = await supabase
                .from("chat_moderation" as any)
                .select("*")
                .eq("user_id", user.id)
                .single();

            if (modData) {
                const bannedUntil = (modData as any).banned_until;
                const isBanned = (modData as any).is_banned;
                const now = new Date();

                if (isBanned) {
                    // Check if ban is still active
                    if (bannedUntil && new Date(bannedUntil) > now) {
                        setIsModerated(true);
                        setModerationReason((modData as any).reason || "Não especificado");
                        setBanEndTime(new Date(bannedUntil));
                    } else if (!bannedUntil) {
                        // Permanent ban
                        setIsModerated(true);
                        setModerationReason((modData as any).reason || "Não especificado");
                    } else {
                        // Ban expired
                        setIsModerated(false);
                    }
                } else if ((modData as any).is_muted) {
                    setIsModerated(true);
                    setModerationReason((modData as any).reason || "Silenciado");
                }
            }
        };

        checkAdminAndModeration();
        loadMessages();

        // Subscribe to new messages
        const channel = supabase
            .channel("community_chat")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "chat_messages" },
                (payload) => {
                    handleNewMessage(payload.new as any);
                }
            )
            .subscribe();

        // Presence for online users
        const presenceChannel = supabase.channel('online_users_v2', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const newState = presenceChannel.presenceState();
                const users: OnlineUser[] = [];

                Object.values(newState).forEach((presences: any) => {
                    presences.forEach((presence: any) => {
                        users.push({
                            user_id: presence.user_id,
                            full_name: presence.full_name,
                            is_admin: presence.is_admin
                        });
                    });
                });

                setOnlineUsers(users);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                // Handle join if needed
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                // Handle leave if needed
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({
                        user_id: user.id,
                        full_name: profile?.full_name || user?.email?.split('@')[0] || "Usuário",
                        is_admin: isAdmin
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(presenceChannel);
        };
    }, [user, profile, isAdmin]);

    useEffect(() => {
        if (!banEndTime) return;

        const timer = setInterval(() => {
            const now = new Date();
            const diff = banEndTime.getTime() - now.getTime();

            if (diff <= 0) {
                setIsModerated(false);
                setBanEndTime(null);
                setModerationReason("");
                clearInterval(timer);
                return;
            }

            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        }, 1000);

        return () => clearInterval(timer);
    }, [banEndTime]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadMessages = async () => {
        try {
            const { data, error } = await supabase
                .from("chat_messages" as any)
                .select("*, profiles(full_name, email)")
                .order("created_at", { ascending: true })
                .limit(50);

            if (error) throw error;
            setMessages((data as any) || []);
        } catch (error: any) {
            console.error("Error loading messages:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleNewMessage = async (newMsg: any) => {
        // Fetch profile for the new message
        const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", newMsg.user_id)
            .single();

        const formattedMsg: ChatMessage = {
            ...newMsg,
            profiles: profileData
        };

        setMessages(prev => [...prev, formattedMsg]);
    };

    const sendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || sending || isModerated) return;

        setSending(true);
        try {
            const { error } = await supabase
                .from("chat_messages" as any)
                .insert({
                    user_id: user?.id,
                    profile_id: profile?.id,
                    content: newMessage.trim(),
                    is_admin: isAdmin
                });

            if (error) {
                if (error.message.includes("links")) {
                    toast.error("Links não são permitidios no chat.");
                } else if (error.message.includes("proibida") || error.message.includes("proibido")) {
                    toast.error("Linguagem imprópria detectada.");
                } else {
                    toast.error(error.message);
                }
                return;
            }

            setNewMessage("");
            setShowEmojiPicker(false);
        } catch (error: any) {
            toast.error("Falha ao enviar mensagem");
        } finally {
            setSending(false);
        }
    };

    const banUser = async (userId: string, userName: string) => {
        if (!isAdmin) return;

        // Optimistic UI update not possible easily for RPC, need to wait
        try {
            // Using the new RPC for temporary ban
            const { data, error } = await (supabase.rpc as any)('ban_user_temporary', {
                target_user_id: userId,
                admin_id: user?.id,
                ban_reason: "Violação recorrente das regras do chat"
            });

            if (error) throw error;

            toast.success(`Usuário ${userName} banido temporariamente.`);

            // Optionally insert a system message about the ban
            /*
            await supabase.from("chat_messages").insert({
                user_id: user?.id,
                // ... system message logic if needed
            });
            */
        } catch (error: any) {
            console.error("Error banning user:", error);
            // Fallback to old method if RPC fails/doesn't exist yet
            try {
                const { error: fallbackError } = await supabase
                    .from("chat_moderation" as any)
                    .upsert({
                        user_id: userId,
                        is_banned: true,
                        reason: "Banido por desrespeitar as regras do chat",
                        moderated_by: user?.id,
                        updated_at: new Date().toISOString()
                    });
                if (fallbackError) throw fallbackError;
                toast.success(`Usuário ${userName} banido (fallback).`);
            } catch (e: any) {
                toast.error("Erro ao banir usuário.");
            }
        }
    };

    const deleteMessage = async (messageId: string) => {
        if (!isAdmin) return;

        try {
            const { error } = await supabase
                .from("chat_messages" as any)
                .delete()
                .eq("id", messageId);

            if (error) throw error;

            // Optimistic update
            setMessages(prev => prev.filter(m => m.id !== messageId));
            toast.success("Mensagem removida");
        } catch (error: any) {
            toast.error("Erro ao remover mensagem");
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const onEmojiSelect = (emoji: any) => {
        setNewMessage(prev => prev + emoji.native);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
            {/* Chat Area */}
            <Card className="lg:col-span-3 flex flex-col bg-white/5 border-white/10 rounded-3xl overflow-hidden relative">
                {isModerated && (
                    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 text-center">
                        <div className="space-y-6 max-w-sm p-8 bg-black/50 border border-white/10 rounded-3xl shadow-2xl">
                            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                                <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                                <Ban className="w-8 h-8 text-red-500 relative z-10" />
                            </div>

                            <div>
                                <h3 className="text-xl font-display font-black text-white uppercase tracking-widest mb-2">Acesso Temporariamente Suspenso</h3>
                                <p className="text-muted-foreground text-xs leading-relaxed border-t border-white/10 pt-4 mt-4">
                                    <strong>Motivo:</strong> {moderationReason}
                                </p>
                            </div>

                            {banEndTime && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-1">Tempo Restante de Bloqueio</p>
                                    <p className="text-3xl font-mono font-black text-white lining-nums tabular-nums">
                                        {timeLeft}
                                    </p>
                                </div>
                            )}

                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                                O acesso será restaurado automaticamente
                            </p>
                        </div>
                    </div>
                )}

                <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
                            <MessageSquare className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">Chat da Comunidade</h2>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Apenas texto e emojis permitidos</p>
                        </div>
                    </div>
                </div>

                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex flex-col group relative ${msg.user_id === user?.id ? "items-end" : "items-start"}`}
                        >
                            <div className="flex items-center gap-2 mb-1 px-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                                    {msg.user_id === user?.id ? "Tu" : msg.profiles?.full_name || msg.profiles?.email?.split('@')[0] || "Usuário"}
                                    {isAdmin && msg.user_id !== user?.id && (
                                        <button
                                            onClick={() => banUser(msg.user_id, msg.profiles?.full_name || msg.profiles?.email?.split('@')[0] || "Usuário")}
                                            className="ml-1 text-muted-foreground hover:text-red-500 transition-colors"
                                            title="Banir Usuário Temporariamente"
                                        >
                                            <Ban className="w-3 h-3" />
                                        </button>
                                    )}
                                </span>
                                {msg.is_admin && (
                                    <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/30 text-[8px] font-black uppercase px-2 py-0">
                                        ADMIN
                                    </Badge>
                                )}
                            </div>
                            <div
                                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm font-medium shadow-lg transition-all ${msg.is_admin
                                    ? "bg-primary/20 border border-primary/30 text-white shadow-primary/5"
                                    : msg.user_id === user?.id
                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                        : "bg-white/10 text-white rounded-tl-none border border-white/5"
                                    }`}
                            >
                                {msg.content}
                                <div className={`text-[8px] mt-1 opacity-50 ${msg.user_id === user?.id ? "text-right" : "text-left"}`}>
                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={() => deleteMessage(msg.id)}
                                        className="absolute top-1/2 -translate-y-1/2 -right-8 p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        title="Remover mensagem"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 bg-white/5 border-t border-white/10">
                    <form onSubmit={sendMessage} className="relative flex items-center gap-2">
                        <div className="relative flex-1">
                            <Input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder={isModerated ? "Chat desativado para sua conta" : "Escreva sua mensagem..."}
                                disabled={isModerated || sending}
                                className="bg-white/5 border-white/10 rounded-xl pr-10 focus:ring-primary/50 transition-all font-medium py-6"
                            />
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                disabled={isModerated}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                            >
                                <Smile className="w-5 h-5" />
                            </button>
                        </div>
                        <Button
                            type="submit"
                            disabled={!newMessage.trim() || sending || isModerated}
                            className="bg-primary hover:bg-primary/80 text-primary-foreground rounded-xl h-[52px] w-[52px] p-0 shadow-neon-sm"
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </Button>

                        {/* Emoji Picker Overlay */}
                        <AnimatePresence>
                            {showEmojiPicker && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full right-0 z-50 mb-2 p-2 bg-[#1A1A1B] border border-white/10 rounded-2xl shadow-2xl w-[280px]"
                                >
                                    <div className="grid grid-cols-6 gap-2">
                                        {COMMON_EMOJIS.map(emoji => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => {
                                                    setNewMessage(prev => prev + emoji);
                                                    setShowEmojiPicker(false);
                                                }}
                                                className="text-2xl hover:bg-white/5 p-2 rounded-xl transition-colors"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>
                </div>
            </Card>

            {/* Online Users List */}
            <Card className="bg-white/5 border-white/10 rounded-3xl p-6 overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 mb-6">
                    <Users className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Usuários Online</h3>
                    <Badge className="ml-auto bg-primary/20 text-primary border-primary/30 text-[10px]">
                        {onlineUsers.length}
                    </Badge>
                </div>

                <div className="space-y-4 overflow-y-auto flex-1 scrollbar-hide">
                    {onlineUsers.map((u) => (
                        <div key={u.user_id} className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-primary">
                                    {u.full_name.charAt(0)}
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-[#0B0B0C] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">{u.full_name}</p>
                                {u.is_admin && (
                                    <p className="text-[8px] font-black text-primary uppercase tracking-[0.2em]">Administrador</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="p-4 bg-gradient-to-br from-primary/10 via-background to-background rounded-2xl border border-primary/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Shield className="w-16 h-16 text-primary rotate-12" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 rounded-lg bg-primary/20 text-primary">
                                    <Shield className="w-3 h-3" />
                                </div>
                                <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Diretrizes da Comunidade</h3>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-2 text-[9px]">
                                    <div className="w-1 h-1 rounded-full bg-primary mt-1 shrink-0" />
                                    <p className="text-muted-foreground font-medium uppercase tracking-tight leading-relaxed">
                                        <span className="text-white font-bold">Respeito Impecável:</span><br />
                                        Trate todos com cortesia. Ofensas resultam em banimento imediato.
                                    </p>
                                </div>
                                <div className="flex items-start gap-2 text-[9px]">
                                    <div className="w-1 h-1 rounded-full bg-primary mt-1 shrink-0" />
                                    <p className="text-muted-foreground font-medium uppercase tracking-tight leading-relaxed">
                                        <span className="text-white font-bold">Zero Tolerância a Spam:</span><br />
                                        Proibido links externos, publicidade ou correntes.
                                    </p>
                                </div>
                                <div className="flex items-start gap-2 text-[9px]">
                                    <div className="w-1 h-1 rounded-full bg-primary mt-1 shrink-0" />
                                    <p className="text-muted-foreground font-medium uppercase tracking-tight leading-relaxed">
                                        <span className="text-white font-bold">Ambiente Seguro:</span><br />
                                        Sem palavrões, conteúdo adulto ou polêmico.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
                                <div className="relative">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75" />
                                </div>
                                <p className="text-[8px] text-green-500 font-black uppercase tracking-widest">Moderação Ativa 24/24</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default WorkerChat;
