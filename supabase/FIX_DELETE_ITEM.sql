-- ============================================
-- FIX: delete_item_immediately RPC
-- Adds proper permissions and robust deletion logic
-- ============================================

CREATE OR REPLACE FUNCTION public.delete_item_immediately(p_item_id uuid, p_type text) 
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
  v_deleted boolean := false;
BEGIN
  IF p_type = 'campaign' THEN
    DELETE FROM campaigns 
    WHERE id = p_item_id 
    AND (client_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
    
    IF FOUND THEN v_deleted := true; END IF;
    
  ELSIF p_type = 'task' THEN
    DELETE FROM tasks 
    WHERE id = p_item_id 
    AND (worker_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
    
    IF FOUND THEN v_deleted := true; END IF;
  END IF;

  IF NOT v_deleted THEN
     RAISE EXCEPTION 'Item não encontrado ou você não tem permissão para excluí-lo.';
  END IF;

  RETURN true;
END; $$;

-- 2. Grant explicit execute permissions to authenticated users
REVOKE EXECUTE ON FUNCTION public.delete_item_immediately(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.delete_item_immediately(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_item_immediately(uuid, text) TO service_role;

-- 3. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
