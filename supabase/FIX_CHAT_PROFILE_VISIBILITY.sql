-- FIX PROFILE VISIBILITY FOR CHAT
-- Issue: Only admins can see user names because RLS blocks workers from reading 'profiles'.
-- Fix: Allow all authenticated users to read public profile info (name, email, avatar).

-- 1. Drop existing restrictive policies on profiles (if any exist that conflict)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by users who created them" ON public.profiles;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- 2. Create a new permissible policy for READ access
-- This allows any logged-in user to read ANY profile. 
-- Necessary for avoiding "Usuário" in Chat and Rankings.
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 3. Ensure users can update THEIR OWN profile (for settings page)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Reload Schema to apply changes immediately
NOTIFY pgrst, 'reload schema';
