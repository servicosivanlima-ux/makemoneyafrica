-- ============================================
-- FIX: Campanha "Failed to fetch" para Admin
-- Execute no SQL Editor do Supabase
-- ============================================

-- Garantir que a tabela campaigns existe
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending_payment' NOT NULL,
  page_link TEXT NOT NULL DEFAULT '',
  video_link TEXT,
  video_id TEXT,
  video_title TEXT,
  video_duration INTEGER,
  profile_link TEXT,
  payment_confirmed_at TIMESTAMPTZ,
  payment_proof_url TEXT,
  description TEXT,
  reward_amount_override NUMERIC,
  campaign_goal TEXT DEFAULT 'followers',
  reward NUMERIC DEFAULT 0,
  total_budget NUMERIC DEFAULT 0,
  remaining_budget NUMERIC DEFAULT 0,
  duration INTEGER DEFAULT 60,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Garantir RLS activado
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Política: Admin vê e gere TUDO
DROP POLICY IF EXISTS "Admins can manage all campaigns" ON public.campaigns;
CREATE POLICY "Admins can manage all campaigns" ON public.campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Políticas para clientes
DROP POLICY IF EXISTS "Clients can view own campaigns" ON public.campaigns;
CREATE POLICY "Clients can view own campaigns" ON public.campaigns
  FOR SELECT USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can create campaigns" ON public.campaigns;
CREATE POLICY "Clients can create campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Políticas para workers
DROP POLICY IF EXISTS "Workers can view active campaigns" ON public.campaigns;
CREATE POLICY "Workers can view active campaigns" ON public.campaigns
  FOR SELECT USING (
    status = 'active' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'worker'
    )
  );

-- Garantir que seu utilizador tem a role de admin
DO $$
DECLARE v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'makemoney.african@gmail.com';
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RAISE NOTICE 'Admin role garantida para makemoney.african@gmail.com';
  ELSE
    RAISE WARNING 'Utilizador makemoney.african@gmail.com não encontrado em auth.users';
  END IF;
END $$;

-- Recarregar schema
NOTIFY pgrst, 'reload schema';

-- ============================================
-- FEITO! Agora o admin pode ver todas as campanhas.
-- ============================================
