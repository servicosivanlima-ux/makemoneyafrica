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
    keywords: ["ola", "oi", "bom dia", "boa tarde", "boa noite"],
    response:
      "Olá 👋 Bem-vindo à *Make Money With Lima (MMWL)*.\n\nSou o assistente oficial 🤖.\n\nPosso ajudar você como:\n• Cliente (divulgação)\n• Trabalhador (ganhar dinheiro)\n\nO que deseja saber?"
  },
  {
    intent: "SMALL_TALK",
    keywords: [
      "como vai",
      "como estas",
      "como está",
      "tudo bem",
      "estás bem",
      "vai bem",
      "como andas"
    ],
    response:
      "😊 Estou ótimo, obrigado por perguntar!\n\nEstou aqui para ajudar você com tudo sobre a *Make Money With Lima*.\n\nQuer ganhar dinheiro ou divulgar um negócio?"
  },
  {
    intent: "DOMINIO",
    keywords: ["site", "link", "dominio", "url", "portal"],
    response:
      "🔐 O site oficial da plataforma é:\n👉 https://makemoney.social.br\n\nEvite links falsos."
  },
  {
    intent: "CREDIBILIDADE",
    keywords: ["confiavel", "real", "golpe", "seguro"],
    response:
      "✅ A MMWL é uma plataforma real e segura.\n\n✔ Pagamentos verificados\n✔ Sistema antifraude\n✔ Suporte ativo"
  },
  {
    intent: "SAQUE",
    keywords: ["saque", "retirar", "pagamento", "iban", "express"],
    response:
      "💰 Pagamentos em **Kwanza (AOA)**.\n\n📌 Métodos:\n• Express\n• IBAN\n\n⏱ Até 24h úteis."
  },
  {
    intent: "TRABALHADOR",
    keywords: ["trabalhar", "ganhar dinheiro", "tarefas", "worker"],
    response:
      "👷 Como *Trabalhador*, você ganha dinheiro realizando tarefas simples como curtir, seguir e visualizar conteúdos."
  },
  {
    intent: "CLIENTE",
    keywords: ["anunciar", "divulgar", "campanha", "impulsionar", "planos"],
    response:
      "📢 Como *Cliente*, você pode divulgar redes sociais e negócios com campanhas direcionadas."
  }
];

/* ===================== NLP ===================== */
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
      if (text.includes(keyword)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestResponse = item.response;
    }
  }

  return { response: bestResponse, confidence: bestScore };
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

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const { response, confidence } = getBestResponse(userMessage.content);

    // 🔥 FORA DO ESCOPO → CHATGPT
    if (confidence < 1) {
      try {
        const res = await fetch("/api/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userMessage.content })
        });

        const data = await res.json();

        setMessages((prev) => [
          ...prev,
          { role: "bot", content: data.reply }
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            content:
              "⚠️ Estou com dificuldades técnicas agora. Tente novamente."
          }
        ]);
      }
    } else {
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: response }
      ]);
    }

    setLoading(false);
  }

  return (
    <>
      <Button
        className="fixed bottom-5 right-5 rounded-full shadow-xl"
        onClick={() => setOpen(true)}
      >
        <MessageSquare />
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-20 right-5 w-96 max-w-[95%]"
          >
            <Card className="flex flex-col h-[520px] shadow-2xl">
              <div className="flex justify-between p-3 border-b">
                <div className="flex gap-2">
                  <Bot /> MMWL Assistente
                </div>
                <X onClick={() => setOpen(false)} className="cursor-pointer" />
              </div>

              <div className="flex-1 p-3 overflow-y-auto space-y-3 text-sm">
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
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin w-4 h-4" />
                    Digitando...
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

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
