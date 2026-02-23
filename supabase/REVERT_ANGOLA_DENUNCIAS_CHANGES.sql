-- =============================================================================
-- REVERSÃO DE ALTERAÇÕES INCORRETAS (PROJECTO Angola Denúncias - pstzibm...)
-- Este script remove as tabelas e funções de "Make Money Africa" que foram
-- criadas por engano neste projeto de Notícias.
-- =============================================================================

-- 1. APAGAR FUNÇÕES
DROP FUNCTION IF EXISTS public.create_campaign_with_balance_v2(text, text, text, text, text, text, text, integer, numeric, numeric);
DROP FUNCTION IF EXISTS public.create_campaign_with_balance_v3(text, text, text, text, text, text, text, text, text, text);

-- 2. APAGAR TABELAS (Note: Isto removerá todos os dados nestas tabelas específicas)
DROP TABLE IF EXISTS public.referral_commissions CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.withdrawals CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;

-- 3. REMOVER COLUNAS ADICIONADAS EM PROFILES (Apenas as que não pertencem ao News)
ALTER TABLE public.profiles 
  DROP COLUMN IF EXISTS referred_by,
  DROP COLUMN IF EXISTS device_hash,
  DROP COLUMN IF EXISTS facebook_link,
  DROP COLUMN IF EXISTS instagram_link,
  DROP COLUMN IF EXISTS tiktok_link,
  DROP COLUMN IF EXISTS youtube_link,
  DROP COLUMN IF EXISTS account_type,
  DROP COLUMN IF EXISTS company_name,
  DROP COLUMN IF EXISTS withdrawal_method,
  DROP COLUMN IF EXISTS withdrawal_details,
  DROP COLUMN IF EXISTS nif;

-- 4. RESET DE SALDO (Opcional - se houver saldo, pode ser removido ou deixado a 0)
ALTER TABLE public.profiles ALTER COLUMN wallet_balance SET DEFAULT 0;

-- 5. REMOVER TIPOS ENUM PERSONALIZADOS (Se existirem e não forem usados por outras tabelas)
-- Nota: Só remover se tiver a certeza que não são usados por tabelas de notícias
DO $$ BEGIN
    DROP TYPE IF EXISTS plan_type;
    DROP TYPE IF EXISTS platform_type;
    DROP TYPE IF EXISTS campaign_status;
    DROP TYPE IF EXISTS task_status;
    DROP TYPE IF EXISTS withdrawal_status;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

NOTIFY pgrst, 'reload schema';
