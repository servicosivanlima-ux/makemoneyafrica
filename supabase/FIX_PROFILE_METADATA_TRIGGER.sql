-- PATCH: Corrigir Trigger de Perfil para Salvar País e NIF
-- Este script garante que o país e o NIF enviados no cadastro sejam guardados no perfil.

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

  -- Insere o perfil com todos os campos necessários
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

  -- Atribui o papel (role)
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_user_type::app_role);
  END IF;

  RETURN NEW;
END;
$$;

-- Notificar PostgREST
NOTIFY pgrst, 'reload schema';
