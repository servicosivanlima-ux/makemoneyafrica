-- Drop and recreate view with security_invoker enabled
DROP VIEW IF EXISTS public.available_campaigns_for_workers;

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

-- Grant access to authenticated users only
REVOKE ALL ON public.available_campaigns_for_workers FROM anon;
GRANT SELECT ON public.available_campaigns_for_workers TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.available_campaigns_for_workers IS 'Secure view (security_invoker=on) for workers to see active campaigns without exposing client_id, price, or other sensitive business data';