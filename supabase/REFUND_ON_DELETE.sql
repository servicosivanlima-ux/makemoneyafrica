-- ============================================
-- REFUND ON CAMPAIGN DELETE (ADMIN ONLY)
-- ============================================

CREATE OR REPLACE FUNCTION public.refund_campaign_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  -- Check if executed by admin
  v_is_admin := public.has_role(auth.uid(), 'admin'::app_role);
  
  -- Only refund if:
  -- 1. User is Admin
  -- 2. Campaign was Active (meaning it was paid for)
  -- 3. No tasks were completed (completed_count = 0)
  IF v_is_admin AND OLD.status = 'active' AND OLD.completed_count = 0 THEN
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + OLD.price
    WHERE user_id = OLD.client_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to allow safe re-runs
DROP TRIGGER IF EXISTS on_campaign_delete_refund ON public.campaigns;

CREATE TRIGGER on_campaign_delete_refund
BEFORE DELETE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.refund_campaign_on_delete();
