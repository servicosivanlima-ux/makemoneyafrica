import { useState, useEffect } from "react";
import { Shield, Ban, Trash2, Plus, Loader2, UserX, UserCheck, MessageSquareX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ChatModeration = () => {
    const [forbiddenWords, setForbiddenWords] = useState<{ id: string, word: string }[]>([]);
    const [newWord, setNewWord] = useState("");
    const [loadingWords, setLoadingWords] = useState(true);
    const [addingWord, setAddingWord] = useState(false);

    // Moderated users stats/list
    const [moderatedUsers, setModeratedUsers] = useState<any[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    useEffect(() => {
        loadForbiddenWords();
        loadModeratedUsers();
    }, []);

    const loadForbiddenWords = async () => {
        try {
            const { data, error } = await (supabase
                .from("chat_forbidden_words" as any)
                .select("*")
                .order("created_at", { ascending: false }) as any);

            if (error) throw error;
            setForbiddenWords(data || []);
        } catch (error: any) {
            toast.error("Erro ao carregar palavras proibidas");
        } finally {
            setLoadingWords(false);
        }
    };

    const loadModeratedUsers = async () => {
        try {
            const { data, error } = await (supabase
                .from("chat_moderation" as any)
                .select("*, profiles(full_name, email)")
                .order("updated_at", { ascending: false }) as any);

            if (error) throw error;
            setModeratedUsers(data || []);
        } catch (error: any) {
            toast.error("Erro ao carregar utilizadores moderados");
        } finally {
            setLoadingUsers(false);
        }
    };

    const addWord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newWord.trim() || addingWord) return;

        setAddingWord(true);
        try {
            const { error } = await supabase
                .from("chat_forbidden_words" as any)
                .insert({ word: newWord.trim().toLowerCase() });

            if (error) throw error;

            toast.success("Palavra proibida adicionada");
            setNewWord("");
            loadForbiddenWords();
        } catch (error: any) {
            toast.error(error.message || "Erro ao adicionar palavra");
        } finally {
            setAddingWord(false);
        }
    };

    const removeWord = async (id: string) => {
        try {
            const { error } = await supabase
                .from("chat_forbidden_words" as any)
                .delete()
                .eq("id", id);

            if (error) throw error;

            setForbiddenWords(prev => prev.filter(w => w.id !== id));
            toast.success("Palavra removida");
        } catch (error: any) {
            toast.error("Erro ao remover palavra");
        }
    };

    const toggleModeration = async (userId: string, action: 'unban' | 'mute' | 'ban') => {
        try {
            let update = {};
            if (action === 'unban') {
                update = { is_banned: false, is_muted: false };
            } else if (action === 'mute') {
                update = { is_muted: true, is_banned: false };
            } else if (action === 'ban') {
                update = { is_banned: true, is_muted: false };
            }

            const { error } = await supabase
                .from("chat_moderation" as any)
                .upsert({
                    user_id: userId,
                    ...update,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            toast.success(`Utilizador actualizado: ${action}`);
            loadModeratedUsers();
        } catch (error: any) {
            toast.error("Erro ao actualizar moderação");
        }
    };

    return (
        <Tabs defaultValue="words" className="w-full">
            <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl mb-8">
                <TabsTrigger value="words" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase tracking-widest text-[10px] px-6">
                    Filtro de Conteúdo
                </TabsTrigger>
                <TabsTrigger value="users" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-black uppercase tracking-widest text-[10px] px-6">
                    Utilizadores Moderados
                </TabsTrigger>
            </TabsList>

            <TabsContent value="words" className="space-y-6">
                <Card className="bg-white/5 border-white/10 p-6 rounded-3xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                            <MessageSquareX className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">Lista Negra de Palavras</h2>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Mensagens com estes termos serão bloqueadas</p>
                        </div>
                    </div>

                    <form onSubmit={addWord} className="flex gap-2 mb-8">
                        <Input
                            value={newWord}
                            onChange={(e) => setNewWord(e.target.value)}
                            placeholder="Nova palavra proibida..."
                            className="bg-white/5 border-white/10 rounded-xl focus:ring-red-500/50 transition-all font-medium h-12"
                        />
                        <Button
                            type="submit"
                            disabled={addingWord || !newWord.trim()}
                            className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-6 h-12 shadow-lg shadow-red-500/20"
                        >
                            {addingWord ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                            Adicionar
                        </Button>
                    </form>

                    <div className="flex flex-wrap gap-2">
                        {loadingWords ? (
                            <div className="w-full py-12 flex justify-center">
                                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            </div>
                        ) : forbiddenWords.length === 0 ? (
                            <p className="text-xs text-muted-foreground uppercase font-black tracking-widest text-center w-full py-8">Nenhuma palavra cadastrada</p>
                        ) : (
                            forbiddenWords.map((w) => (
                                <Badge
                                    key={w.id}
                                    className="bg-white/5 hover:bg-red-500/10 text-white border-white/10 py-1.5 pl-3 pr-2 rounded-lg flex items-center gap-2 group transition-all"
                                >
                                    <span className="font-bold lowercase text-xs">{w.word}</span>
                                    <button
                                        onClick={() => removeWord(w.id)}
                                        className="text-muted-foreground hover:text-red-500 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))
                        )}
                    </div>
                </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
                <Card className="bg-white/5 border-white/10 p-6 rounded-3xl overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                            <Ban className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">Controlo de Acesso</h2>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Utilizadores silenciados ou banidos do chat</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="text-left px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Utilizador</th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Estado</th>
                                    <th className="text-left px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Motivo</th>
                                    <th className="text-right px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Acções</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loadingUsers ? (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center">
                                            <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : moderatedUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-xs text-muted-foreground uppercase font-black tracking-widest">
                                            Nenhum utilizador sob moderação
                                        </td>
                                    </tr>
                                ) : (
                                    moderatedUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-bold text-white text-sm">{u.profiles?.full_name || "N/A"}</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-medium">{u.profiles?.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.is_banned ? (
                                                    <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-[8px] font-black uppercase px-2 shadow-lg shadow-red-500/5">BANIDO</Badge>
                                                ) : u.is_muted ? (
                                                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[8px] font-black uppercase px-2 shadow-lg shadow-amber-500/5">SILENCIADO</Badge>
                                                ) : (
                                                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[8px] font-black uppercase px-2">ACTIVO</Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs text-muted-foreground max-w-[200px] truncate">{u.reason || "Sem motivo"}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {(u.is_banned || u.is_muted) && (
                                                        <button
                                                            onClick={() => toggleModeration(u.user_id, 'unban')}
                                                            className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 transition-all"
                                                            title="Restaurar Acesso"
                                                        >
                                                            <UserCheck className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {!u.is_muted && !u.is_banned && (
                                                        <>
                                                            <button
                                                                onClick={() => toggleModeration(u.user_id, 'mute')}
                                                                className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 transition-all"
                                                                title="Silenciar"
                                                            >
                                                                <MessageSquareX className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => toggleModeration(u.user_id, 'ban')}
                                                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 transition-all"
                                                                title="Banir"
                                                            >
                                                                <UserX className="w-4 h-4" />
                                                            </button>
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
                </Card>
            </TabsContent>
        </Tabs>
    );
};

// Exporting X component because it was used in addWord but not imported (my bad)
const X = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
);

export default ChatModeration;
