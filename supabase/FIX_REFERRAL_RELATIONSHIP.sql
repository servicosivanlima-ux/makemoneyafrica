-- FIX FOR: Could not find a relationship between 'referral_commissions' and 'profiles'
-- Run this in Supabase SQL Editor

-- 1. Drop existing foreign key constraints
ALTER TABLE public.referral_commissions DROP CONSTRAINT IF EXISTS referral_commissions_worker_id_fkey;
ALTER TABLE public.referral_commissions DROP CONSTRAINT IF EXISTS referral_commissions_client_id_fkey;

-- 2. Add corrected constraints pointing to profiles(user_id)
ALTER TABLE public.referral_commissions 
  ADD CONSTRAINT referral_commissions_worker_id_fkey 
  FOREIGN KEY (worker_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.referral_commissions 
  ADD CONSTRAINT referral_commissions_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 3. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
