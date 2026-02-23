-- SUPREME_REFERRAL_FIX_V2.sql
-- Este script REPARA a base de dados do projeto 'xofpoelcmcfpzmkopecu'.
-- Executar no SQL Editor do Supabase.

-- 1. Reparar a tabela 'profiles' (Adicionar colunas e ajustar restrições)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS nif TEXT,
  ADD COLUMN IF NOT EXISTS account_type TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Angola',
  ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_access TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS withdrawal_method TEXT,
  ADD COLUMN IF NOT EXISTS withdrawal_details TEXT,
  ADD COLUMN IF NOT EXISTS facebook_link TEXT,
  ADD COLUMN IF NOT EXISTS instagram_link TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_link TEXT,
  ADD COLUMN IF NOT EXISTS youtube_link TEXT,
  ADD COLUMN IF NOT EXISTS device_hash TEXT;

-- Ajustar a restrição de user_type para permitir 'admin'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check CHECK (user_type IN ('client', 'worker', 'admin'));

-- 2. Restaurar tabelas essenciais
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  payment_proof_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deposit_id UUID REFERENCES public.deposits(id) ON DELETE CASCADE NOT NULL,
  deposit_amount INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL,
  commission_percentage INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Garantir que as configurações iniciais existem
INSERT INTO public.system_settings (key, value)
VALUES ('referral', '{"active": true, "percentage": 10}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Função Corrigida: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_count INTEGER;
  v_user_type TEXT;
  v_role app_role;
  v_referrer_id UUID;
  v_referrer_email TEXT;
BEGIN
  -- Verificar se é o primeiro usuário (admin)
  SELECT COUNT(*) INTO v_user_count FROM public.profiles;

  v_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'client');
  
  -- Se for o primeiro usuário, força admin
  IF v_user_count = 0 THEN
    v_user_type := 'admin';
    v_role := 'admin'::app_role;
  ELSE
    v_role := v_user_type::app_role;
  END IF;

  -- Lógica de Referência
  v_referrer_email := NEW.raw_user_meta_data->>'referrer_email';
  IF v_user_type = 'client' AND v_referrer_email IS NOT NULL AND v_referrer_email != '' THEN
    SELECT user_id INTO v_referrer_id
    FROM public.profiles
    WHERE lower(trim(email)) = lower(trim(v_referrer_email))
      AND user_type = 'worker'
      AND user_id != NEW.id;
  END IF;

  -- Inserção segura no perfil
  INSERT INTO public.profiles (
    user_id, full_name, email, phone, user_type, country, nif,
    account_type, company_name, referred_by,
    withdrawal_method, withdrawal_details, 
    facebook_link, instagram_link, tiktok_link, youtube_link, device_hash
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Utilizador'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    v_user_type,
    COALESCE(NEW.raw_user_meta_data->>'country', 'Angola'),
    NEW.raw_user_meta_data->>'nif',
    NEW.raw_user_meta_data->>'account_type',
    NEW.raw_user_meta_data->>'company_name',
    v_referrer_id,
    NEW.raw_user_meta_data->>'withdrawal_method',
    NEW.raw_user_meta_data->>'withdrawal_details',
    NEW.raw_user_meta_data->>'facebook_link',
    NEW.raw_user_meta_data->>'instagram_link',
    NEW.raw_user_meta_data->>'tiktok_link',
    NEW.raw_user_meta_data->>'youtube_link',
    NEW.raw_user_meta_data->>'device_hash'
  ) ON CONFLICT (user_id) DO NOTHING;

  -- Atribuir Role
  INSERT INTO public.user_roles (user_id, role) 
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 4. Função Corrigida: admin_approve_deposit
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(p_deposit_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_amount INTEGER;
  v_referrer_id UUID;
  v_ref_settings JSONB;
BEGIN
  -- Aprovar depósito e obter dados
  UPDATE public.deposits
  SET status = 'approved', updated_at = now()
  WHERE id = p_deposit_id AND status = 'pending'
  RETURNING client_id, amount INTO v_client_id, v_amount;

  IF NOT FOUND THEN RETURN false; END IF;

  -- Creditar Cliente
  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_amount
  WHERE user_id = v_client_id;

  -- Pagar Comissão
  SELECT referred_by INTO v_referrer_id FROM public.profiles WHERE user_id = v_client_id;
  
  IF v_referrer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.referral_commissions WHERE client_id = v_client_id) THEN
    SELECT value INTO v_ref_settings FROM public.system_settings WHERE key = 'referral';
    
    IF (v_ref_settings->>'active')::boolean THEN
      DECLARE
        v_perc INTEGER := (v_ref_settings->>'percentage')::integer;
        v_commission INTEGER := FLOOR(v_amount * v_perc / 100);
      BEGIN
        IF v_commission > 0 THEN
          UPDATE public.profiles SET wallet_balance = COALESCE(wallet_balance, 0) + v_commission WHERE user_id = v_referrer_id;
          
          INSERT INTO public.referral_commissions (worker_id, client_id, deposit_id, deposit_amount, commission_amount, commission_percentage)
          VALUES (v_referrer_id, v_client_id, p_deposit_id, v_amount, v_commission, v_perc);
          
          INSERT INTO public.notifications (user_id, title, message)
          VALUES (v_referrer_id, 'Comissão Recebida!', 'Ganhou ' || v_commission || ' Kz por indicação!');
        END IF;
      END;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- 5. Função: admin_reject_deposit
CREATE OR REPLACE FUNCTION public.admin_reject_deposit(p_deposit_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.deposits
  SET status = 'rejected', updated_at = now()
  WHERE id = p_deposit_id AND status = 'pending';
  
  RETURN FOUND;
END;
$$;

-- 6. RPC: get_worker_referral_stats
CREATE OR REPLACE FUNCTION public.get_worker_referral_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_commissions INTEGER;
  v_total_referrals INTEGER;
BEGIN
  SELECT COALESCE(SUM(commission_amount), 0), COUNT(*)
  INTO v_total_commissions, v_total_referrals
  FROM public.referral_commissions
  WHERE worker_id = auth.uid() AND status = 'paid';

  RETURN jsonb_build_object(
    'total_commissions', v_total_commissions,
    'total_referrals', v_total_referrals
  );
END;
$$;

-- 7. Permissões finais
GRANT EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_deposit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_worker_referral_stats() TO authenticated;
GRANT ALL ON public.deposits TO authenticated;
GRANT ALL ON public.referral_commissions TO authenticated;
GRANT ALL ON public.system_settings TO authenticated;

NOTIFY pgrst, 'reload schema';
