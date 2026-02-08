-- ============================================
-- TODAS AS MIGRAÇÕES COMBINADAS
-- Execute este ficheiro COMPLETO no Supabase SQL Editor
-- ============================================

-- ====== MIGRAÇÃO 1: Tabelas Base ======

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'client', 'worker');

-- Create enum for campaign status
CREATE TYPE public.campaign_status AS ENUM ('pending_payment', 'active', 'completed', 'cancelled');

-- Create enum for task status
CREATE TYPE public.task_status AS ENUM ('available', 'in_progress', 'pending_review', 'approved', 'rejected');

-- Create enum for withdrawal status
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for platform
CREATE TYPE public.platform_type AS ENUM ('facebook', 'instagram', 'tiktok', 'youtube');

-- Create enum for plan type
CREATE TYPE public.plan_type AS ENUM ('ta_no_limao', 'kwanza');

-- Create profiles table
CREATE TABLE public.profiles (
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
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Create campaigns table
CREATE TABLE public.campaigns (
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

-- Create tasks table
CREATE TABLE public.tasks (
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

-- Create withdrawals table
CREATE TABLE public.withdrawals (
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

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create blocked_devices table
CREATE TABLE public.blocked_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_hash TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  blocked_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_devices ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's profile
CREATE OR REPLACE FUNCTION public.get_user_profile(_user_id UUID)
RETURNS public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for campaigns
CREATE POLICY "Clients can view own campaigns" ON public.campaigns
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Clients can create campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Workers can view active campaigns" ON public.campaigns
  FOR SELECT USING (status = 'active' AND public.has_role(auth.uid(), 'worker'));

CREATE POLICY "Admins can manage all campaigns" ON public.campaigns
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for tasks
CREATE POLICY "Workers can view available and own tasks" ON public.tasks
  FOR SELECT USING (
    status = 'available' OR worker_id = auth.uid()
  );

CREATE POLICY "Workers can claim tasks" ON public.tasks
  FOR UPDATE USING (
    (status = 'available' AND worker_id IS NULL) OR worker_id = auth.uid()
  );

CREATE POLICY "Admins can manage all tasks" ON public.tasks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for withdrawals
CREATE POLICY "Workers can view own withdrawals" ON public.withdrawals
  FOR SELECT USING (auth.uid() = worker_id);

CREATE POLICY "Workers can create withdrawals" ON public.withdrawals
  FOR INSERT WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Admins can manage all withdrawals" ON public.withdrawals
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for blocked_devices
CREATE POLICY "Admins can manage blocked devices" ON public.blocked_devices
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====== MIGRAÇÃO 2: View para Workers ======

CREATE VIEW public.available_campaigns_for_workers
WITH (security_invoker = on) AS
SELECT 
  id,
  plan_type,
  plan_name,
  platform,
  page_link,
  profile_link,
  video_link,
  target_count,
  completed_count,
  status,
  created_at
FROM public.campaigns
WHERE status = 'active';

REVOKE ALL ON public.available_campaigns_for_workers FROM anon;
GRANT SELECT ON public.available_campaigns_for_workers TO authenticated;

COMMENT ON VIEW public.available_campaigns_for_workers IS 'Secure view for workers to see active campaigns';

-- ====== MIGRAÇÃO 3: Funções de Utilizador e Admin ======

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_type text;
  _role app_role;
BEGIN
  _user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'client');
  
  _role := CASE 
    WHEN _user_type = 'worker' THEN 'worker'::app_role
    ELSE 'client'::app_role
  END;
  
  INSERT INTO public.profiles (
    user_id, full_name, email, phone, user_type, account_type, company_name,
    withdrawal_method, withdrawal_details, facebook_link, instagram_link, tiktok_link, youtube_link
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'),
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
    NEW.raw_user_meta_data->'social_links'->>'youtube'
  );
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Admin functions
CREATE OR REPLACE FUNCTION public.admin_approve_campaign(p_campaign_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  UPDATE campaigns
  SET status = 'active', payment_confirmed_at = now(), updated_at = now()
  WHERE id = p_campaign_id AND status = 'pending_payment';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found or already processed';
  END IF;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_campaign(p_campaign_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  UPDATE campaigns
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_campaign_id AND status = 'pending_payment';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found or already processed';
  END IF;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_task(p_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  UPDATE tasks
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_task_id AND status = 'pending_review'
  RETURNING campaign_id INTO v_campaign_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or already processed';
  END IF;
  
  UPDATE campaigns
  SET completed_count = COALESCE(completed_count, 0) + 1, updated_at = now()
  WHERE id = v_campaign_id;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_task(p_task_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  UPDATE tasks
  SET status = 'rejected', rejection_reason = p_reason, reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_task_id AND status = 'pending_review';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or already processed';
  END IF;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(p_withdrawal_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  UPDATE withdrawals
  SET status = 'approved', reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_withdrawal_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found or already processed';
  END IF;
  
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(p_withdrawal_id uuid, p_reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin role required';
  END IF;
  
  UPDATE withdrawals
  SET status = 'rejected', rejection_reason = p_reason, reviewed_at = now(), reviewed_by = auth.uid()
  WHERE id = p_withdrawal_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found or already processed';
  END IF;
  
  RETURN true;
END;
$$;

-- ====== MIGRAÇÃO 4: Worker Claim Task ======

CREATE OR REPLACE FUNCTION public.worker_claim_task(p_campaign_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task_id uuid;
  v_worker_id uuid;
  v_campaign campaigns%ROWTYPE;
  v_reward_amount integer;
  v_existing_task_count integer;
BEGIN
  v_worker_id := auth.uid();
  
  IF v_worker_id IS NULL THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  
  IF NOT has_role(v_worker_id, 'worker'::app_role) THEN
    RAISE EXCEPTION 'Apenas trabalhadores podem reclamar tarefas';
  END IF;
  
  SELECT COUNT(*) INTO v_existing_task_count
  FROM tasks
  WHERE campaign_id = p_campaign_id AND worker_id = v_worker_id;
  
  IF v_existing_task_count > 0 THEN
    RAISE EXCEPTION 'Você já tem uma tarefa para esta campanha';
  END IF;
  
  SELECT * INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id AND status = 'active';
  
  IF v_campaign.id IS NULL THEN
    RAISE EXCEPTION 'Campanha não encontrada ou não está ativa';
  END IF;
  
  IF v_campaign.completed_count >= v_campaign.target_count THEN
    RAISE EXCEPTION 'Esta campanha já atingiu o limite de tarefas';
  END IF;
  
  v_reward_amount := CASE WHEN v_campaign.plan_type = 'ta_no_limao' THEN 200 ELSE 600 END;
  
  UPDATE tasks
  SET worker_id = v_worker_id,
      status = 'in_progress',
      assigned_at = now()
  WHERE campaign_id = p_campaign_id
    AND status = 'available'
    AND worker_id IS NULL
  RETURNING id INTO v_task_id;
  
  IF v_task_id IS NULL THEN
    INSERT INTO tasks (
      campaign_id, worker_id, status, reward_amount, assigned_at
    ) VALUES (
      p_campaign_id, v_worker_id, 'in_progress', v_reward_amount, now()
    ) RETURNING id INTO v_task_id;
  END IF;
  
  RETURN v_task_id;
END;
$$;

-- ====== MIGRAÇÃO 5: Storage Bucket ======

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-proofs', 
  'task-proofs', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/jpg']
);

CREATE POLICY "Workers can upload their proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view task proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-proofs');

CREATE POLICY "Workers can update their proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'task-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Workers can delete their proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ====== MIGRAÇÃO 6: Create Campaign Secure (COM payment_proof_url) ======

CREATE OR REPLACE FUNCTION public.create_campaign_secure(
  p_plan_type text,
  p_plan_name text,
  p_platform text,
  p_page_link text,
  p_payment_proof_url text,
  p_profile_link text DEFAULT NULL,
  p_video_link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_id uuid;
  v_price integer;
  v_target_count integer;
  v_user_type text;
BEGIN
  SELECT user_type INTO v_user_type 
  FROM profiles 
  WHERE user_id = auth.uid();
  
  IF v_user_type != 'client' THEN
    RAISE EXCEPTION 'Only clients can create campaigns';
  END IF;
  
  IF p_plan_type = 'ta_no_limao' THEN
    CASE p_plan_name
      WHEN 'Básico' THEN v_price := 6000; v_target_count := 30;
      WHEN 'Super Básico' THEN v_price := 8000; v_target_count := 50;
      WHEN 'Tá Fixe' THEN v_price := 15000; v_target_count := 100;
      WHEN 'Bronze' THEN v_price := 27000; v_target_count := 200;
      WHEN 'Prata' THEN v_price := 75000; v_target_count := 500;
      WHEN 'Ouro' THEN v_price := 125000; v_target_count := 1000;
      WHEN 'Premium' THEN v_price := 400000; v_target_count := 3500;
      ELSE RAISE EXCEPTION 'Invalid plan name for Tá no Limão';
    END CASE;
  ELSE
    CASE p_plan_name
      WHEN 'Básico' THEN v_price := 30000; v_target_count := 50;
      WHEN 'Super Básico' THEN v_price := 50000; v_target_count := 100;
      WHEN 'Tá Fixe' THEN v_price := 70000; v_target_count := 150;
      WHEN 'Bronze' THEN v_price := 100000; v_target_count := 200;
      WHEN 'Prata' THEN v_price := 250000; v_target_count := 500;
      WHEN 'Ouro' THEN v_price := 400000; v_target_count := 1000;
      WHEN 'Premium' THEN v_price := 850000; v_target_count := 2500;
      ELSE RAISE EXCEPTION 'Invalid plan name for Kwanza';
    END CASE;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM campaigns 
    WHERE client_id = auth.uid() 
    AND status = 'pending_payment'
  ) THEN
    RAISE EXCEPTION 'You already have a pending campaign';
  END IF;
  
  INSERT INTO campaigns (
    client_id, plan_type, plan_name, platform, page_link, payment_proof_url, 
    profile_link, video_link, target_count, price, status
  ) VALUES (
    auth.uid(), p_plan_type::plan_type, p_plan_name, p_platform::platform_type, 
    p_page_link, p_payment_proof_url, p_profile_link, p_video_link, 
    v_target_count, v_price, 'pending_payment'::campaign_status
  ) RETURNING id INTO v_campaign_id;
  
  RETURN v_campaign_id;
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION public.create_campaign_secure(text, text, text, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_campaign_secure(text, text, text, text, text, text, text) TO authenticated;

-- Force schema reload
NOTIFY pgrst, 'reload schema';

-- ============================================
-- FIM DAS MIGRAÇÕES
-- ============================================
