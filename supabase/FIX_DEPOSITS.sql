-- FIX DEPOSITS TABLE & PERMISSIONS
-- Run this in Supabase SQL Editor

-- 1. Ensure the type exists
DO $$ BEGIN
    CREATE TYPE public.deposit_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount INTEGER NOT NULL,
    status deposit_status DEFAULT 'pending' NOT NULL,
    payment_proof_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Ensure columns exist (Idempotent updates)
-- Adding columns if they are missing from an older version of the table
DO $$ BEGIN
    ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 4. Reset Permissions (RLS) completely
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Clients can view own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Clients can create deposits" ON public.deposits;
DROP POLICY IF EXISTS "Admins can manage all deposits" ON public.deposits;

-- Re-create Policies
-- Clients can see/create their own
CREATE POLICY "Clients can view own deposits" ON public.deposits FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Clients can create deposits" ON public.deposits FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Admins can do EVERYTHING (View, Update, Delete)
CREATE POLICY "Admins can manage all deposits" ON public.deposits FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 5. Grant Access explicitly
GRANT ALL ON public.deposits TO postgres;
GRANT ALL ON public.deposits TO service_role;
GRANT ALL ON public.deposits TO authenticated;
