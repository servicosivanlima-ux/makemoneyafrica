-- Create a secure function for workers to claim tasks
CREATE OR REPLACE FUNCTION public.worker_claim_task(p_campaign_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task_id uuid;
  v_worker_id uuid;
  v_campaign campaigns%ROWTYPE;
  v_reward_amount integer;
  v_existing_task_count integer;
BEGIN
  -- Get current user ID
  v_worker_id := auth.uid();
  
  IF v_worker_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  
  -- Verify user is a worker
  IF NOT has_role(v_worker_id, 'worker'::app_role) THEN
    RAISE EXCEPTION 'Apenas trabalhadores podem reclamar tarefas';
  END IF;
  
  -- Check if worker already has a task for this campaign
  SELECT COUNT(*) INTO v_existing_task_count
  FROM tasks
  WHERE campaign_id = p_campaign_id AND worker_id = v_worker_id;
  
  IF v_existing_task_count > 0 THEN
    RAISE EXCEPTION 'Você já tem uma tarefa para esta campanha';
  END IF;
  
  -- Get campaign details
  SELECT * INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id AND status = 'active';
  
  IF v_campaign.id IS NULL THEN
    RAISE EXCEPTION 'Campanha não encontrada ou não está ativa';
  END IF;
  
  -- Check if campaign has remaining slots
  IF v_campaign.completed_count >= v_campaign.target_count THEN
    RAISE EXCEPTION 'Esta campanha já atingiu o limite de tarefas';
  END IF;
  
  -- Calculate reward based on plan type
  v_reward_amount := CASE WHEN v_campaign.plan_type = 'ta_no_limao' THEN 200 ELSE 600 END;
  
  -- First try to claim an existing available task
  UPDATE tasks
  SET worker_id = v_worker_id,
      status = 'in_progress',
      assigned_at = now()
  WHERE campaign_id = p_campaign_id
    AND status = 'available'
    AND worker_id IS NULL
  RETURNING id INTO v_task_id;
  
  -- If no available task, create a new one
  IF v_task_id IS NULL THEN
    INSERT INTO tasks (
      campaign_id,
      worker_id,
      status,
      reward_amount,
      assigned_at
    ) VALUES (
      p_campaign_id,
      v_worker_id,
      'in_progress',
      v_reward_amount,
      now()
    ) RETURNING id INTO v_task_id;
  END IF;
  
  RETURN v_task_id;
END;
$$;