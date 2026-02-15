-- ============================================
-- YOUTUBE VIDEO TASKS (KWANZA PLAN V2) - FINAL CONSOLIDATED
-- Execute this script in Supabase SQL Editor to fix RPC errors
-- ============================================

-- 1. Update campaigns table with YouTube-specific fields
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS video_id TEXT,
ADD COLUMN IF NOT EXISTS channel_id TEXT,
ADD COLUMN IF NOT EXISTS duration INTEGER,
ADD COLUMN IF NOT EXISTS reward INTEGER,
ADD COLUMN IF NOT EXISTS total_budget INTEGER,
ADD COLUMN IF NOT EXISTS remaining_budget INTEGER;

-- 2. Create video_sessions table to track watch time
CREATE TABLE IF NOT EXISTS public.video_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    token TEXT NOT NULL,
    start_time TIMESTAMPTZ DEFAULT now() NOT NULL,
    completed BOOLEAN DEFAULT false NOT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS for video_sessions
ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_sessions
DROP POLICY IF EXISTS "Users can view own video sessions" ON public.video_sessions;
CREATE POLICY "Users can view own video sessions" ON public.video_sessions 
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own video sessions" ON public.video_sessions;
CREATE POLICY "Users can create own video sessions" ON public.video_sessions 
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all video sessions" ON public.video_sessions;
CREATE POLICY "Admins can view all video sessions" ON public.video_sessions 
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 3. Consolidated create_campaign_with_balance with all parameters
CREATE OR REPLACE FUNCTION public.create_campaign_with_balance(
  p_plan_type text, p_plan_name text, p_platform text, p_page_link text,
  p_profile_link text DEFAULT NULL, p_video_link text DEFAULT NULL,
  p_video_id text DEFAULT NULL, p_duration integer DEFAULT NULL,
  p_reward integer DEFAULT NULL, p_total_budget integer DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_campaign_id uuid; v_price integer; v_target_count integer; v_user_type text; v_balance integer;
BEGIN
  -- Validate user type
  SELECT user_type, wallet_balance INTO v_user_type, v_balance FROM profiles WHERE user_id = auth.uid();
  IF v_user_type != 'client' THEN RAISE EXCEPTION 'Only clients can create campaigns'; END IF;

  -- Get Pricing / Logic for V2
  IF p_total_budget IS NOT NULL AND p_reward IS NOT NULL AND p_reward > 0 THEN
    v_price := p_total_budget;
    v_target_count := floor(p_total_budget / p_reward);
  ELSE
    -- Original logic for fixed plans
    IF p_plan_type = 'ta_no_limao' OR p_plan_type = 'limao' THEN
      CASE p_plan_name
        WHEN 'Básico' THEN v_price := 6000; v_target_count := 30;
        WHEN 'Super Básico' THEN v_price := 8000; v_target_count := 50;
        WHEN 'Tá Fixe' THEN v_price := 15000; v_target_count := 100;
        WHEN 'Bronze' THEN v_price := 27000; v_target_count := 200;
        WHEN 'Prata' THEN v_price := 75000; v_target_count := 500;
        WHEN 'Ouro' THEN v_price := 125000; v_target_count := 1000;
        WHEN 'Premium' THEN v_price := 400000; v_target_count := 3500;
        ELSE RAISE EXCEPTION 'Invalid plan name';
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
        ELSE RAISE EXCEPTION 'Invalid plan name';
      END CASE;
    END IF;
  END IF;

  -- Check Balance
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
    p_video_link, p_video_id, p_duration, p_reward, v_price, v_price,
    v_target_count, v_price, 'active'::campaign_status, now()
  )
  RETURNING id INTO v_campaign_id;

  RETURN v_campaign_id;
END; $$;

-- 4. Sync function and other utility RPCs
CREATE OR REPLACE FUNCTION public.start_video_session(p_campaign_id UUID, p_token TEXT, p_ip TEXT)
RETURNS UUID AS $$
DECLARE v_session_id UUID;
BEGIN
    INSERT INTO public.video_sessions (user_id, campaign_id, token, ip_address)
    VALUES (auth.uid(), p_campaign_id, p_token, p_ip)
    RETURNING id INTO v_session_id;
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.validate_video_task(
    p_session_id UUID, p_token TEXT, p_is_subscribed BOOLEAN
) RETURNS JSONB AS $$
DECLARE v_session public.video_sessions%ROWTYPE; v_campaign public.campaigns%ROWTYPE; v_elapsed INTEGER; v_required INTEGER;
BEGIN
    SELECT * INTO v_session FROM public.video_sessions WHERE id = p_session_id AND user_id = auth.uid();
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Sessão não encontrada'); END IF;
    IF v_session.completed THEN RETURN jsonb_build_object('success', false, 'message', 'Tarefa já concluída'); END IF;
    SELECT * INTO v_campaign FROM public.campaigns WHERE id = v_session.campaign_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Campanha não encontrada'); END IF;
    IF v_session.token != p_token THEN RETURN jsonb_build_object('success', false, 'message', 'Token inválido'); END IF;
    v_elapsed := extract(epoch from (now() - v_session.start_time));
    v_required := LEAST(floor(v_campaign.duration * 0.7), 300);
    IF v_elapsed < v_required THEN
        RETURN jsonb_build_object('success', false, 'message', 'Tempo de visualização insuficiente');
    END IF;
    IF NOT p_is_subscribed THEN RETURN jsonb_build_object('success', false, 'message', 'Subscrição não verificada'); END IF;
    IF v_campaign.remaining_budget < v_campaign.reward THEN RETURN jsonb_build_object('success', false, 'message', 'Orçamento esgotado'); END IF;
    UPDATE public.video_sessions SET completed = true WHERE id = p_session_id;
    UPDATE public.campaigns SET remaining_budget = remaining_budget - reward, completed_count = completed_count + 1 WHERE id = v_session.campaign_id;
    UPDATE public.profiles SET wallet_balance = wallet_balance + v_campaign.reward WHERE user_id = auth.uid();
    INSERT INTO public.tasks (campaign_id, worker_id, status, reward_amount, completed_at)
    VALUES (v_session.campaign_id, auth.uid(), 'approved', v_campaign.reward, now());
    RETURN jsonb_build_object('success', true, 'reward', v_campaign.reward);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Reload Schema
NOTIFY pgrst, 'reload schema';
