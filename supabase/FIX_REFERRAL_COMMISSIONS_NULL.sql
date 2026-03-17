-- ============================================
-- FIX: referral_commissions NOT NULL constraint
-- Allows safe user deletion by letting references be NULL 
-- ============================================

-- This fixes: null value in column "client_id" of relation "referral_commissions" violates not-null constraint
ALTER TABLE public.referral_commissions ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.referral_commissions ALTER COLUMN worker_id DROP NOT NULL;

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
