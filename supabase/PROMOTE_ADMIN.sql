-- ============================================
-- PROMOVER USUÁRIO A ADMIN
-- ============================================

-- 1. Primeiro, você deve se cadastrar no site normalmente com o email:
-- makemoney.african@gmail.com

-- 2. Depois de se cadastrar, execute este script no SQL Editor:

DO $$ 
DECLARE 
  v_user_id UUID;
BEGIN
  -- Busca o ID do usuário pelo email
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'makemoney.african@gmail.com';

  IF v_user_id IS NOT NULL THEN
    -- Insere ou atualiza o papel para admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Também garante que no perfil esteja como 'client' ou 'worker' mas com permissão de admin
    -- Se quiser que ele veja o painel de admin, a função has_role cuidará disso.
    
    RAISE NOTICE 'Usuário makemoney.african@gmail.com promovido a ADMIN com sucesso!';
  ELSE
    RAISE WARNING 'Usuário não encontrado. Certifique-se de que já se cadastrou no site.';
  END IF;
END $$;
