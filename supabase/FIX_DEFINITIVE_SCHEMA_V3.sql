-- ============================================
-- DEFINITIVE DATABASE REPAIR & REFERRAL SETUP
-- This script fixes the profiles table, adds missing tables, 
-- and implements the referral system logic.
-- ============================================

-- 1. Create ENUMs (if they don't exist)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'client', 'worker');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.campaign_status AS ENUM ('pending_payment', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM ('available', 'in_progress', 'pending_review', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.platform_type AS ENUM ('facebook', 'instagram', 'tiktok', 'youtube');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.plan_type AS ENUM ('ta_no_limao', 'kwanza');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.deposit_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Update profiles table with all missing columns
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'worker',
  ADD COLUMN IF NOT EXISTS account_type TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS withdrawal_method TEXT,
  ADD COLUMN IF NOT EXISTS withdrawal_details TEXT,
  ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS facebook_link TEXT,
  ADD COLUMN IF NOT EXISTS instagram_link TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_link TEXT,
  ADD COLUMN IF NOT EXISTS youtube_link TEXT,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
  ADD COLUMN IF NOT EXISTS device_hash TEXT,
  ADD COLUMN IF NOT EXISTS nif TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Angola',
  ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_access TIMESTAMPTZ;

-- 3. Create missing tables
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

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

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type plan_type NOT NULL,
  plan_name TEXT NOT NULL,
  platform platform_type NOT NULL,
  target_count INTEGER NOT NULL,
  completed_count INTEGER DEFAULT 0,
  price INTEGER NOT NULL,
  status campaign_status DEFAULT 'pending_payment' NOT NULL,
  page_link TEXT NOT NULL,
  video_link TEXT,
  profile_link TEXT,
  payment_confirmed_at TIMESTAMPTZ,
  payment_proof_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status task_status DEFAULT 'available' NOT NULL,
  follow_proof_url TEXT,
  like_proof_url TEXT,
  comment_proof_url TEXT,
  share_proof_url TEXT,
  reward_amount INTEGER NOT NULL,
  assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 500),
  status withdrawal_status DEFAULT 'pending' NOT NULL,
  withdrawal_method TEXT NOT NULL,
  withdrawal_details TEXT NOT NULL,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4. RPC: validate_referrer
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
  WHERE lower(trim(email)) = lower(trim(p_email))
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

-- 5. Updated handle_new_user with Referral Support
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
    SELECT user_id INTO _referrer_id
    FROM profiles
    WHERE lower(trim(email)) = lower(trim(_referrer_email))
      AND user_type = 'worker'
      AND user_id != NEW.id;
  END IF;

  INSERT INTO public.profiles (
    user_id, full_name, email, phone, user_type, account_type, company_name,
    withdrawal_method, withdrawal_details, facebook_link, instagram_link, tiktok_link, youtube_link,
    referred_by
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', 'Utilizador'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    _user_type,
    NEW.raw_user_meta_data->>'account_type',
    NEW.raw_user_meta_data->>'page_name',
    NEW.raw_user_meta_data->>'withdraw_method',
    CASE
      WHEN NEW.raw_user_meta_data->>'withdraw_method' = 'iban'
      THEN CONCAT(NEW.raw_user_meta_data->'social_links'->>'iban_bank', ' - ', NEW.raw_user_meta_data->'social_links'->>'iban_number')
      WHEN NEW.raw_user_meta_data->>'withdraw_method' IS NOT NULL
      THEN NEW.raw_user_meta_data->'social_links'->>'multicaixa_number'
      ELSE NULL
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

-- Ensure triggers are correct
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6. RPC: track_user_access
CREATE OR REPLACE FUNCTION public.track_user_access()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET 
    access_count = COALESCE(access_count, 0) + 1,
    last_access = now()
  WHERE user_id = auth.uid();
END;
$$;

-- 7. Permissions
GRANT EXECUTE ON FUNCTION public.validate_referrer(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_user_access() TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role;

-- 8. Default System Settings
INSERT INTO public.system_settings (key, value)
VALUES ('referral', '{"active": true, "percentage": 10}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 9. Reload Schema
NOTIFY pgrst, 'reload schema';
