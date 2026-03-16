-- ============================================
-- FIX V6: Garantir Schema e Criar Função v5
-- Execute no Supabase SQL Editor do projeto xofpoelcmcfpzmkopecu
-- ============================================

-- 1. Garantir que as colunas necessárias existem na tabela campaigns
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
END $$;

-- 2. Garantir que o valor 'pending_admin_setup' existe no enum campaign_status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'campaign_status' AND e.enumlabel = 'pending_admin_setup') THEN
        ALTER TYPE public.campaign_status ADD VALUE 'pending_admin_setup';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Recriar a função create_campaign_with_balance_v5
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
BEGIN
  v_client_id := auth.uid();
  
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado. Por favor, faça login novamente.';
  END IF;

  -- Verify the user exists in profiles and get balance
  SELECT wallet_balance INTO v_wallet_balance
  FROM profiles
  WHERE user_id = v_client_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Perfil não encontrado para o usuário %', v_client_id;
  END IF;

  IF v_wallet_balance < p_price THEN
    RAISE EXCEPTION 'Saldo insuficiente. Saldo actual: % Kz. Necessário: % Kz', v_wallet_balance, p_price;
  END IF;

  -- Determine status based on platform and video
  IF p_platform = 'youtube' AND p_video_id IS NOT NULL THEN
    v_status := 'pending_admin_setup';
  ELSE
    v_status := 'active';
  END IF;

  -- Deduct from wallet
  UPDATE profiles
  SET wallet_balance = wallet_balance - p_price
  WHERE user_id = v_client_id;

  -- Create the campaign
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
    now(),
    now()
  )
  RETURNING id INTO v_campaign_id;

  RETURN v_campaign_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_campaign_with_balance_v5(text, text, text, text, integer, integer, text, text, integer, text) TO authenticated;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
