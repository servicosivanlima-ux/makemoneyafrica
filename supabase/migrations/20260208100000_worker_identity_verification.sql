-- Migration for Identity-Based Worker Security
-- 20260208100000_worker_identity_verification.sql

-- 1. Addition to profiles for status tracking
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'worker_status') THEN
        CREATE TYPE public.worker_status AS ENUM ('pending', 'id_verified', 'active', 'blocked');
    END IF;
END
$$;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS worker_status public.worker_status DEFAULT 'pending';

-- 2. Create kyc_documents table
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  doc_type TEXT NOT NULL, -- 'BI', 'Passaporte', etc.
  doc_number TEXT NOT NULL,
  doc_country TEXT NOT NULL,
  doc_name TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (doc_number)
);

-- 3. Create withdraw_methods table
CREATE TABLE IF NOT EXISTS public.withdraw_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'iban', 'express'
  holder_name TEXT NOT NULL,
  identifier TEXT NOT NULL, -- IBAN or Phone Number
  bank_name TEXT,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (identifier)
);

-- 4. Trigger to check holder name vs document name
CREATE OR REPLACE FUNCTION public.check_holder_name()
RETURNS TRIGGER AS $$
DECLARE
  verified_doc_name TEXT;
BEGIN
  -- Get the verified document name for this user
  SELECT doc_name INTO verified_doc_name
  FROM public.kyc_documents
  WHERE profile_id = NEW.profile_id
    AND verified = true;

  IF verified_doc_name IS NULL THEN
    RAISE EXCEPTION 'A identidade deve ser verificada antes de adicionar um método de saque.';
  END IF;

  -- Lowercase and trim for comparison
  IF lower(trim(verified_doc_name)) <> lower(trim(NEW.holder_name)) THEN
    RAISE EXCEPTION 'O nome do titular do método de saque não corresponde ao nome no documento verificado.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_holder_name ON public.withdraw_methods;
CREATE TRIGGER trg_check_holder_name
BEFORE INSERT OR UPDATE ON public.withdraw_methods
FOR EACH ROW
EXECUTE FUNCTION public.check_holder_name();

-- 5. Trigger to activate worker account
CREATE OR REPLACE FUNCTION public.activate_worker()
RETURNS TRIGGER AS $$
BEGIN
  -- If both ID and Withdrawal are verified, set to active
  IF EXISTS (
    SELECT 1 FROM public.kyc_documents WHERE profile_id = NEW.profile_id AND verified = true
  ) AND EXISTS (
    SELECT 1 FROM public.withdraw_methods WHERE profile_id = NEW.profile_id AND verified = true
  ) THEN
    UPDATE public.profiles
    SET worker_status = 'active'
    WHERE id = NEW.profile_id;
  -- If only ID is verified, set to id_verified
  ELSIF NEW.verified = true AND TG_TABLE_NAME = 'kyc_documents' THEN
    UPDATE public.profiles
    SET worker_status = 'id_verified'
    WHERE id = NEW.profile_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_activate_worker_kyc ON public.kyc_documents;
CREATE TRIGGER trg_activate_worker_kyc
AFTER UPDATE ON public.kyc_documents
FOR EACH ROW
WHEN (NEW.verified = true)
EXECUTE FUNCTION public.activate_worker();

DROP TRIGGER IF EXISTS trg_activate_worker_withdraw ON public.withdraw_methods;
CREATE TRIGGER trg_activate_worker_withdraw
AFTER UPDATE ON public.withdraw_methods
FOR EACH ROW
WHEN (NEW.verified = true)
EXECUTE FUNCTION public.activate_worker();

-- 6. RLS Policies
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdraw_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own KYC documents"
ON public.kyc_documents FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own KYC documents"
ON public.kyc_documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own withdrawal methods"
ON public.withdraw_methods FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own withdrawal methods"
ON public.withdraw_methods FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
