-- ============================================
-- WALLET SYSTEM AND AUTO-DELETION MIGRATION
-- ============================================

-- 1. Add scheduled_deletion_at to campaigns and tasks
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;

-- 2. Add wallet_balance to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 0;

-- 3. Create deposits table
DO $$ BEGIN
  CREATE TYPE public.deposit_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 1000),
  status deposit_status DEFAULT 'pending' NOT NULL,
  payment_proof_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- 4. RLS for deposits
DROP POLICY IF EXISTS "Clients can view own deposits" ON public.deposits;
CREATE POLICY "Clients can view own deposits" ON public.deposits FOR SELECT USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can create deposits" ON public.deposits FOR INSERT WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Admins can manage all deposits" ON public.deposits;
CREATE POLICY "Admins can manage all deposits" ON public.deposits FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. Update admin_reject_campaign to set deletion timer
CREATE OR REPLACE FUNCTION public.admin_reject_campaign(p_campaign_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE campaigns 
  SET status = 'cancelled', 
      scheduled_deletion_at = now() + interval '2 minutes',
      updated_at = now() 
  WHERE id = p_campaign_id AND status = 'pending_payment';
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;
  RETURN true;
END; $$;

-- 6. Update admin_reject_task to set deletion timer
CREATE OR REPLACE FUNCTION public.admin_reject_task(p_task_id uuid, p_reason text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE tasks 
  SET status = 'rejected', 
      rejection_reason = p_reason, 
      scheduled_deletion_at = now() + interval '2 minutes',
      reviewed_at = now(), 
      reviewed_by = auth.uid() 
  WHERE id = p_task_id AND status = 'pending_review';
  IF NOT FOUND THEN RAISE EXCEPTION 'Task not found'; END IF;
  RETURN true;
END; $$;

-- 7. Wallet RPCs
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(p_deposit_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_client_id uuid; v_amount integer;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  
  UPDATE deposits 
  SET status = 'approved', updated_at = now() 
  WHERE id = p_deposit_id AND status = 'pending'
  RETURNING client_id, amount INTO v_client_id, v_amount;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit not found or already processed'; END IF;
  
  UPDATE profiles 
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_amount 
  WHERE user_id = v_client_id;
  
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_reject_deposit(p_deposit_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  UPDATE deposits SET status = 'rejected', updated_at = now() WHERE id = p_deposit_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  RETURN true;
END; $$;

-- 8. Secure Campaign Creation with Balance
CREATE OR REPLACE FUNCTION public.create_campaign_with_balance(
  p_plan_type text, p_plan_name text, p_platform text, p_page_link text,
  p_profile_link text DEFAULT NULL, p_video_link text DEFAULT NULL,
  p_video_id text DEFAULT NULL, p_duration integer DEFAULT NULL,
  p_reward integer DEFAULT NULL, p_total_budget integer DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_campaign_id uuid; v_price integer; v_target_count integer; v_user_type text; v_balance integer;
BEGIN
  -- Validate user type
  SELECT user_type, wallet_balance INTO v_user_type, v_balance FROM profiles WHERE user_id = auth.uid();
  IF v_user_type != 'client' THEN RAISE EXCEPTION 'Only clients can create campaigns'; END IF;

  -- Get Pricing / Logic for V2
  IF p_total_budget IS NOT NULL AND p_reward IS NOT NULL AND p_reward > 0 THEN
    v_price := p_total_budget;
    v_target_count := floor(p_total_budget / p_reward);
  ELSE
    -- Original logic for fixed plans
    IF p_plan_type = 'ta_no_limao' THEN
      CASE p_plan_name
        WHEN 'Básico' THEN v_price := 6000; v_target_count := 30;
        WHEN 'Super Básico' THEN v_price := 8000; v_target_count := 50;
        WHEN 'Tá Fixe' THEN v_price := 15000; v_target_count := 100;
        WHEN 'Bronze' THEN v_price := 27000; v_target_count := 200;
        WHEN 'Prata' THEN v_price := 75000; v_target_count := 500;
        WHEN 'Ouro' THEN v_price := 125000; v_target_count := 1000;
        WHEN 'Premium' THEN v_price := 400000; v_target_count := 3500;
        ELSE RAISE EXCEPTION 'Invalid plan name';
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
        ELSE RAISE EXCEPTION 'Invalid plan name';
      END CASE;
    END IF;
  END IF;

  -- Check Balance
  IF v_balance < v_price THEN
    RAISE EXCEPTION 'Saldo insuficiente. Recarregue sua carteira.';
  END IF;

  -- Deduct Balance
  UPDATE profiles SET wallet_balance = wallet_balance - v_price WHERE user_id = auth.uid();

  -- Create Campaign
  INSERT INTO campaigns (
    client_id, plan_type, plan_name, platform, page_link, profile_link, 
    video_link, video_id, duration, reward, total_budget, remaining_budget,
    target_count, price, status, payment_confirmed_at
  )
  VALUES (
    auth.uid(), p_plan_type::plan_type, p_plan_name, p_platform::platform_type, p_page_link, p_profile_link, 
    p_video_link, p_video_id, p_duration, p_reward, v_price, v_price,
    v_target_count, v_price, 'active'::campaign_status, now()
  )
  RETURNING id INTO v_campaign_id;

  RETURN v_campaign_id;
END; $$;

-- 9. Cleanup function for scheduled deletions
CREATE OR REPLACE FUNCTION public.cleanup_scheduled_deletions() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.campaigns WHERE scheduled_deletion_at < now();
  DELETE FROM public.tasks WHERE scheduled_deletion_at < now();
END; $$;

-- 10. Direct deletion RPC for UI sync
CREATE OR REPLACE FUNCTION public.delete_item_immediately(p_item_id uuid, p_type text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_type = 'campaign' THEN
    DELETE FROM campaigns WHERE id = p_item_id AND (client_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  ELSIF p_type = 'task' THEN
    DELETE FROM tasks WHERE id = p_item_id AND (worker_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
  RETURN true;
END; $$;

NOTIFY pgrst, 'reload schema';
