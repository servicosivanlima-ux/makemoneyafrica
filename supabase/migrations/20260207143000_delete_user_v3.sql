-- Criando versão V3 da função de deletar:
-- 1. Aceita TEXT para evitar problemas de tipagem UUID no RPC
-- 2. Retorna JSON para melhor tratamento de erro no frontend
-- 3. Usa try/catch interno

CREATE OR REPLACE FUNCTION public.delete_user_v3(target_id_text TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_target_uuid UUID;
BEGIN
  v_caller_id := auth.uid();
  
  -- Tentar converter para UUID
  BEGIN
    v_target_uuid := target_id_text::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'ID inválido');
  END;

  -- 1. Verificar se quem chama é admin
  IF NOT public.has_role(v_caller_id, 'admin'::app_role) THEN
    RETURN json_build_object('success', false, 'message', 'Acesso negado: Apenas administradores.');
  END IF;

  -- 2. Impedir auto-deleção
  IF v_caller_id = v_target_uuid THEN
    RETURN json_build_object('success', false, 'message', 'Erro: Você não pode deletar sua própria conta.');
  END IF;

  -- 3. Deletar
  DELETE FROM auth.users WHERE id = v_target_uuid;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Usuário não encontrado.');
  ELSE
    RETURN json_build_object('success', true);
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_v3(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
