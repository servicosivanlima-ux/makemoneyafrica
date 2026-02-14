-- ============================================
-- SYSTEM CLEANUP V2: Secure Reset RPC with Audit Logging
-- Execute this script in Supabase SQL Editor
-- ============================================

-- 1. Create system_logs table for auditing
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on system_logs
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_logs (admins can only view, inserts via SECURITY DEFINER)
DROP POLICY IF EXISTS "Admins can view system logs" ON public.system_logs;
CREATE POLICY "Admins can view system logs" ON public.system_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 2. Create the system_cleanup_v2 RPC function
CREATE OR REPLACE FUNCTION public.system_cleanup_v2()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_deleted_counts JSONB;
  v_tasks_count INTEGER := 0;
  v_campaigns_count INTEGER := 0;
  v_withdrawals_count INTEGER := 0;
  v_deposits_count INTEGER := 0;
  v_notifications_count INTEGER := 0;
  v_blocked_devices_count INTEGER := 0;
  v_chat_messages_count INTEGER := 0;
  v_chat_moderation_count INTEGER := 0;
  v_kyc_documents_count INTEGER := 0;
  v_withdraw_methods_count INTEGER := 0;
  v_referral_commissions_count INTEGER := 0;
  v_profiles_reset_count INTEGER := 0;
BEGIN
  -- Get the caller's user ID
  v_admin_id := auth.uid();
  
  -- Check if caller is authenticated
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Não autorizado: Sessão inválida.'
    );
  END IF;
  
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_admin_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Acesso negado: Apenas administradores podem executar esta ação.'
    );
  END IF;
  
  -- Start cleanup operations (all within this transaction)
  
  -- 1. Delete tasks (references campaigns via FK)
  DELETE FROM public.tasks;
  GET DIAGNOSTICS v_tasks_count = ROW_COUNT;
  
  -- 2. Delete campaigns
  DELETE FROM public.campaigns;
  GET DIAGNOSTICS v_campaigns_count = ROW_COUNT;
  
  -- 3. Delete withdrawals
  DELETE FROM public.withdrawals;
  GET DIAGNOSTICS v_withdrawals_count = ROW_COUNT;
  
  -- 4. Delete deposits
  DELETE FROM public.deposits;
  GET DIAGNOSTICS v_deposits_count = ROW_COUNT;
  
  -- 5. Delete notifications
  DELETE FROM public.notifications;
  GET DIAGNOSTICS v_notifications_count = ROW_COUNT;
  
  -- 6. Delete blocked_devices
  DELETE FROM public.blocked_devices;
  GET DIAGNOSTICS v_blocked_devices_count = ROW_COUNT;
  
  -- 7. Delete chat_messages
  DELETE FROM public.chat_messages;
  GET DIAGNOSTICS v_chat_messages_count = ROW_COUNT;
  
  -- 8. Delete chat_moderation
  DELETE FROM public.chat_moderation;
  GET DIAGNOSTICS v_chat_moderation_count = ROW_COUNT;
  
  -- 9. Delete kyc_documents
  BEGIN
    DELETE FROM public.kyc_documents;
    GET DIAGNOSTICS v_kyc_documents_count = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    v_kyc_documents_count := 0;
  END;
  
  -- 10. Delete withdraw_methods
  BEGIN
    DELETE FROM public.withdraw_methods;
    GET DIAGNOSTICS v_withdraw_methods_count = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    v_withdraw_methods_count := 0;
  END;

  -- 11. Delete referral_commissions
  BEGIN
    DELETE FROM public.referral_commissions;
    GET DIAGNOSTICS v_referral_commissions_count = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    v_referral_commissions_count := 0;
  END;
  
  -- 12. Reset profiles (balances, access metrics, and referrals)
  UPDATE public.profiles 
  SET 
    wallet_balance = 0, 
    access_count = 0, 
    last_access = NULL,
    referred_by = NULL
  WHERE 
    wallet_balance != 0 
    OR access_count != 0 
    OR last_access IS NOT NULL
    OR referred_by IS NOT NULL;
  GET DIAGNOSTICS v_profiles_reset_count = ROW_COUNT;

  -- 13. Clear old system logs (except this reset log which will be inserted next)
  DELETE FROM public.system_logs;
  
  -- Build deleted counts JSON
  v_deleted_counts := jsonb_build_object(
    'tasks', v_tasks_count,
    'campaigns', v_campaigns_count,
    'withdrawals', v_withdrawals_count,
    'deposits', v_deposits_count,
    'notifications', v_notifications_count,
    'blocked_devices', v_blocked_devices_count,
    'chat_messages', v_chat_messages_count,
    'chat_moderation', v_chat_moderation_count,
    'kyc_documents', v_kyc_documents_count,
    'withdraw_methods', v_withdraw_methods_count,
    'referral_commissions', v_referral_commissions_count,
    'profiles_reset', v_profiles_reset_count
  );
  
  -- Log the action
  INSERT INTO public.system_logs (admin_id, action, details)
  VALUES (
    v_admin_id,
    'system_cleanup_v2',
    jsonb_build_object(
      'timestamp', now(),
      'deleted_counts', v_deleted_counts
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Sistema reinicializado com sucesso.',
    'deleted_counts', v_deleted_counts
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Erro ao reinicializar sistema: ' || SQLERRM
  );
END;
$$;

-- 3. Grant execute permission to authenticated users (admin check is internal)
GRANT EXECUTE ON FUNCTION public.system_cleanup_v2() TO authenticated;

-- 4. Reload schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================
-- END OF SYSTEM CLEANUP V2 MIGRATION
-- ============================================
