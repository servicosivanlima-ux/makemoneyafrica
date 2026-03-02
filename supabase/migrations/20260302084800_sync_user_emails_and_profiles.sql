-- Synchronization migration to fix orphan profiles and mismatched emails
-- Date: 2026-03-02

-- 1. Sync emails from auth.users to public.profiles for all users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND (p.email IS NULL OR p.email != u.email);

-- 2. Ensure all users in auth.users have a profile record
INSERT INTO public.profiles (user_id, email, full_name, user_type)
SELECT id, email, COALESCE(raw_user_meta_data->>'name', raw_user_meta_data->>'full_name', 'Utilizador'), 'worker'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT (user_id) DO NOTHING;

-- 3. In addition to the manual cleanup of 'servicos.ivanlima@gmail.com',
-- this migration ensures future consistency.
NOTIFY pgrst, 'reload schema';
