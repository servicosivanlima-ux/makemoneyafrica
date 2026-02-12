-- ======================================================
-- WORKER ANTI-FRAUD TASK FILTERING
-- Ensures workers cannot repeat tasks for the same link
-- across different campaigns (Followers or Engagement).
-- ======================================================

-- 1. Update the View for Workers
-- Now it excludes campaigns where the worker has already had an approved or pending task for that specific link.
CREATE OR REPLACE VIEW public.available_campaigns_for_workers WITH (security_invoker = on) AS
SELECT c.*
FROM public.campaigns c
WHERE c.status = 'active'
AND NOT EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.campaigns past_c ON t.campaign_id = past_c.id
    WHERE t.worker_id = auth.uid()
    -- We block if they have a task that is NOT rejected for this same target
    -- Status check: We block if they successfully completed it OR if it's currently in review/progress
    AND t.status IN ('in_progress', 'pending_review', 'approved')
    AND (
        -- For 'Followers' plan: Block by page_link
        (c.plan_type IN ('ta_no_limao', 'limao') AND past_c.page_link = c.page_link AND past_c.plan_type IN ('ta_no_limao', 'limao'))
        OR
        -- For 'Kwanza' plan: Block by video_link (specific post)
        (c.plan_type = 'kwanza' AND past_c.video_link = c.video_link AND past_c.plan_type = 'kwanza')
    )
);

-- 2. Update the worker_claim_task RPC to be link-aware
CREATE OR REPLACE FUNCTION public.worker_claim_task(p_campaign_id uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE 
  v_task_id uuid; 
  v_worker_id uuid; 
  v_campaign campaigns%ROWTYPE; 
  v_reward_amount integer;
  v_link_already_used boolean;
BEGIN
  v_worker_id := auth.uid();
  IF v_worker_id IS NULL THEN RAISE EXCEPTION 'Não autorizado'; END IF;
  IF NOT has_role(v_worker_id, 'worker'::app_role) THEN RAISE EXCEPTION 'Apenas trabalhadores podem reclamar tarefas'; END IF;

  -- Get campaign details
  SELECT * INTO v_campaign FROM campaigns WHERE id = p_campaign_id AND status = 'active';
  IF v_campaign.id IS NULL THEN RAISE EXCEPTION 'Campanha não encontrada ou não está ativa'; END IF;

  -- Antifraud Check: Check if worker has ALREADY done a task for this page/video in ANY campaign
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

  -- Pricing Logic
  v_reward_amount := CASE WHEN v_campaign.plan_type IN ('ta_no_limao', 'limao') THEN 100 ELSE 200 END;

  -- Atomic claim (reuse available task slot if exists, otherwise create new)
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

-- Reload schema
NOTIFY pgrst, 'reload schema';
