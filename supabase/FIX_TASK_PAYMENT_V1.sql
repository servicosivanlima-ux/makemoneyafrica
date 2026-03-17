-- ============================================
-- FIX: Task Payment on Approval
-- This script ensures workers get paid when an admin approves their task manually.
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_approve_task(p_task_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE 
  v_campaign_id uuid;
  v_worker_id uuid;
  v_reward numeric;
BEGIN
  -- 1. Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN 
    RAISE EXCEPTION 'Unauthorized: Admin role required'; 
  END IF;
  
  -- 2. Update task status and get details
  -- Atomic operation ensures we only pay once per task
  UPDATE public.tasks 
  SET 
    status = 'approved', 
    reviewed_at = now(), 
    reviewed_by = auth.uid() 
  WHERE id = p_task_id AND status = 'pending_review' 
  RETURNING campaign_id, worker_id, reward_amount INTO v_campaign_id, v_worker_id, v_reward;
  
  -- 3. Validation
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Tarefa não encontrada ou já processada.'; 
  END IF;
  
  -- 4. Credit worker wallet
  UPDATE public.profiles 
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_reward
  WHERE user_id = v_worker_id;
  
  -- 5. Increment campaign completed count
  UPDATE public.campaigns 
  SET 
    completed_count = COALESCE(completed_count, 0) + 1, 
    updated_at = now() 
  WHERE id = v_campaign_id;
  
  RETURN true;
END; $$;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION public.admin_approve_task(uuid) TO authenticated;

-- 7. Reload schema cache
NOTIFY pgrst, 'reload schema';
