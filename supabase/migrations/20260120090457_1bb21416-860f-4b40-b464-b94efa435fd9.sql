-- Create a secure view for workers to see campaigns without sensitive data
CREATE OR REPLACE VIEW public.available_campaigns_for_workers AS
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

-- Grant access to authenticated users
GRANT SELECT ON public.available_campaigns_for_workers TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.available_campaigns_for_workers IS 'Secure view for workers to see active campaigns without exposing client_id, price, or other sensitive business data';