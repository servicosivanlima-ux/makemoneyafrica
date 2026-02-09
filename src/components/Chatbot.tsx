"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Loader2, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

/* ===================== TIPOS ===================== */
interface Message {
  role: "bot" | "user";
  content: string;
}

/* ===================== BASE DE CONHECIMENTO ===================== */
const KNOWLEDGE_BASE = [
  {
    intent: "SAUDACAO",
    keywords: ["ola", "oi", "bom dia", "boa tarde", "boa noite", "tudo bem"],
    response:
      "Olá 👋 Seja bem-vindo à *Make Money With Lima (MMWL)*.\n\nSou o assistente oficial 🤖. Posso ajudar você como:\n\n✅ Cliente (divulgar redes e negócios)\n✅ Trabalhador (ganhar dinheiro online)\n\nO que deseja saber?"
  },
  {
    intent: "DOMINIO",
    keywords: ["site", "link", "dominio", "url", "portal"],
    response:
      "🔐 O site oficial da plataforma é:\n👉 https://makemoney.social.br\n\nEvite links falsos para sua segurança."
  },
  {
    intent: "CREDIBILIDADE",
    keywords: ["confiavel", "real", "golpe", "seguro", "verdade"],
    response:
      "Sim ✅ A MMWL é uma plataforma real e segura.\n\n✔ Pagamentos verificados\n✔ Sistema antifraude\n✔ Suporte ativo\n✔ Focada no mercado angolano"
  },
  {
    intent: "SAQUE",
    keywords: ["saque", "retirar", "pagamento", "receber", "iban", "express"],
    response:
      "💰 Os pagamentos são feitos em **Kwanza (AOA)**.\n\n📌 Métodos disponíveis:\n• Número Express\n• IBAN\n\n⏱ Processamento: imediato até 24h úteis."
  },
  {
    intent: "TRABALHADOR",
    keywords: ["trabalhar", "ganhar dinheiro", "tarefas", "worker"],
    response:
      "👷 Como *Trabalhador*, você ganha dinheiro realizando tarefas simples como:\n\n✔ Curtir\n✔ Seguir\n✔ Visualizar conteúdos\n\nApós concluir, o saldo é creditado automaticamente."
  },
  {
    intent: "CLIENTE",
    keywords: ["anunciar", "divulgar", "impulsionar", "campanha", "planos"],
    response:
      "📢 Como *Cliente*, você pode:\n\n✔ Divulgar Instagram, TikTok, YouTube\n✔ Criar campanhas segmentadas\n✔ Alcançar trabalhadores reais\n\nDeseja conhecer os planos disponíveis?"
  }
];

/* ===================== UTILIDADES NLP ===================== */
function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "");
}

function getBestResponse(message: string): string {
  const text = normalize(message);
  let bestScore = 0;
  let bestResponse =
    "🤔 Não entendi totalmente, mas posso ajudar.\n\nTente perguntar sobre:\n• Pagamentos\n• Trabalhar\n• Anunciar\n• Segurança";

  for (const item of KNOWLEDGE_BASE) {
    let score = 0;
    for (const keyword of item.keywords) {
      if (text.includes(keyword)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestResponse = item.response;
    }
  }

  return bestResponse;
}

/* ===================== COMPONENTE ===================== */
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

  function sendMessage() {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const response = getBestResponse(userMessage.content);
      setMessages((prev) => [...prev, { role: "bot", content: response }]);
      setLoading(false);
    }, 900);
  }

  return (
    <>
      {/* BOTÃO FLUTUANTE */}
      <Button
        className="fixed bottom-5 right-5 rounded-full shadow-xl"
        onClick={() => setOpen(true)}
      >
        <MessageSquare />
      </Button>

      {/* CHAT */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 right-5 w-96 max-w-[95%]"
          >
            <Card className="flex flex-col h-[520px] shadow-2xl">
              {/* HEADER */}
              <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center gap-2">
                  <Bot className="text-primary" />
                  <span className="font-semibold">MMWL Assistente</span>
                </div>
                <X
                  className="cursor-pointer"
                  onClick={() => setOpen(false)}
                />
              </div>

              {/* MENSAGENS */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`px-3 py-2 rounded-lg max-w-[80%] whitespace-pre-line ${
                        msg.role === "user"
                          ? "bg-primary text-white"
                          : "bg-muted"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="animate-spin w-4 h-4" />
                    Digitando...
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* INPUT */}
              <div className="flex gap-2 p-3 border-t">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <Button onClick={sendMessage}>
                  <Send size={18} />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
