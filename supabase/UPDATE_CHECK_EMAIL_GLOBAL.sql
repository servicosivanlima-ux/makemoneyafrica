-- UPDATE: Verificar duplicidade de e-mail na tabela auth.users (Mestra)
-- Isso garante que nenhum e-mail seja cadastrado duas vezes, mesmo se não tiver sido confirmado.

CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = p_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_exists(text) TO anon, authenticated;

-- Recarregar schema para garantir que o PostgREST veja a mudança se necessário
NOTIFY pgrst, 'reload schema';
