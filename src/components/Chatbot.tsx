import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

interface Message {
    role: "bot" | "user";
    content: string;
}

const KNOWLEDGE_BASE = [
    {
        intent: "SAUDACAO",
        keywords: ["olá", "bom dia", "boa tarde", "como está o dia", "tudo bem", "oi"],
        response: "Olá 👋 Bem-vindo à Make Money With Lima (MMWL).\nA maior plataforma de marketing digital de Angola. Posso ajudar como Cliente (impulsionar redes) ou Trabalhador (ganhar dinheiro). Em que posso ser útil?"
    },
    {
        intent: "DOMINIO",
        keywords: ["site", "link", "domínio", "url", "portal", "onde acessa"],
        response: "O nosso portal oficial é o https://makemoney.social.br. Certifique-se de que está no site correto para sua segurança."
    },
    {
        intent: "CREDIBILIDADE",
        keywords: ["é confiável?", "isso é real?", "é golpe?", "posso confiar?", "seguro"],
        response: "A Make Money With Lima é uma plataforma 100% segura e focada no mercado angolano. Temos sistemas antifraude, pagamentos verificados e suporte dedicado."
    },
    {
        intent: "SAQUE_PAGAMENTO",
        keywords: ["saque", "retirada", "receber", "pagamento", "levantar", "iban", "express"],
        response: "Os pagamentos são feitos em Kwanza (AOA). Pode solicitar o seu saque via Número Express ou IBAN. O processamento leva de imediato até 24 horas úteis."
    },
    {
        intent: "CLIENTE_PLANOS",
        keywords: ["planos", "preços", "quanto custa", "pacotes", "campanhas", "anunciar"],
        response: "Para Clientes, temos os planos:\n🔹 **Tá no Limão** – Seguidores reais (desde 6.000 Kz)\n🔸 **Kwanza** – Engajamento premium (desde 30.000 Kz).\nCrie a sua campanha agora no portal!"
    },
    {
        intent: "TRABALHADOR_GANHOS",
        keywords: ["trabalhar", "ganhar dinheiro", "tarefas", "como ganhar", "vagas"],
        response: "Como Trabalhador, você ganha dinheiro realizando tarefas simples como seguir ou curtir. Crie conta como Trabalhador e comece a faturar em Kwanza!"
    },
    {
        intent: "PAISES_SUPORTADOS",
        keywords: ["quais países", "funciona em portugal", "posso me cadastrar no brasil", "países", "onde funciona"],
        response: "Atuamos em Angola 🇦🇴, Moçambique 🇲🇿, Brasil 🇧🇷 e Portugal 🇵🇹. A nossa moeda base para pagamentos é o Kwanza (AOA)."
    },
    {
        intent: "SUPORTE",
        keywords: ["suporte", "ajuda", "contato", "falar com alguém", "gerente", "email"],
        response: "Pode contactar o nosso Gerente pelo WhatsApp +244 923 066 682 ou pelo e-mail suporte@makemoney.ao. Estamos aqui para ajudar!"
    },
    {
        intent: "CONFIDENCIAL",
        keywords: ["sql", "credenciais", "adicionar admin", "como foi desenvolvido", "backend", "código", "programador"],
        response: "Informações técnicas ou sensíveis são confidenciais. Para parcerias ou dúvidas legítimas, use os nossos canais de suporte oficiais."
    }
];

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "bot",
            content: "Olá 👋 Bem-vindo à Make Money With Lima!\nSou o assistente digital da maior plataforma de marketing de Angola. Posso ajudar com planos para clientes ou dúvidas de trabalhadores. O que deseja saber?"
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = () => {
        if (!input.trim()) return;

        const userMessage = input.trim();
        setMessages(prev => [...prev, { role: "user", content: userMessage }]);
        setInput("");
        setIsTyping(true);

        // Lógica de resposta simulada
        setTimeout(() => {
            const lowerInput = userMessage.toLowerCase();
            let foundResponse = null;

            for (const item of KNOWLEDGE_BASE) {
                if (item.keywords.some(k => lowerInput.includes(k))) {
                    foundResponse = item.response;
                    break;
                }
            }

            const botMessage = foundResponse || "Isso aí eu não sei ou é confidencial. Tente contactar o nosso Gerente pelo WhatsApp +244 923 066 682.";

            setMessages(prev => [...prev, { role: "bot", content: botMessage }]);
            setIsTyping(false);
        }, 800);
    };

    return (
        <div className="fixed bottom-6 right-6 z-[99]">
            {isOpen ? (
                <Card className="w-[350px] sm:w-[400px] h-[500px] flex flex-col shadow-2xl border-primary/20 bg-card overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    {/* Header */}
                    <div className="bg-gradient-dark p-4 flex items-center justify-between border-b border-border">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">Suporte IA</h3>
                                <div className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Online</span>
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="hover:bg-primary/10 text-white">
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" ref={scrollRef}>
                        <div className="space-y-4">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className={`flex gap-2 max-w-[80%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "bot" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                                            {msg.role === "bot" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                        </div>
                                        <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap ${msg.role === "bot"
                                            ? "bg-muted/50 text-foreground rounded-tl-none border border-border"
                                            : "bg-primary text-zinc-950 font-medium rounded-tr-none"
                                            }`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="flex gap-2 max-w-[80%]">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                            <Bot className="w-4 h-4" />
                                        </div>
                                        <div className="bg-muted/50 p-3 rounded-2xl rounded-tl-none border border-border">
                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-border bg-card">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Escreve a tua dúvida..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                                className="bg-muted/50 border-none focus-visible:ring-primary/30"
                            />
                            <Button size="icon" onClick={handleSend} className="bg-primary hover:bg-primary/90">
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-[10px] text-center text-muted-foreground mt-2">
                            Responde automaticamente sobre o sistema
                        </p>
                    </div>
                </Card>
            ) : (
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(true)}
                    className="w-16 h-16 rounded-full shadow-[0_0_30px_rgba(132,255,46,0.5)] bg-gradient-lime text-primary-foreground flex items-center justify-center border-2 border-primary/20 group"
                >
                    <MessageSquare className="w-7 h-7 group-hover:rotate-12 transition-transform" />
                </motion.button>
            )}
        </div>
    );
};

export default Chatbot;
