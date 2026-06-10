-- ============================================
-- MAKE MONEY AFRICA - COMPLETE DATABASE SETUP
-- ============================================

-- 1. BASE SCHEMA
-- (Includes profiles, campaigns, tasks, withdrawals, etc.)

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

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('client', 'worker')),
  account_type TEXT CHECK (account_type IN ('personal', 'company')),
  company_name TEXT,
  withdrawal_method TEXT CHECK (withdrawal_method IN ('iban', 'multicaixa')),
  withdrawal_details TEXT,
  facebook_link TEXT,
  instagram_link TEXT,
  tiktok_link TEXT,
  youtube_link TEXT,
  device_hash TEXT,
  is_blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  wallet_balance INTEGER DEFAULT 0,
  referred_by UUID REFERENCES auth.users(id),
  nif TEXT,
  country TEXT DEFAULT 'Angola',
  access_count INTEGER DEFAULT 0,
  last_access TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
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

CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  deposit_id UUID NOT NULL,
  deposit_amount INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL,
  commission_percentage INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _user_type text; _role app_role; _referrer_id uuid; _referrer_email text;
BEGIN
  _user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'client');
  _role := CASE WHEN _user_type = 'worker' THEN 'worker'::app_role ELSE 'client'::app_role END;
  _referrer_email := NEW.raw_user_meta_data->>'referrer_email';
  IF _user_type = 'client' AND _referrer_email IS NOT NULL AND _referrer_email != '' THEN
    SELECT user_id INTO _referrer_id FROM profiles WHERE lower(trim(email)) = lower(trim(_referrer_email)) AND user_type = 'worker' AND user_id != NEW.id;
  END IF;
  INSERT INTO public.profiles (user_id, full_name, email, phone, user_type, account_type, company_name, withdrawal_method, withdrawal_details, facebook_link, instagram_link, tiktok_link, youtube_link, referred_by)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'), NEW.email, COALESCE(NEW.raw_user_meta_data->>'phone', ''), _user_type,
    NEW.raw_user_meta_data->>'account_type', NEW.raw_user_meta_data->>'page_name', NEW.raw_user_meta_data->>'withdraw_method',
    CASE WHEN NEW.raw_user_meta_data->>'withdraw_method' = 'iban' 
      THEN CONCAT(NEW.raw_user_meta_data->'social_links'->>'iban_bank', ' - ', NEW.raw_user_meta_data->'social_links'->>'iban_number')
      ELSE NEW.raw_user_meta_data->'social_links'->>'multicaixa_number' END,
    NEW.raw_user_meta_data->'social_links'->>'facebook', NEW.raw_user_meta_data->'social_links'->>'instagram',
    NEW.raw_user_meta_data->'social_links'->>'tiktok', NEW.raw_user_meta_data->'social_links'->>'youtube', _referrer_id);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- SETTINGS
INSERT INTO public.system_settings (key, value)
VALUES ('referral', '{"active": true, "percentage": 10}'::jsonb)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
