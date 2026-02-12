-- FIX KYC SCHEMA COMPLIANCE
-- This script ensures all required columns exist and reloads the cache.

-- 1. Ensure 'verified_at' exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_documents' AND column_name='verified_at') THEN
        ALTER TABLE public.kyc_documents ADD COLUMN verified_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_documents' AND column_name='verified') THEN
        ALTER TABLE public.kyc_documents ADD COLUMN verified BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Force schema cache reload (Critical for "Current column not found in schema cache" error)
NOTIFY pgrst, 'reload schema';
