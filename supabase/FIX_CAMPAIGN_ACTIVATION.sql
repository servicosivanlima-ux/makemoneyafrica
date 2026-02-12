-- ======================================================
-- FIX: CAMPAIGN ACTIVATION RPC AND PERMISSIONS
-- Run this in your Supabase SQL Editor
-- ======================================================

-- 1. Redefine the function to ensure it exists with the correct signature
CREATE OR REPLACE FUNCTION public.create_campaign_with_balance(
  p_plan_type text, 
  p_plan_name text, 
  p_platform text, 
  p_page_link text,
  p_profile_link text DEFAULT NULL, 
  p_video_link text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE 
  v_campaign_id uuid; 
  v_price integer; 
  v_target_count integer; 
  v_user_type text; 
  v_balance integer;
BEGIN
  -- Validate user type and current balance
  SELECT user_type, wallet_balance INTO v_user_type, v_balance FROM profiles WHERE user_id = auth.uid();
  
  IF v_user_type != 'client' THEN 
    RAISE EXCEPTION 'Apenas clientes podem criar campanhas.'; 
  END IF;

  -- Pricing Logic
  IF p_plan_type = 'ta_no_limao' THEN
    CASE p_plan_name
      WHEN 'Básico' THEN v_price := 6000; v_target_count := 30;
      WHEN 'Super Básico' THEN v_price := 8000; v_target_count := 50;
      WHEN 'Tá Fixe' THEN v_price := 15000; v_target_count := 100;
      WHEN 'Bronze' THEN v_price := 27000; v_target_count := 200;
      WHEN 'Prata' THEN v_price := 75000; v_target_count := 500;
      WHEN 'Ouro' THEN v_price := 125000; v_target_count := 1000;
      WHEN 'Premium' THEN v_price := 400000; v_target_count := 3500;
      ELSE RAISE EXCEPTION 'Nome de plano inválido.';
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
      ELSE RAISE EXCEPTION 'Nome de plano inválido.';
    END CASE;
  END IF;

  -- Verify sufficient balance
  IF v_balance < v_price THEN
    RAISE EXCEPTION 'Saldo insuficiente. Recarregue sua carteira.';
  END IF;

  -- Deduct from Wallet
  UPDATE profiles 
  SET wallet_balance = wallet_balance - v_price 
  WHERE user_id = auth.uid();

  -- Create the Campaign
  INSERT INTO campaigns (
    client_id, 
    plan_type, 
    plan_name, 
    platform, 
    page_link, 
    profile_link, 
    video_link, 
    target_count, 
    price, 
    status, 
    payment_confirmed_at
  )
  VALUES (
    auth.uid(), 
    p_plan_type::plan_type, 
    p_plan_name, 
    p_platform::platform_type, 
    p_page_link, 
    p_profile_link, 
    p_video_link, 
    v_target_count, 
    v_price, 
    'active'::campaign_status, 
    now()
  )
  RETURNING id INTO v_campaign_id;

  RETURN v_campaign_id;
END; $$;

-- 2. Grant permissions (CRITICAL to fix "Could not find function")
GRANT EXECUTE ON FUNCTION public.create_campaign_with_balance(text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_campaign_with_balance(text, text, text, text, text, text) TO service_role;

-- 3. Force reload schema cache (Ensures PostgREST sees the new function/permissions)
NOTIFY pgrst, 'reload schema';

-- 4. Success message
DO $$ BEGIN
  RAISE NOTICE 'Fix applied: Function redefined, permissions granted, and schema cache reloaded.';
END $$;
