-- FIX MISSING COLUMNS
-- Run this in Supabase SQL Editor

-- 1. Add wallet_balance to profiles (Required for deposits)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance INTEGER DEFAULT 0;

-- 2. Add scheduled deletion columns (Required for auto-deletion)
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS scheduled_deletion_at TIMESTAMPTZ;

-- 3. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
