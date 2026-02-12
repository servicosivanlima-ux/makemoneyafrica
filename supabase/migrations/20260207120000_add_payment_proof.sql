-- 1. Ensure the column exists
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS payment_proof_url text;

-- 2. Drop existing function versions to avoid signature mismatch
-- Dropping with 6 parameters (old version)
DROP FUNCTION IF EXISTS public.create_campaign_secure(text, text, text, text, text, text);
-- Dropping with 7 parameters (new version, to be safe)
DROP FUNCTION IF EXISTS public.create_campaign_secure(text, text, text, text, text, text, text);

-- 3. Create the new version with 7 parameters
CREATE OR REPLACE FUNCTION public.create_campaign_secure(
  p_plan_type text,
  p_plan_name text,
  p_platform text,
  p_page_link text,
  p_payment_proof_url text,
  p_profile_link text DEFAULT NULL,
  p_video_link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_id uuid;
  v_price integer;
  v_target_count integer;
  v_user_type text;
BEGIN
  -- Verify user is a client
  SELECT user_type INTO v_user_type 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  IF v_user_type != 'client' THEN
    RAISE EXCEPTION 'Only clients can create campaigns';
  END IF;
  
  -- Server-side price lookup
  IF p_plan_type = 'ta_no_limao' THEN
    CASE p_plan_name
      WHEN 'Básico' THEN v_price := 6000; v_target_count := 30;
      WHEN 'Super Básico' THEN v_price := 8000; v_target_count := 50;
      WHEN 'Tá Fixe' THEN v_price := 15000; v_target_count := 100;
      WHEN 'Bronze' THEN v_price := 27000; v_target_count := 200;
      WHEN 'Prata' THEN v_price := 75000; v_target_count := 500;
      WHEN 'Ouro' THEN v_price := 125000; v_target_count := 1000;
      WHEN 'Premium' THEN v_price := 400000; v_target_count := 3500;
      ELSE RAISE EXCEPTION 'Invalid plan name for Tá no Limão';
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
      ELSE RAISE EXCEPTION 'Invalid plan name for Kwanza';
    END CASE;
  END IF;
  
  -- Check for existing pending campaigns
  IF EXISTS (
    SELECT 1 FROM campaigns 
    WHERE client_id = auth.uid() 
    AND status = 'pending_payment'
  ) THEN
    RAISE EXCEPTION 'You already have a pending campaign';
  END IF;
  
  -- Insert campaign
  INSERT INTO campaigns (
    client_id, plan_type, plan_name, platform, page_link, payment_proof_url, 
    profile_link, video_link, target_count, price, status
  ) VALUES (
    auth.uid(), p_plan_type::plan_type, p_plan_name, p_platform::platform_type, 
    p_page_link, p_payment_proof_url, p_profile_link, p_video_link, 
    v_target_count, v_price, 'pending_payment'::campaign_status
  ) RETURNING id INTO v_campaign_id;
  
  RETURN v_campaign_id;
END;
$$;

-- 4. Set explicit permissions
GRANT EXECUTE ON FUNCTION public.create_campaign_secure(text, text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_campaign_secure(text, text, text, text, text, text, text) TO authenticated;

-- 5. Force schema cache reload
NOTIFY pgrst, 'reload schema';
