-- FIX_USER_TRACKING.sql
-- Run this in Supabase SQL Editor to add tracking columns and RPC

-- 1. Ensure columns exist in profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_access TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0;

-- 2. Create improved track_user_access function
-- No arguments needed: uses auth.uid() automatically for security and simplicity
CREATE OR REPLACE FUNCTION public.track_user_access()
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET 
        last_access = NOW(),
        access_count = COALESCE(access_count, 0) + 1
    WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Permissions
GRANT EXECUTE ON FUNCTION public.track_user_access() TO authenticated;

-- 4. Reload cache
NOTIFY pgrst, 'reload schema';
