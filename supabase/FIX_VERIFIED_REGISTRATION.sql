-- FIX: Criar perfil apenas após confirmação de e-mail
-- Este script altera o trigger para que o perfil só seja gerado quando o utilizador confirmar o e-mail.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
  v_user_type TEXT;
  v_country TEXT;
  v_nif TEXT;
  v_profile_exists BOOLEAN;
BEGIN
  -- Se o e-mail ainda não foi confirmado, não faz nada (espera pela confirmação via UPDATE)
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verifica se o perfil já foi criado (para evitar erros em múltiplos updates)
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) INTO v_profile_exists;
  
  IF v_profile_exists THEN
    RETURN NEW;
  END IF;

  -- Conta quantos perfis existem para definir o primeiro como admin
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  -- Metadata do cadastro (enviado via options no signUp do frontend)
  v_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'client');
  v_country := NEW.raw_user_meta_data->>'country';
  v_nif := NEW.raw_user_meta_data->>'nif';

  -- Insere o perfil
  INSERT INTO public.profiles (
    user_id, 
    full_name, 
    email, 
    phone, 
    user_type,
    account_type, 
    company_name,
    country,
    nif
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    CASE WHEN user_count = 0 THEN 'admin' ELSE v_user_type END,
    NEW.raw_user_meta_data->>'account_type',
    COALESCE(NEW.raw_user_meta_data->>'page_name', NEW.raw_user_meta_data->>'company_name'),
    v_country,
    v_nif
  );

  -- Atribui o papel (role)
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    -- Tenta converter v_user_type para app_role, fallback para 'client'
    BEGIN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_user_type::public.app_role);
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client'::public.app_role);
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Recriar o trigger para disparar tanto no INSERT (se confirmação estiver off) quanto no UPDATE (quando confirmar)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Limpeza: Deletar perfis que não possuem email_confirmed_at (Opcional, mas recomendado para limpar dados sujos)
-- DELETE FROM public.profiles WHERE user_id IN (SELECT id FROM auth.users WHERE email_confirmed_at IS NULL);

NOTIFY pgrst, 'reload schema';
