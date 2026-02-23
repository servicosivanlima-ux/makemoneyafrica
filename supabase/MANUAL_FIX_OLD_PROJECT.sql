-- =============================================================================
-- REPARAÇÃO DE CAMPAIGN ACTIVATION (PROJECTO xofpoel...) - V2
-- Execute este script no SQL Editor do seu Supabase Dashboard
-- =============================================================================

-- 1. REMOVER DEPENDÊNCIAS TEMPORARIAMENTE
DROP VIEW IF EXISTS public.available_campaigns_for_workers;

-- 2. PADRONIZAÇÃO DE MOEDA (NUMERIC PARA KWANZA)
ALTER TABLE public.profiles 
  ALTER COLUMN wallet_balance TYPE NUMERIC USING wallet_balance::NUMERIC;
ALTER TABLE public.profiles 
  ALTER COLUMN wallet_balance SET DEFAULT 0.00;

ALTER TABLE public.campaigns 
  ALTER COLUMN price TYPE NUMERIC USING price::NUMERIC;

-- 3. ADICIONAR COLUNAS EM FALTA NA TABELA CAMPAIGNS
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS video_id TEXT,
  ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS reward NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_budget NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_budget NUMERIC DEFAULT 0;

-- 4. RE-CRIAR A VIEW (ADAPTADA PARA NOVAS COLUNAS SE NECESSÁRIO)
CREATE OR REPLACE VIEW public.available_campaigns_for_workers AS
SELECT 
    c.id,
    c.client_id,
    c.plan_type,
    c.plan_name,
    c.platform,
    c.page_link,
    c.profile_link,
    c.video_link,
    c.video_id,
    c.duration,
    c.reward,
    c.target_count,
    c.price,
    c.status,
    c.created_at
FROM campaigns c
WHERE c.status = 'active'
  AND (c.remaining_budget > 0 OR c.remaining_budget IS NULL);

-- 5. REMOVER FUNÇÕES ANTIGAS PARA EVITAR AMBIGUIDADE (CLEANUP)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT oid::regprocedure as sig 
              FROM pg_proc 
              WHERE proname = 'create_campaign_with_balance' 
                 OR proname = 'create_campaign_with_balance_v2'
                 OR proname = 'create_campaign_with_balance_v3') 
    LOOP
        EXECUTE 'DROP FUNCTION ' || r.sig;
    END LOOP;
END $$;

-- 6. CRIAR A FUNÇÃO DEFINITIVA (V3)
CREATE OR REPLACE FUNCTION public.create_campaign_with_balance_v3(
  p_plan_type text, p_plan_name text, p_platform text, p_page_link text,
  p_profile_link text DEFAULT NULL, p_video_link text DEFAULT NULL,
  p_video_id text DEFAULT NULL, p_duration text DEFAULT NULL,
  p_reward text DEFAULT NULL, p_total_budget text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE 
  v_campaign_id uuid; 
  v_price numeric; 
  v_target_count integer; 
  v_user_type text; 
  v_balance numeric;
  v_duration_int integer;
  v_reward_num numeric;
  v_total_budget_num numeric;
BEGIN
  -- Cast inputs safely
  v_duration_int := COALESCE(p_duration::integer, 0);
  v_reward_num := p_reward::numeric;
  v_total_budget_num := p_total_budget::numeric;

  -- Validate user type & get balance
  SELECT user_type, wallet_balance INTO v_user_type, v_balance FROM profiles WHERE user_id = auth.uid();
  IF v_user_type != 'client' AND v_user_type != 'admin' THEN 
    RAISE EXCEPTION 'Apenas clientes podem criar campanhas'; 
  END IF;

  -- Logic for Custom Reward/Budget vs Fixed Plans
  IF v_total_budget_num IS NOT NULL AND v_reward_num IS NOT NULL AND v_reward_num > 0 THEN
    v_price := v_total_budget_num;
    v_target_count := floor(v_total_budget_num / v_reward_num);
  ELSE
    -- Fixed Plans Fallback (Cálculo interno baseado no nome do plano)
    IF p_plan_type = 'ta_no_limao' OR p_plan_type = 'limao' THEN
      CASE p_plan_name
        WHEN 'Básico' THEN v_price := 6000; v_target_count := 30;
        WHEN 'Super Básico' THEN v_price := 8000; v_target_count := 50;
        WHEN 'Tá Fixe' THEN v_price := 15000; v_target_count := 100;
        WHEN 'Bronze' THEN v_price := 27000; v_target_count := 200;
        WHEN 'Prata' THEN v_price := 75000; v_target_count := 500;
        WHEN 'Ouro' THEN v_price := 125000; v_target_count := 1000;
        WHEN 'Premium' THEN v_price := 400000; v_target_count := 3500;
        ELSE RAISE EXCEPTION 'Nome de plano inválido para Ta no Limao';
      END CASE;
    ELSE
      CASE p_plan_name
        WHEN 'Básico' THEN v_price := 30000; v_target_count := 50;
        WHEN 'Super Básico' THEN v_price := 50000; v_target_count := 100;
        WHEN 'Tá Fixe' THEN v_price := 70000; v_target_count := 150;
        WHEN 'Bronze' THEN v_price := 100000; v_target_count := 200;
        WHEN 'Prata' THEN v_price := 250000; v_target_count := 500;
        WHEN 'Ouro' THEN v_price := 400000; v_target_count := 1000;
        WHEN 'Premium' THEN v_price := 850000; v_target_count := 2500;
        ELSE RAISE EXCEPTION 'Nome de plano inválido para Kwanza';
      END CASE;
    END IF;
  END IF;

  -- Verify sufficient balance
  IF v_balance < v_price THEN
    RAISE EXCEPTION 'Saldo insuficiente. Recarregue sua carteira.';
  END IF;

  -- Deduct Balance
  UPDATE profiles SET wallet_balance = wallet_balance - v_price WHERE user_id = auth.uid();

  -- Create Campaign
  INSERT INTO campaigns (
    client_id, plan_type, plan_name, platform, page_link, profile_link, 
    video_link, video_id, duration, reward, total_budget, remaining_budget,
    target_count, price, status, payment_confirmed_at
  )
  VALUES (
    auth.uid(), p_plan_type::plan_type, p_plan_name, p_platform::platform_type, p_page_link, p_profile_link, 
    p_video_link, p_video_id, v_duration_int, COALESCE(v_reward_num, (v_price / v_target_count)), v_price, v_price,
    v_target_count, v_price, 'active'::campaign_status, now()
  )
  RETURNING id INTO v_campaign_id;

  RETURN v_campaign_id;
END; $$;

-- 7. PERMISSÕES E RELOAD
GRANT EXECUTE ON FUNCTION public.create_campaign_with_balance_v3(text, text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_campaign_with_balance_v3(text, text, text, text, text, text, text, text, text, text) TO anon;

NOTIFY pgrst, 'reload schema';
