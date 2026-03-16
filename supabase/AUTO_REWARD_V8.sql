-- ============================================
-- FIX V8: Remover Ambiguidade e Automatizar Recompensa
-- Execute no Supabase SQL Editor do projeto xofpoelcmcfpzmkopecu
-- ============================================

-- 1. Garantir que as colunas necessárias existem
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='campaign_goal') THEN
        ALTER TABLE public.campaigns ADD COLUMN campaign_goal text DEFAULT 'follow';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='video_title') THEN
        ALTER TABLE public.campaigns ADD COLUMN video_title text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='video_duration') THEN
        ALTER TABLE public.campaigns ADD COLUMN video_duration integer;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='video_id') THEN
        ALTER TABLE public.campaigns ADD COLUMN video_id text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='reward_amount_override') THEN
        ALTER TABLE public.campaigns ADD COLUMN reward_amount_override numeric;
    END IF;
END $$;

-- 2. APAGAR COMPLETAMENTE TODAS as versões antigas da função para evitar o erro de ambiguidade
DROP FUNCTION IF EXISTS public.create_campaign_with_balance_v5(text, text, text, text, integer, integer, text, text, integer, text);
DROP FUNCTION IF EXISTS public.create_campaign_with_balance_v5(text, text, text, text, integer, integer, text, text, integer);
DROP FUNCTION IF EXISTS public.create_campaign_with_balance_v5(text, text, text, text, integer, integer);
DROP FUNCTION IF EXISTS public.create_campaign_with_balance_v5();

-- 3. Recriar a função create_campaign_with_balance_v5 com cálculo automático (40%)
CREATE OR REPLACE FUNCTION public.create_campaign_with_balance_v5(
  p_plan_type text, 
  p_plan_name text, 
  p_platform text, 
  p_page_link text, 
  p_target_count integer, 
  p_price integer, 
  p_campaign_goal text DEFAULT 'follow',
  p_video_title text DEFAULT NULL,
  p_video_duration integer DEFAULT NULL,
  p_video_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_id uuid;
  v_client_id uuid;
  v_wallet_balance numeric;
  v_status text;
  v_reward_per_task numeric;
  v_reward_per_second numeric := NULL;
BEGIN
  v_client_id := auth.uid();
  
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado. Por favor, faça login novamente.';
  END IF;

  -- Obter saldo da carteira do cliente
  SELECT wallet_balance INTO v_wallet_balance
  FROM profiles
  WHERE user_id = v_client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado para o usuário %', v_client_id;
  END IF;

  IF v_wallet_balance < p_price THEN
    RAISE EXCEPTION 'Saldo insuficiente. Saldo actual: % Kz. Necessário: % Kz', v_wallet_balance, p_price;
  END IF;

  -- Calcular a recompensa (40% do valor pago por tarefa)
  v_reward_per_task := (p_price::numeric / p_target_count::numeric) * 0.40;

  -- Deduzir da carteira do cliente
  UPDATE profiles
  SET wallet_balance = wallet_balance - p_price
  WHERE user_id = v_client_id;

  -- Determinar status e recompensa por segundo (para YouTube views)
  IF p_platform = 'youtube' AND p_video_duration > 0 THEN
      v_reward_per_second := v_reward_per_task / p_video_duration;
      v_status := 'active'; -- YouTube passa a ser AUTO ACTIVADO
  ELSE
      v_status := 'active';
  END IF;

  -- Criar a campanha
  INSERT INTO campaigns (
    client_id,
    plan_type,
    plan_name,
    platform,
    page_link,
    target_count,
    price,
    status,
    campaign_goal,
    video_title,
    video_duration,
    video_id,
    video_link,
    reward_amount_override,
    created_at,
    updated_at
  )
  VALUES (
    v_client_id,
    p_plan_type::plan_type,
    p_plan_name,
    p_platform::platform_type,
    p_page_link,
    p_target_count,
    p_price,
    v_status::campaign_status,
    p_campaign_goal,
    p_video_title,
    p_video_duration,
    p_video_id,
    CASE WHEN p_video_id IS NOT NULL THEN p_page_link ELSE NULL END,
    CASE WHEN p_platform = 'youtube' THEN v_reward_per_second ELSE v_reward_per_task END,
    now(),
    now()
  )
  RETURNING id INTO v_campaign_id;

  RETURN v_campaign_id;
END;
$$;

-- 4. Actualizar as campanhas pendentes antigas para evitar que fiquem presas pendentes
UPDATE campaigns 
SET status = 'active', 
    activated_at = now(),
    reward_amount_override = ((price::numeric / target_count::numeric) * 0.40) / video_duration
WHERE status = 'pending_admin_setup' AND platform = 'youtube' AND video_duration > 0;

-- 5. Dar permissões explicitamente apontando aos argumentos corretos
GRANT EXECUTE ON FUNCTION public.create_campaign_with_balance_v5(text, text, text, text, integer, integer, text, text, integer, text) TO authenticated;
NOTIFY pgrst, 'reload schema';
