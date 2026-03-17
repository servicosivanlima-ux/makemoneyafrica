-- ============================================
-- SAFE USER DELETION: Preserve Campaigns & Tasks
-- Changes foreign key constraints from CASCADE to SET NULL
-- so that campaigns and tasks persist after client deletion.
-- ============================================

-- 1. Modify Campaigns table
-- Remove NOT NULL from client_id and Change FK to SET NULL
ALTER TABLE public.campaigns ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_client_id_fkey;
ALTER TABLE public.campaigns ADD CONSTRAINT campaigns_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Modify Referral Commissions
-- Ensure both worker and client references persist as NULL on deletion
ALTER TABLE public.referral_commissions DROP CONSTRAINT IF EXISTS referral_commissions_worker_id_fkey;
ALTER TABLE public.referral_commissions ADD CONSTRAINT referral_commissions_worker_id_fkey 
  FOREIGN KEY (worker_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.referral_commissions DROP CONSTRAINT IF EXISTS referral_commissions_client_id_fkey;
ALTER TABLE public.referral_commissions ADD CONSTRAINT referral_commissions_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- 3. Modify Withdrawals
-- Keep withdrawal history even if worker is deleted
ALTER TABLE public.withdrawals ALTER COLUMN worker_id DROP NOT NULL;
ALTER TABLE public.withdrawals DROP CONSTRAINT IF EXISTS withdrawals_worker_id_fkey;
ALTER TABLE public.withdrawals ADD CONSTRAINT withdrawals_worker_id_fkey 
  FOREIGN KEY (worker_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
