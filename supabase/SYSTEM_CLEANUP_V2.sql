-- ============================================
-- LIMPEZA DO SISTEMA V2: RPC de Reinicialização Segura com Log de Auditoria
-- Execute este script no Editor SQL do Supabase
-- ============================================

-- 1. Criar tabela system_logs para auditoria
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Ativar RLS na system_logs
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para system_logs (administradores só podem visualizar, inserções via SECURITY DEFINER)
DROP POLICY IF EXISTS "Admins can view system logs" ON public.system_logs;
CREATE POLICY "Admins can view system logs" ON public.system_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 2. Criar a função RPC system_cleanup_v2
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
  -- Obter o ID do utilizador que chama a função
  v_admin_id := auth.uid();
  
  -- Verificar se o utilizador está autenticado
  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Não autorizado: Sessão inválida.'
    );
  END IF;
  
  -- Verificar se o utilizador é administrador
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_admin_id AND role = 'admin'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Acesso negado: Apenas administradores podem executar esta ação.'
    );
  END IF;
  
  -- Iniciar operações de limpeza (todas dentro desta transação)
  
  -- 1. Eliminar tarefas (referenciam campanhas via FK)
  DELETE FROM public.tasks WHERE true;
  GET DIAGNOSTICS v_tasks_count = ROW_COUNT;
  
  -- 2. Eliminar campanhas
  DELETE FROM public.campaigns WHERE true;
  GET DIAGNOSTICS v_campaigns_count = ROW_COUNT;
  
  -- 3. Eliminar levantamentos
  DELETE FROM public.withdrawals WHERE true;
  GET DIAGNOSTICS v_withdrawals_count = ROW_COUNT;
  
  -- 4. Eliminar depósitos
  DELETE FROM public.deposits WHERE true;
  GET DIAGNOSTICS v_deposits_count = ROW_COUNT;
  
  -- 5. Eliminar notificações
  DELETE FROM public.notifications WHERE true;
  GET DIAGNOSTICS v_notifications_count = ROW_COUNT;
  
  -- 6. Eliminar dispositivos bloqueados
  DELETE FROM public.blocked_devices WHERE true;
  GET DIAGNOSTICS v_blocked_devices_count = ROW_COUNT;
  
  -- 7. Eliminar mensagens de chat
  DELETE FROM public.chat_messages WHERE true;
  GET DIAGNOSTICS v_chat_messages_count = ROW_COUNT;
  
  -- 8. Eliminar moderação de chat
  DELETE FROM public.chat_moderation WHERE true;
  GET DIAGNOSTICS v_chat_moderation_count = ROW_COUNT;
  
  -- 9. Eliminar documentos KYC
  BEGIN
    DELETE FROM public.kyc_documents WHERE true;
    GET DIAGNOSTICS v_kyc_documents_count = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    v_kyc_documents_count := 0;
  END;
  
  -- 10. Eliminar métodos de levantamento
  BEGIN
    DELETE FROM public.withdraw_methods WHERE true;
    GET DIAGNOSTICS v_withdraw_methods_count = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    v_withdraw_methods_count := 0;
  END;

  -- 11. Eliminar comissões de referência
  BEGIN
    DELETE FROM public.referral_commissions WHERE true;
    GET DIAGNOSTICS v_referral_commissions_count = ROW_COUNT;
  EXCEPTION WHEN undefined_table THEN
    v_referral_commissions_count := 0;
  END;
  
  -- 12. Reinicializar perfis (saldos, métricas de acesso e referências)
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

  -- 13. Limpar logs antigos do sistema (exceto este log de reset que será inserido a seguir)
  DELETE FROM public.system_logs WHERE true;
  
  -- Construir JSON de contagens eliminadas
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
  
  -- Registar a ação
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

-- 3. Conceder permissão de execução a utilizadores autenticados (verificação de admin é interna)
GRANT EXECUTE ON FUNCTION public.system_cleanup_v2() TO authenticated;

-- 4. Recarregar cache do esquema
NOTIFY pgrst, 'reload schema';

-- ============================================
-- FIM DA MIGRAÇÃO DE LIMPEZA DO SISTEMA V2
-- ============================================
