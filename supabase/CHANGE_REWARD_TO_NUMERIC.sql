-- migration_payment_rules.sql

-- 1. Alter table columns to support decimals
ALTER TABLE public.profiles ALTER COLUMN wallet_balance TYPE NUMERIC(15,2);
ALTER TABLE public.campaigns ALTER COLUMN reward TYPE NUMERIC(10,2);
ALTER TABLE public.campaigns ALTER COLUMN remaining_budget TYPE NUMERIC(15,2);
ALTER TABLE public.tasks ALTER COLUMN reward_amount TYPE NUMERIC(10,2);

-- 2. Update create_campaign_with_balance
CREATE OR REPLACE FUNCTION public.create_campaign_with_balance(
  p_plan_type text, p_plan_name text, p_platform text, p_page_link text,
  p_profile_link text DEFAULT NULL, p_video_link text DEFAULT NULL,
  p_video_id text DEFAULT NULL, p_duration integer DEFAULT NULL,
  p_reward numeric DEFAULT NULL, p_total_budget numeric DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_campaign_id uuid; v_price numeric; v_target_count integer; v_user_type text; v_balance numeric;
BEGIN
  -- Validate user type
  SELECT user_type, wallet_balance INTO v_user_type, v_balance FROM profiles WHERE user_id = auth.uid();
  IF v_user_type != 'client' THEN RAISE EXCEPTION 'Only clients can create campaigns'; END IF;

  -- Get Pricing / Logic for V2
  IF p_total_budget IS NOT NULL AND p_reward IS NOT NULL AND p_reward > 0 THEN
    v_price := p_total_budget;
    v_target_count := floor(p_total_budget / p_reward);
  ELSE
    -- Original logic for fixed plans (Fallback/Legacy)
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
    p_video_link, p_video_id, p_duration, COALESCE(p_reward, (v_price / v_target_count)), v_price, v_price,
    v_target_count, v_price, 'active'::campaign_status, now()
  )
  RETURNING id INTO v_campaign_id;

  RETURN v_campaign_id;
END; $$;

-- 3. Update worker_claim_task
CREATE OR REPLACE FUNCTION public.worker_claim_task(p_campaign_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE 
  v_task_id uuid; 
  v_worker_id uuid; 
  v_campaign campaigns%ROWTYPE; 
  v_reward_amount numeric;
  v_link_already_used boolean;
BEGIN
  v_worker_id := auth.uid();
  IF v_worker_id IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  IF NOT has_role(v_worker_id, 'worker'::app_role) THEN RAISE EXCEPTION 'Apenas trabalhadores podem reclamar tarefas'; END IF;

  -- Get campaign details
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id AND status = 'active';
  IF v_campaign.id IS NULL THEN RAISE EXCEPTION 'Campanha não encontrada ou não está ativa'; END IF;

  -- Antifraud Check
  SELECT EXISTS (
    SELECT 1 FROM tasks t
    JOIN campaigns past_c ON t.campaign_id = past_c.id
    WHERE t.worker_id = v_worker_id
    AND t.status IN ('in_progress', 'pending_review', 'approved')
    AND (
        (v_campaign.plan_type = 'ta_no_limao' AND past_c.page_link = v_campaign.page_link AND past_c.plan_type = 'ta_no_limao')
        OR
        (v_campaign.plan_type = 'kwanza' AND past_c.video_link = v_campaign.video_link AND past_c.plan_type = 'kwanza')
    )
  ) INTO v_link_already_used;

  IF v_link_already_used THEN 
    RAISE EXCEPTION 'Você já realizou uma tarefa para este link em outra campanha.'; 
  END IF;

  -- Capacity Checks
  IF v_campaign.completed_count >= v_campaign.target_count THEN RAISE EXCEPTION 'Esta campanha já atingiu o limite de tarefas'; END IF;

  -- Pricing Logic: Use the reward set on the campaign, or fallback to legacy defaults
  v_reward_amount := COALESCE(v_campaign.reward, CASE WHEN v_campaign.plan_type = 'ta_no_limao' THEN 100 ELSE 200 END);

  -- Atomic claim
  UPDATE tasks SET worker_id = v_worker_id, status = 'in_progress', assigned_at = now() 
  WHERE campaign_id = p_campaign_id AND status = 'available' AND worker_id IS NULL 
  RETURNING id INTO v_task_id;

  IF v_task_id IS NULL THEN
    INSERT INTO tasks (campaign_id, worker_id, status, reward_amount, assigned_at) 
    VALUES (p_campaign_id, v_worker_id, 'in_progress', v_reward_amount, now()) 
    RETURNING id INTO v_task_id;
  END IF;

  RETURN v_task_id;
END; $$;

-- 4. Update validate_video_task
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
