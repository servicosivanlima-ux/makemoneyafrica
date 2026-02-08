-- Criando versão V2 da função de deletar para contornar problemas de cache do Supabase
-- Nome diferente garante que o PostgREST pegue a nova definição

CREATE OR REPLACE FUNCTION public.delete_user_v2(target_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
BEGIN
  v_caller_id := auth.uid();

  -- 1. Verificar se quem chama é admin
  IF NOT public.has_role(v_caller_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem deletar usuários.';
  END IF;

  -- 2. Impedir que o admin se delete a si mesmo
  IF v_caller_id = target_id THEN
    RAISE EXCEPTION 'Você não pode deletar a sua própria conta de administrador.';
  END IF;

  -- 3. Deletar o usuário da tabela auth.users
  DELETE FROM auth.users WHERE id = target_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.delete_user_v2(UUID) TO authenticated;

-- Força reload do schema
NOTIFY pgrst, 'reload schema';
