-- ============================================
-- FIX V9: Corrigir separação de Link de Canal e Link de Vídeo
-- Execute no Supabase SQL Editor do projeto xofpoelcmcfpzmkopecu
-- ============================================

-- 1. Actualizar a função create_campaign_with_balance_v5 para aceitar o link do vídeo separadamente
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
  p_video_id text DEFAULT NULL,
  p_video_link text DEFAULT NULL -- Novo parâmetro opcional
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
      v_status := 'active'; 
  ELSE
      v_status := 'active';
  END IF;

  -- Criar a campanha
  INSERT INTO campaigns (
    client_id,
    plan_type,
    plan_name,
    platform,
    page_link,       -- Link do Canal / Perfil
    target_count,
    price,
    status,
    campaign_goal,
    video_title,
    video_duration,
    video_id,
    video_link,      -- Link do Vídeo específico
    reward_amount_override,
    created_at,
    updated_at
  )
  VALUES (
    v_client_id,
    p_plan_type::plan_type,
    p_plan_name,
    p_platform::platform_type,
    p_page_link,     -- O frontend agora envia o link do canal aqui
    p_target_count,
    p_price,
    v_status::campaign_status,
    p_campaign_goal,
    p_video_title,
    p_video_duration,
    p_video_id,
    p_video_link,    -- Guardamos o link do vídeo aqui
    CASE WHEN p_platform = 'youtube' THEN v_reward_per_second ELSE v_reward_per_task END,
    now(),
    now()
  )
  RETURNING id INTO v_campaign_id;

  RETURN v_campaign_id;
END;
$$;

-- 2. Dar permissões explicitamente apontando aos novos argumentos
GRANT EXECUTE ON FUNCTION public.create_campaign_with_balance_v5(text, text, text, text, integer, integer, text, text, integer, text, text) TO authenticated;

-- 3. Actualizar a view para garantir que os links sejam expostos correctamente para os trabalhadores
CREATE OR REPLACE VIEW public.available_campaigns_for_workers WITH (security_invoker = on) AS
SELECT 
    id, 
    plan_type, 
    plan_name, 
    platform, 
    page_link,       -- Link do canal para subscrição
    profile_link, 
    video_link,      -- Link do vídeo para visualização
    video_id,        -- ID para o player
    video_title,
    video_duration,
    target_count, 
    completed_count, 
    status, 
    created_at,
    reward_amount_override as reward -- Expor a recompensa calculada
FROM public.campaigns 
WHERE status = 'active';

NOTIFY pgrst, 'reload schema';
