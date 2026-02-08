-- =============================================================================
-- RESET COMPLETO: Deletar todos os usuários e configurar primeiro cadastro como Admin
-- =============================================================================
-- ATENÇÃO: Este script é DESTRUTIVO. Todos os dados serão perdidos.
-- =============================================================================

-- 1. Deletar TODOS os usuários (CASCADE removerá profiles, tasks, campaigns, etc.)
DELETE FROM auth.users;

-- 2. Criar/Atualizar função que torna o PRIMEIRO usuário cadastrado em Admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  v_user_type TEXT;
BEGIN
  -- Contar quantos usuários já existem
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  -- Determinar tipo de usuário
  v_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'client');

  -- Inserir perfil
  INSERT INTO public.profiles (
    user_id,
    full_name,
    email,
    phone,
    user_type,
    account_type,
    company_name,
    withdrawal_method,
    withdrawal_details,
    facebook_link,
    instagram_link,
    tiktok_link,
    youtube_link,
    device_hash
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    CASE WHEN user_count = 0 THEN 'admin' ELSE v_user_type END,
    NEW.raw_user_meta_data->>'account_type',
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'withdrawal_method',
    NEW.raw_user_meta_data->>'withdrawal_details',
    NEW.raw_user_meta_data->>'facebook_link',
    NEW.raw_user_meta_data->>'instagram_link',
    NEW.raw_user_meta_data->>'tiktok_link',
    NEW.raw_user_meta_data->>'youtube_link',
    NEW.raw_user_meta_data->>'device_hash'
  );

  -- Se for o PRIMEIRO usuário, dar role de admin
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  ELSE
    -- Senão, dar a role correspondente ao tipo
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_user_type::app_role);
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Garantir que o trigger existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Notificar para recarregar schema
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- FEITO! Agora o primeiro usuário que se cadastrar será automaticamente Admin.
-- =============================================================================
