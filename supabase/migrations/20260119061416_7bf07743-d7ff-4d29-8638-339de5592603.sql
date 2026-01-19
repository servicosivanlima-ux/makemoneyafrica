
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
  -- Client specific fields
  account_type TEXT CHECK (account_type IN ('personal', 'company')),
  company_name TEXT,
  -- Worker specific fields
  withdrawal_method TEXT CHECK (withdrawal_method IN ('iban', 'multicaixa')),
  withdrawal_details TEXT,
  facebook_link TEXT,
  instagram_link TEXT,
  tiktok_link TEXT,
  youtube_link TEXT,
  -- Anti-fraud
  device_hash TEXT,
  is_blocked BOOLEAN DEFAULT false,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create user_roles table (separate from profiles for security)
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
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status task_status DEFAULT 'available' NOT NULL,
  -- Proof screenshots
  follow_proof_url TEXT,
  like_proof_url TEXT,
  comment_proof_url TEXT,
  share_proof_url TEXT,
  -- Reward
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

-- Create blocked_devices table for anti-fraud
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
