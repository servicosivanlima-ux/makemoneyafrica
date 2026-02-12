-- =============================================================================
-- MASTER SETUP: Configuração de Papéis, Deletar Usuários e Setup de Admin
-- Projeto: xofpoelcmcfpzmkopecu
-- =============================================================================

-- 1. LIMPEZA INICIAL
-- Remove todos os usuários para começar do zero
TRUNCATE auth.users CASCADE;

-- 2. AJUSTES NO SCHEMA PUBLIC (PROFILES)
-- Permitir o papel 'admin' na restrição de tipo de usuário
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check CHECK (user_type IN ('client', 'worker', 'admin'));

-- 3. FUNÇÃO DE DELETAR USUÁRIO (V3 - SEGURA)
-- Permite que admins excluam outros usuários via RPC
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
  
  -- Converter texto para UUID
  BEGIN
    v_target_uuid := target_id_text::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'ID inválido');
  END;

  -- Verificar se quem chama é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = v_caller_id AND role = 'admin'
  ) THEN
    RETURN json_build_object('success', false, 'message', 'Acesso negado: Apenas administradores.');
  END IF;

  -- Impedir auto-deleção
  IF v_caller_id = v_target_uuid THEN
    RETURN json_build_object('success', false, 'message', 'Erro: Você não pode deletar sua própria conta.');
  END IF;

  -- Deletar (CASCADE cuidará de profiles, campaigns, etc)
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

-- 4. TRIGGER DE CADASTRO (Lógica de Papel e Primeiro Admin)
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
BEGIN
  -- Conta quantos perfis existem
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  -- Metadata do cadastro
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
    withdrawal_method, 
    withdrawal_details,
    facebook_link, 
    instagram_link, 
    tiktok_link, 
    youtube_link, 
    device_hash,
    country,
    nif
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
    NEW.raw_user_meta_data->>'device_hash',
    v_country,
    v_nif
  );

  -- Atribui a Role
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_user_type::app_role);
  END IF;

  RETURN NEW;
END;
$$;

-- Recria o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- FINALIZAÇÃO
NOTIFY pgrst, 'reload schema';
