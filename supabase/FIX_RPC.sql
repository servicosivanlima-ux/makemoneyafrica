-- FIX RPC FUNCTIONS
-- Run this in Supabase SQL Editor

-- 1. Approve Deposit RPC
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(p_deposit_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_client_id uuid; v_amount integer;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  
  -- Update deposit status
  UPDATE deposits 
  SET status = 'approved', updated_at = now() 
  WHERE id = p_deposit_id AND status = 'pending'
  RETURNING client_id, amount INTO v_client_id, v_amount;
  
  -- If not found, raise exception
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit not found or already processed'; END IF;
  
  -- Credit user wallet
  UPDATE profiles 
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_amount 
  WHERE user_id = v_client_id;
  
  RETURN true;
END; $$;

-- 2. Reject Deposit RPC
CREATE OR REPLACE FUNCTION public.admin_reject_deposit(p_deposit_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE deposits SET status = 'rejected', updated_at = now() WHERE id = p_deposit_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  RETURN true;
END; $$;

-- 3. Grant Permissions
GRANT EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_deposit(uuid) TO authenticated;

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
