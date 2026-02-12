-- ============================================
-- REFERRAL SYSTEM MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add referred_by column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);

-- 2. Create system_settings table for referral config
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage system_settings" ON public.system_settings;
CREATE POLICY "Admins can manage system_settings" ON public.system_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can read system_settings" ON public.system_settings;
CREATE POLICY "Authenticated can read system_settings" ON public.system_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Insert default referral settings
INSERT INTO public.system_settings (key, value)
VALUES ('referral', '{"active": true, "percentage": 10}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 3. Create referral_commissions table
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
  deposit_id UUID NOT NULL,
  deposit_amount INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL,
  commission_percentage INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

GRANT ALL ON public.referral_commissions TO authenticated;
GRANT ALL ON public.system_settings TO authenticated;

ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workers can view own commissions" ON public.referral_commissions;
CREATE POLICY "Workers can view own commissions" ON public.referral_commissions
  FOR SELECT USING (auth.uid() = worker_id);

DROP POLICY IF EXISTS "Admins can manage all commissions" ON public.referral_commissions;
CREATE POLICY "Admins can manage all commissions" ON public.referral_commissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 4. RPC: Validate if a referrer email exists and belongs to a worker
CREATE OR REPLACE FUNCTION public.validate_referrer(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_type TEXT;
BEGIN
  SELECT user_id, user_type INTO v_user_id, v_user_type
  FROM profiles
  WHERE email = lower(trim(p_email))
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error_code', 'NOT_FOUND');
  END IF;

  IF v_user_type != 'worker' THEN
    RETURN jsonb_build_object('valid', false, 'error_code', 'NOT_WORKER');
  END IF;

  RETURN jsonb_build_object('valid', true, 'error_code', 'OK', 'user_id', v_user_id);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_referrer(TEXT) TO anon, authenticated;
$$;

GRANT EXECUTE ON FUNCTION public.check_referrer_email(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.check_referrer_email(TEXT) TO authenticated;

-- 5. Updated admin_approve_deposit with referral commission logic
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
  v_is_first_deposit BOOLEAN;
  v_referral_active BOOLEAN;
  v_referral_percentage INTEGER;
  v_commission INTEGER;
BEGIN
  -- Check admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Approve the deposit
  UPDATE deposits
  SET status = 'approved', updated_at = now()
  WHERE id = p_deposit_id AND status = 'pending'
  RETURNING client_id, amount INTO v_client_id, v_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deposit not found or already processed';
  END IF;

  -- Credit client wallet (full amount)
  UPDATE profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_amount
  WHERE user_id = v_client_id;

  -- === REFERRAL COMMISSION LOGIC ===

  -- Check if referral system is active
  SELECT
    (value->>'active')::boolean,
    (value->>'percentage')::integer
  INTO v_referral_active, v_referral_percentage
  FROM system_settings
  WHERE key = 'referral';

  -- Default to inactive if no settings found
  IF v_referral_active IS NULL THEN
    v_referral_active := false;
  END IF;
  IF v_referral_percentage IS NULL THEN
    v_referral_percentage := 10;
  END IF;

  IF v_referral_active THEN
    -- Get the referrer (worker who referred this client)
    SELECT referred_by INTO v_referrer_id
    FROM profiles
    WHERE user_id = v_client_id;

    IF v_referrer_id IS NOT NULL THEN
      -- Check if this is the first approved deposit for this client
      -- (no previous commission should exist for this client)
      SELECT NOT EXISTS (
        SELECT 1 FROM referral_commissions WHERE client_id = v_client_id
      ) INTO v_is_first_deposit;

      IF v_is_first_deposit THEN
        -- Calculate commission
        v_commission := FLOOR(v_amount * v_referral_percentage / 100);

        IF v_commission > 0 THEN
          -- Credit the worker's wallet
          UPDATE profiles
          SET wallet_balance = COALESCE(wallet_balance, 0) + v_commission
          WHERE user_id = v_referrer_id;

          -- Record the commission
          INSERT INTO referral_commissions (
            worker_id, client_id, deposit_id,
            deposit_amount, commission_amount, commission_percentage,
            status
          ) VALUES (
            v_referrer_id, v_client_id, p_deposit_id,
            v_amount, v_commission, v_referral_percentage,
            'paid'
          );

          -- Notify the worker
          INSERT INTO notifications (user_id, title, message)
          VALUES (
            v_referrer_id,
            'Comissão de Indicação Recebida!',
            'Recebeu ' || v_commission || ' Kz de comissão pela indicação de um novo cliente. Obrigado por divulgar a plataforma!'
          );
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- 6. Update handle_new_user to save referred_by
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_type text;
  _role app_role;
  _referrer_id uuid;
  _referrer_email text;
BEGIN
  _user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'client');

  _role := CASE
    WHEN _user_type = 'worker' THEN 'worker'::app_role
    ELSE 'client'::app_role
  END;

  -- Check for referral email (only for clients)
  _referrer_email := NEW.raw_user_meta_data->>'referrer_email';
  IF _user_type = 'client' AND _referrer_email IS NOT NULL AND _referrer_email != '' THEN
    -- Find the worker by email (prevent self-referral)
    SELECT user_id INTO _referrer_id
    FROM profiles
    WHERE email = lower(trim(_referrer_email))
      AND user_type = 'worker'
      AND user_id != NEW.id;
  END IF;

  INSERT INTO public.profiles (
    user_id, full_name, email, phone, user_type, account_type, company_name,
    withdrawal_method, withdrawal_details, facebook_link, instagram_link, tiktok_link, youtube_link,
    referred_by
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Utilizador'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    _user_type,
    NEW.raw_user_meta_data->>'account_type',
    NEW.raw_user_meta_data->>'page_name',
    NEW.raw_user_meta_data->>'withdraw_method',
    CASE
      WHEN NEW.raw_user_meta_data->>'withdraw_method' = 'iban'
      THEN CONCAT(NEW.raw_user_meta_data->'social_links'->>'iban_bank', ' - ', NEW.raw_user_meta_data->'social_links'->>'iban_number')
      ELSE NEW.raw_user_meta_data->'social_links'->>'multicaixa_number'
    END,
    NEW.raw_user_meta_data->'social_links'->>'facebook',
    NEW.raw_user_meta_data->'social_links'->>'instagram',
    NEW.raw_user_meta_data->'social_links'->>'tiktok',
    NEW.raw_user_meta_data->'social_links'->>'youtube',
    _referrer_id
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Re-create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 7. Admin RPC: Get referral stats
CREATE OR REPLACE FUNCTION public.get_referral_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_commissions INTEGER;
  v_total_referrals INTEGER;
  v_result JSONB;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT
    COALESCE(SUM(commission_amount), 0),
    COUNT(*)
  INTO v_total_commissions, v_total_referrals
  FROM referral_commissions
  WHERE status = 'paid';

  v_result := jsonb_build_object(
    'total_commissions_paid', v_total_commissions,
    'total_referrals', v_total_referrals
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_referral_stats() TO authenticated;

-- 8. Admin RPC: Toggle referral system
CREATE OR REPLACE FUNCTION public.update_referral_settings(p_active BOOLEAN, p_percentage INTEGER)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO system_settings (key, value, updated_at)
  VALUES ('referral', jsonb_build_object('active', p_active, 'percentage', p_percentage), now())
  ON CONFLICT (key)
  DO UPDATE SET value = jsonb_build_object('active', p_active, 'percentage', p_percentage), updated_at = now();

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_referral_settings(BOOLEAN, INTEGER) TO authenticated;

-- 9. Permissions
GRANT EXECUTE ON FUNCTION public.admin_approve_deposit(uuid) TO authenticated;

-- 10. Reload Schema
NOTIFY pgrst, 'reload schema';
