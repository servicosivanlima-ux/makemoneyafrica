
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Configuração do Supabase (Substitua a chave se necessário)
const SUPABASE_URL = "https://xofpoelcmcfpzmkopecu.supabase.co";
// Normalmente a chave pública está no ficheiro .env ou src/integrations/supabase/client.ts
// Vou assumir que o user saiba ou esteja no ambiente, mas como falhou antes,
// vou tentar usar Deno.env primeiro, e pedir output se falhar.
const SUPABASE_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || "";

if (!SUPABASE_KEY) {
    console.log("⚠️ AVISO: Chave não encontrada em VITE_SUPABASE_PUBLISHABLE_KEY.");
    console.log("Por favor, execute este script definindo a chave manualmente:");
    console.log('e.g. $env:VITE_SUPABASE_PUBLISHABLE_KEY="SUA_CHAVE"; deno run ...');
    Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkCampaigns() {
    console.log(`Verificando campanhas em: ${SUPABASE_URL}`);

    try {
        // Tenta listar campanhas (sem filtro de user, talvez falhe por RLS se não logado)
        // Mas a chave publica ANON permite SELECT se a policy permitir 'anon' ou se eu usar service_role (que não tenho).
        // O RLS normal impede 'anon' de ver campanhas de 'clients'.

        // Vou tentar ver se a tabela existe pelo menos, e se tem colunas.
        // O describe não funciona via JS client facilmente.
        // Vou tentar um select simples. Se der erro de permissão, a tabela existe.
        // Se der erro 404/PGRST204 (tabela não encontrada), então não existe.

        const { data, error, count } = await supabase
            .from('campaigns')
            .select('id, plan_name, status, created_at', { count: 'exact', head: false })
            .limit(5);

        if (error) {
            console.error("❌ Erro ao consultar 'campaigns':", error.message);
            console.error("Código:", error.code);
            if (error.code === 'PGRST204' || error.message.includes('relation "campaigns" does not exist')) {
                console.error("🔴 A TABELA 'campaigns' NÃO EXISTE! O script de restore falhou?");
            } else if (error.code === '42501' || error.message.includes('permission denied')) {
                console.log("🔒 Tabela existe, mas bloqueada por RLS (o que é bom/seguro).");
                console.log("Para ver dados, você precisa estar logado.");
            }
            return;
        }

        console.log(`✅ Consulta realizada com sucesso.`);
        console.log(`📊 Total de campanhas encontradas (visíveis publicamente): ${count}`);
        if (data && data.length > 0) {
            console.table(data);
            console.log("⚠️ SE VOCÊ VÊ DADOS AQUI, A BASE NÃO ESTÁ VAZIA!");
        } else {
            console.log("ℹ️ Nenhuma campanha visível publicamente (pode haver ocultas por RLS).");
        }

    } catch (err) {
        console.error("❌ Erro inesperado:", err);
    }
}

checkCampaigns();
