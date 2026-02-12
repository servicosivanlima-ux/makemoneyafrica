
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Importa variáveis de ambiente (estas vêm do Lovable/Vite no seu setup normal,
// mas aqui vamos usar as que você tem ou pedir para confirmar)

// ATENÇÃO: Substitua pelos seus valores reais se não estiverem aqui
const SUPABASE_URL = "https://xofpoelcmcfpzmkopecu.supabase.co";
// Você precisa da chave ANON pública aqui
const SUPABASE_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || "";

if (!SUPABASE_KEY) {
    console.error("ERRO: VITE_SUPABASE_PUBLISHABLE_KEY não encontrada.");
    console.log("Por favor, defina a variável de ambiente ou edite este script para testar.");
    Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
    console.log(`Testando conexão com: ${SUPABASE_URL}`);

    try {
        // 1. Tenta listar tabelas (ou fazer um query simples)
        const { data, error } = await supabase
            .from('campaigns')
            .select('id, payment_proof_url')
            .limit(1);

        if (error) {
            console.error("❌ Erro na conexão ou schema:", error.message);
            if (error.code === 'PGRST301') {
                console.error("Possível problema de permissões (RLS) ou tabela inexistente.");
            }
            return;
        }

        console.log("✅ Conexão BEM SUCEDIDA!");
        console.log("✅ Tabela 'campaigns' encontrada.");

        // Verifica se a resposta (mesmo vazia) indica que a coluna existe
        // O select 'payment_proof_url' só funciona se a coluna existir.
        console.log("✅ Coluna 'payment_proof_url' confirmada (query executado sem erro de coluna).");

    } catch (err) {
        console.error("❌ Erro inesperado:", err);
    }
}

testConnection();
