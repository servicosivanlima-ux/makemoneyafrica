-- Este script força o recarregamento do cache do Supabase (REST API)
-- e recria a função para garantir que ela exista e seja pega pelo cache.

-- 1. Força reload do cache
NOTIFY pgrst, 'reload schema';

-- 2. Recria a função explicitamente (por segurança)
DROP FUNCTION IF EXISTS public.delete_user_secure(UUID);

CREATE OR REPLACE FUNCTION public.delete_user_secure(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role app_role;
BEGIN
  -- Verificar se quem chama é admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem deletar usuários.';
  END IF;

  -- Impedir auto-deleção
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'Você não pode deletar a sua própria conta de administrador.';
  END IF;

  -- Deletar (CASCADE)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_secure(UUID) TO authenticated;

-- Força reload novamente (redundância)
NOTIFY pgrst, 'reload schema';
