import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "Você é um assistente educado e profissional da plataforma Make Money With Lima."
            },
            { role: "user", content: message }
          ],
          temperature: 0.6,
          max_tokens: 200
        })
      }
    );

    const data = await response.json();

    // 🔍 LOG REAL DO ERRO (Vercel)
    if (!response.ok) {
      console.error("OPENAI ERROR:", data);
      return NextResponse.json({
        reply:
          "⚠️ Erro ao comunicar com o serviço de IA. Verifique a chave e o modelo."
      });
    }

    return NextResponse.json({
      reply: data.choices[0].message.content
    });
  } catch (error) {
    console.error("API ERROR:", error);
    return NextResponse.json({
      reply: "⚠️ Falha interna no servidor."
    });
  }
}
