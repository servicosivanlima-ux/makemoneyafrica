"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, Loader2, X, MessageSquare, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

/* ===================== TYPES ===================== */
interface Message {
    role: "bot" | "user";
    content: string;
}

/* ===================== KNOWLEDGE BASE ===================== */
const KNOWLEDGE_BASE = [
    {
        intent: "SAUDACAO",
        keywords: ["olá", "oi", "bom dia", "boa tarde", "boa noite", "olá", "saudações"],
        response:
            "Olá 👋 Bem-vindo à *Make Money With Lima (MMWL)*.\n\nSou o assistente oficial 🤖.\n\nPosso ajudar você como:\n• Cliente (divulgação)\n• Trabalhador (ganhar dinheiro)\n\nO que deseja saber?"
    },
    {
        intent: "DOMINIO",
        keywords: ["site", "link", "domínio", "url", "portal", "onde acessa"],
        response:
            "🔐 O site oficial da plataforma é:\n👉 https://makemoney.social.br\n\nCertifique-se de que está no site correcto para sua segurança."
    },
    {
        intent: "CREDIBILIDADE",
        keywords: ["confiável", "real", "golpe", "seguro", "confianca", "confiar"],
        response:
            "✅ A MMWL é uma plataforma 100% segura e focada no mercado angolano.\n\n✔ Pagamentos verificados\n✔ Sistema antifraude\n✔ Suporte dedicado 24/7"
    },
    {
        intent: "SAQUE",
        keywords: ["saque", "retirar", "pagamento", "iban", "express", "receber", "levantar"],
        response:
            "💰 Pagamentos em **Kwanza (AOA)**.\n\n📌 Métodos:\n• Número Express\n• IBAN\n\n⏱ O processamento leva de imediato até 24 horas úteis."
    },
    {
        intent: "TRABALHADOR",
        keywords: ["trabalhar", "ganhar dinheiro", "tarefas", "vagas", "como ganhar"],
        response:
            "👷 Como *Trabalhador*, você ganha dinheiro realizando tarefas simples como curtir, seguir e visualizar conteúdos. Crie sua conta e comece a faturar!"
    },
    {
        intent: "CLIENTE",
        keywords: ["anunciar", "divulgar", "campanha", "impulsionar", "planos", "preços"],
        response:
            "📢 Como *Cliente*, você pode divulgar redes sociais e negócios.\n\nPlanos:\n🔹 **Tá no Limão** (desde 6.000 Kz)\n\nCrie sua campanha agora no portal!"
    },
    {
        intent: "SUPORTE",
        keywords: ["suporte", "ajuda", "contacto", "falar com alguém", "gerente", "email", "whatsapp"],
        response:
            "📞 Nosso suporte oficial:\n• WhatsApp: +244 923 066 682\n• E-mail: suporte@makemoney.ao"
    }
];

/* ===================== NLP LOGIC ===================== */
function normalize(text: string) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "");
}

function getBestResponse(message: string) {
    const text = normalize(message);
    let bestScore = 0;
    let bestResponse = "";

    for (const item of KNOWLEDGE_BASE) {
        let score = 0;
        for (const keyword of item.keywords) {
            if (text.includes(normalize(keyword))) score++;
        }
        if (score > bestScore) {
            bestScore = score;
            bestResponse = item.response;
        }
    }

    return { response: bestResponse, confidence: bestScore };
}

/* ===================== COMPONENT ===================== */
export default function ChatBot() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "bot",
            content:
                "👋 Olá! Sou o assistente da *Make Money With Lima*.\nComo posso ajudar você hoje?"
        }
    ]);

    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    async function sendMessage() {
        if (!input.trim()) return;

        const userMessage: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        const { response, confidence } = getBestResponse(userMessage.content);

        setTimeout(() => {
            setMessages((prev) => [
                ...prev,
                {
                    role: "bot",
                    content:
                        confidence > 0
                            ? response
                            : "🤔 Não entendi muito bem, mas posso ajudar com:\n• Pagamentos\n• Trabalhar\n• Anunciar\n• Segurança"
                }
            ]);
            setLoading(false);
        }, 700);
    }

    return (
        <div className="fixed bottom-5 right-5 z-[100]">
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="w-16 h-16 rounded-full shadow-[0_0_30px_rgba(132,255,46,0.5)] bg-gradient-lime text-zinc-950 flex items-center justify-center border-2 border-primary/20 group"
                onClick={() => setOpen(true)}
            >
                <MessageSquare className="w-7 h-7 group-hover:rotate-12 transition-transform" />
            </motion.button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.95 }}
                        className="fixed bottom-24 right-5 w-96 max-w-[95%] z-[101]"
                    >
                        <Card className="flex flex-col h-[520px] shadow-2xl overflow-hidden border-primary/20">
                            {/* Header */}
                            <div className="flex justify-between items-center p-4 bg-gradient-dark border-b border-white/10">
                                <div className="flex items-center gap-2 text-white font-bold">
                                    <Bot className="text-primary w-5 h-5" /> MMWL Assistente
                                </div>
                                <X
                                    onClick={() => setOpen(false)}
                                    className="cursor-pointer text-white/70 hover:text-white transition-colors"
                                />
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-sm bg-background/95 custom-scrollbar">
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                                            }`}
                                    >
                                        <div
                                            className={`px-4 py-2 rounded-2xl max-w-[85%] shadow-sm ${msg.role === "user"
                                                ? "bg-primary text-zinc-950 font-medium rounded-tr-none"
                                                : "bg-muted text-foreground rounded-tl-none border border-border"
                                                }`}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                                        <Loader2 className="animate-spin w-4 h-4" />
                                        <span>O assistente está a escrever...</span>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>

                            {/* Input Area */}
                            <div className="flex gap-2 p-4 border-t border-white/10 bg-card/50">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Digite sua mensagem..."
                                    onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                    className="bg-muted/50 border-none focus-visible:ring-primary/30"
                                />
                                <Button
                                    onClick={sendMessage}
                                    className="bg-primary hover:bg-primary/90 text-zinc-950 px-3"
                                >
                                    <Send size={18} />
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
