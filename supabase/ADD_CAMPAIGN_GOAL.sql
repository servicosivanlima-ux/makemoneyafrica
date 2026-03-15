-- Add campaign_goal column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS campaign_goal TEXT DEFAULT 'followers';

-- Update the view for workers to include the new column
DROP VIEW IF EXISTS public.available_campaigns_for_workers;
CREATE OR REPLACE VIEW public.available_campaigns_for_workers WITH (security_invoker = on) AS
SELECT c.*
FROM public.campaigns c
WHERE c.status = 'active'
AND NOT EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.campaigns past_c ON t.campaign_id = past_c.id
    WHERE t.worker_id = auth.uid()
    AND t.status IN ('in_progress', 'pending_review', 'approved')
    AND (
        -- For 'Followers' plan: Block by page_link
        (c.plan_type = 'ta_no_limao' AND past_c.page_link = c.page_link AND past_c.plan_type = 'ta_no_limao')
        OR
        -- For 'Kwanza' plan: Block by video_link (specific post)
        (c.plan_type = 'kwanza' AND past_c.video_link = c.video_link AND past_c.plan_type = 'kwanza')
    )
);

-- Update create_campaign_with_balance_v3 to handle campaign_goal
CREATE OR REPLACE FUNCTION public.create_campaign_with_balance_v4(
  p_plan_type text, 
  p_plan_name text, 
  p_platform text, 
  p_page_link text,
  p_profile_link text DEFAULT NULL, 
  p_video_link text DEFAULT NULL,
  p_video_id text DEFAULT NULL, 
  p_duration text DEFAULT NULL,
  p_reward text DEFAULT NULL, 
  p_total_budget text DEFAULT NULL,
  p_campaign_goal text DEFAULT 'followers'
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
    -- Fixed Plans
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
    target_count, price, status, payment_confirmed_at, campaign_goal
  )
  VALUES (
    auth.uid(), p_plan_type::plan_type, p_plan_name, p_platform::platform_type, p_page_link, p_profile_link, 
    p_video_link, p_video_id, v_duration_int, COALESCE(v_reward_num, (v_price / v_target_count)), v_price, v_price,
    v_target_count, v_price, 'active'::campaign_status, now(), p_campaign_goal
  )
  RETURNING id INTO v_campaign_id;

  RETURN v_campaign_id;
END; $$;

-- Update permissions for the new function
GRANT EXECUTE ON FUNCTION public.create_campaign_with_balance_v4(text, text, text, text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_campaign_with_balance_v4(text, text, text, text, text, text, text, text, text, text, text) TO anon;

-- Note: create_campaign_with_balance_v3 remains for backward compatibility if needed, 
-- but frontend will now use v4.

NOTIFY pgrst, 'reload schema';
