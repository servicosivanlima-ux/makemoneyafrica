-- Add activity tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_access TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0;

-- Function to track user access
CREATE OR REPLACE FUNCTION public.track_user_access(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET 
        last_access = NOW(),
        access_count = COALESCE(access_count, 0) + 1
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.track_user_access(UUID) TO authenticated;
