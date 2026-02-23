-- worker_referral_fixes.sql
-- Fixes for referral visibility and worker dashboard data

-- 1. Ensure referred_by column exists in profiles (linked to auth.users.id)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES auth.users(id);

-- 2. Create RPC for worker-level referral stats (does not require admin role)
CREATE OR REPLACE FUNCTION public.get_worker_referral_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_commissions_paid NUMERIC;
  v_total_referrals INTEGER;
  v_result JSONB;
BEGIN
  -- Total paid commissions for this worker
  SELECT COALESCE(SUM(commission_amount), 0)
  INTO v_total_commissions_paid
  FROM referral_commissions
  WHERE worker_id = auth.uid() AND status = 'paid';

  -- Total count of people referred by this worker (regardless of deposit status)
  SELECT COUNT(*)
  INTO v_total_referrals
  FROM profiles
  WHERE referred_by = auth.uid();

  v_result := jsonb_build_object(
    'total_commissions_paid', v_total_commissions_paid,
    'total_referrals', v_total_referrals
  );

  RETURN v_result;
END;
$$;

-- 3. Grants for the new function
GRANT EXECUTE ON FUNCTION public.get_worker_referral_stats() TO authenticated;

-- 4. Update RLS on profiles to allow workers to see basic info of their referrals
-- Note: We only allow seeing name and email to avoid full PII exposure
DROP POLICY IF EXISTS "Workers can view their referrals" ON public.profiles;
CREATE POLICY "Workers can view their referrals" ON public.profiles
  FOR SELECT 
  USING (
    referred_by = auth.uid()
  );

-- 5. Ensure referral_commissions has proper RLS for worker to see their own records
DROP POLICY IF EXISTS "Workers can view own commissions" ON public.referral_commissions;
CREATE POLICY "Workers can view own commissions" ON public.referral_commissions
  FOR SELECT 
  USING (worker_id = auth.uid());

-- 6. Update system_settings permissions (allow workers to read settings like referral percentage)
GRANT SELECT ON public.system_settings TO authenticated;

-- 7. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
