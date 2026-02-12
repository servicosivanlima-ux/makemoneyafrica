import { useState } from "react";
import { ArrowRight, Users, Gift, TrendingUp, Handshake, MessageSquare, Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ReferralSection = () => {
    const [email, setEmail] = useState("");
    const [copied, setCopied] = useState(false);

    const generateMessage = (refEmail: string) => {
        const emailToUse = refEmail || "[Teu E-mail]";
        return `🚀 *Ganha Dinheiro Online com a MakeMoney Africa!* 🇦🇴

Olá! Quero convidar-te para a maior plataforma de micro-tarefas de Angola.
✅ *Trabalha de onde quiseres* - Telemóvel ou PC.
✅ *Pagamentos Seguros* - Recebe em AKZ sem complicações.
✅ *Planos Incríveis* - Escolhe o teu plano e começa a lucrar hoje.

📍 *COMO COMEÇAR:*
1. Clica no link abaixo.
2. Preenche os teus dados.
3. No campo *EMAIL DE REFERÊNCIA (OPCIONAL)* no final do formulário, coloca o meu e-mail: *${emailToUse}* (Vê a imagem que enviei em anexo!)

Regista-te agora: https://makemoney.social.br/auth?signup=true&ref=${refEmail ? encodeURIComponent(refEmail) : ""}

Vamos crescer juntos! 💸`;
    };

    const handleWhatsAppShare = () => {
        if (!email) {
            toast.error("Por favor, insere o teu e-mail de indicação primeiro.");
            return;
        }
        const message = generateMessage(email);
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
    };

    const copyMessage = () => {
        const message = generateMessage(email);
        navigator.clipboard.writeText(message);
        setCopied(true);
        toast.success("Mensagem copiada!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <section className="py-24 relative overflow-hidden bg-[#0A0A0B]">
            {/* Background Decor */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[120px]" />

            <div className="container mx-auto px-6 relative z-10">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                            <Gift className="w-4 h-4 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Programa de Referência</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight uppercase font-display">
                            Ganha <span className="text-primary drop-shadow-neon">10% de Comissão</span> por cada Indicação
                        </h2>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed uppercase font-black text-[10px] tracking-widest">
                            Ajude a crescer a nossa comunidade e seja recompensado por isso. Recompensas imediatas por cada depósito dos seus indicados.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 mb-16">
                        <div className="glass-card p-8 rounded-3xl border border-white/5 group hover:border-primary/20 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-6 border border-primary/30 group-hover:scale-110 transition-transform">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tighter">Convide clientes</h3>
                            <p className="text-muted-foreground text-xs font-medium leading-relaxed">
                                Partilhe o seu link único com a sua rede de contactos e amigos interessados em ganhar dinheiro online.
                            </p>
                        </div>

                        <div className="glass-card p-8 rounded-3xl border border-white/5 group hover:border-primary/20 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-gold/20 flex items-center justify-center mb-6 border border-gold/30 group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-6 h-6 text-gold" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tighter">Eles Depositam</h3>
                            <p className="text-muted-foreground text-xs font-medium leading-relaxed">
                                Quando o seu indicado faz o primeiro depósito para começar a trabalhar, o sistema regista a transacção.
                            </p>
                        </div>

                        <div className="glass-card p-8 rounded-3xl border border-white/5 group hover:border-primary/20 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center mb-6 border border-green-500/30 group-hover:scale-110 transition-transform">
                                <Handshake className="w-6 h-6 text-green-500" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-4 uppercase tracking-tighter">Receba 10%</h3>
                            <p className="text-muted-foreground text-xs font-medium leading-relaxed">
                                Receba automaticamente 10% do valor depositado pelos seus indicados directamente no seu saldo de comissões.
                            </p>
                        </div>
                    </div>

                    <div className="text-center">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="bg-primary hover:bg-primary/80 text-black font-black uppercase tracking-widest px-10 py-8 rounded-2xl text-lg group shadow-neon transition-all hover:scale-105">
                                    Começar a Indicar Agora
                                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] bg-zinc-950 border-white/10 text-white">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black font-display uppercase tracking-tight text-white">Indicar Amigos</DialogTitle>
                                    <DialogDescription className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">
                                        Personaliza e partilha a tua mensagem de indicação.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-6 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="ref-email" className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Teu E-mail de Indicação</Label>
                                        <Input
                                            id="ref-email"
                                            placeholder="exemplo@email.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="input-premium h-12 bg-white/5 border-white/10 text-white"
                                        />
                                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest ml-1 italic">* Este e-mail será usado como o teu código de indicação.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Onde colocar o e-mail?</Label>
                                        <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-[9/16] max-h-[300px] group">
                                            <img
                                                src="/registar-help.png"
                                                alt="Onde colocar o email de referência"
                                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                                                <p className="text-[9px] font-bold text-white uppercase tracking-widest opacity-80">
                                                    Indica o teu e-mail no último campo do formulário
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1">Pré-visualização da Mensagem</Label>
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 max-h-[200px] overflow-y-auto custom-scrollbar">
                                            <pre className="text-xs font-medium whitespace-pre-wrap font-sans text-muted-foreground">
                                                {generateMessage(email)}
                                            </pre>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-4 pt-2">
                                        <Button
                                            variant="outline"
                                            onClick={copyMessage}
                                            className="h-12 border-white/10 hover:bg-white/5 text-xs font-black uppercase tracking-widest"
                                        >
                                            {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                                            Copiar Texto
                                        </Button>
                                        <Button
                                            onClick={handleWhatsAppShare}
                                            className="h-12 bg-[#25D366] hover:bg-[#128C7E] text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(37,211,102,0.3)]"
                                        >
                                            <MessageSquare className="w-4 h-4 mr-2 fill-current" />
                                            WhatsApp
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ReferralSection;
