import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Você é um assistente educado, humano e profissional da plataforma Make Money With Lima (MMWL). Responda de forma clara e amigável."
            },
            { role: "user", content: message }
          ],
          temperature: 0.6,
          max_tokens: 200
        })
      }
    );

    const data = await response.json();

    return NextResponse.json({
      reply:
        data.choices?.[0]?.message?.content ??
        "Não consegui responder agora."
    });
  } catch {
    return NextResponse.json({
      reply:
        "⚠️ Serviço temporariamente indisponível. Tente novamente."
    });
  }
}
