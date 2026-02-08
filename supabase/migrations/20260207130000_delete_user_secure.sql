-- Função para deletar usuário (apenas admin)
-- Esta função deve ser chamada via RPC pelo frontend

CREATE OR REPLACE FUNCTION public.delete_user_secure(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role app_role;
BEGIN
  -- 1. Verificar se quem chama é admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem deletar usuários.';
  END IF;

  -- 2. Impedir que o admin se delete a si mesmo (opcional, mas recomendado)
  IF auth.uid() = target_user_id THEN
    RAISE EXCEPTION 'Você não pode deletar a sua própria conta de administrador.';
  END IF;

  -- 3. Deletar o usuário da tabela auth.users
  -- O Supabase cuidará do CASCADE para public.profiles e outras tabelas
  -- se as Foreign Keys estiverem configuradas com ON DELETE CASCADE (o que estão).
  DELETE FROM auth.users WHERE id = target_user_id;
  
  -- Se o usuário não existir, o DELETE não falha, apenas não faz nada.
  -- Podemos verificar se foi deletado:
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.';
  END IF;

END;
$$;

-- Permitir que autenticados chamem (a função verifica internamente se é admin)
GRANT EXECUTE ON FUNCTION public.delete_user_secure(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
