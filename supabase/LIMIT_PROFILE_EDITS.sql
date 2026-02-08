-- LIMIT PROFILE EDITS TO ONE TIME
-- Issue: Users should only be able to update their Name/Phone ONCE.
-- Fix: Add 'personal_info_editable' column and enforce it via RLS.

-- 1. Add the column (Default TRUE so everyone gets 1 chance)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS personal_info_editable BOOLEAN DEFAULT true;

-- 2. Update RLS to prevent updates if personal_info_editable is FALSE
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (
    auth.uid() = user_id 
    -- Allow update only if it's currently editable logic is handled by CHECK or separate logic
    -- But strict enforcement: The *OLD* row must be editable.
    AND (personal_info_editable = true OR personal_info_editable IS NULL)
)
WITH CHECK (
    auth.uid() = user_id
);

-- 3. Reload Schema
NOTIFY pgrst, 'reload schema';
