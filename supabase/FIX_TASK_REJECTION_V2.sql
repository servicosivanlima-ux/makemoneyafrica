-- ============================================
-- FIX: Task Rejection Automation & Retention
-- Increases rejection retention time to 24h and ensures schema reload
-- ============================================

CREATE OR REPLACE FUNCTION public.admin_reject_task(p_task_id uuid, p_reason text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- 1. Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN 
    RAISE EXCEPTION 'Unauthorized: Admin role required'; 
  END IF;
  
  -- 2. Update task status, reason and set a 24h retention timer
  -- A 24h timer gives workers enough time to see the rejection reason in their history
  UPDATE public.tasks 
  SET 
    status = 'rejected', 
    rejection_reason = p_reason, 
    scheduled_deletion_at = now() + interval '24 hours', -- Increased from 2 minutes
    reviewed_at = now(), 
    reviewed_by = auth.uid() 
  WHERE id = p_task_id AND status = 'pending_review';
  
  -- 3. Validation
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Tarefa não encontrada ou já processada.'; 
  END IF;
  
  RETURN true;
END; $$;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION public.admin_reject_task(uuid, text) TO authenticated;

-- 5. Reload schema cache
NOTIFY pgrst, 'reload schema';
