-- ======================================================
-- KYC SECURITY & SCHEMA FIX
-- Fixes RLS errors and adds missing columns for manual verification
-- ======================================================

-- 1. Fix kyc_documents schema
ALTER TABLE public.kyc_documents 
ADD COLUMN IF NOT EXISTS doc_image_url TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 2. Ensure RLS is correctly configured for the table
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- Drop old policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON public.kyc_documents;
DROP POLICY IF EXISTS "Users can insert their own KYC documents" ON public.kyc_documents;
DROP POLICY IF EXISTS "Admins can view all KYC documents" ON public.kyc_documents;
DROP POLICY IF EXISTS "Admins can update KYC documents" ON public.kyc_documents;

-- Create robust policies
CREATE POLICY "Users can view their own KYC documents"
ON public.kyc_documents FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own KYC documents"
ON public.kyc_documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all KYC documents"
ON public.kyc_documents FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update KYC documents"
ON public.kyc_documents FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));


-- 3. Storage Permissions for 'kyc-documents' bucket
-- Note: This assumes the bucket 'kyc-documents' exists. 
-- In case it doesn't, it should be created via Supabase Dashboard or API.

-- Policy for Workers to Upload
CREATE POLICY "Allow workers to upload KYC documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'kyc-documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for Workers to View their own (for previews)
CREATE POLICY "Allow workers to view their own KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'kyc-documents' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy for Admins to View everything
CREATE POLICY "Allow admins to view all KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'kyc-documents' 
    AND has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Manual Activation Trigger Refinement
-- We keep the existing activate_worker trigger, but ensure it only fires
-- when the 'verified' boolean is explicitly set to TRUE (which only admins can do via RLS).

CREATE OR REPLACE FUNCTION public.activate_worker()
RETURNS TRIGGER AS $$
BEGIN
  -- Account becomes ACTIVE only if ID is verified AND Withdrawal Method is verified
  IF EXISTS (
    SELECT 1 FROM public.kyc_documents WHERE profile_id = NEW.profile_id AND verified = true
  ) AND EXISTS (
    SELECT 1 FROM public.withdraw_methods WHERE profile_id = NEW.profile_id AND verified = true
  ) THEN
    UPDATE public.profiles
    SET worker_status = 'active'
    WHERE id = NEW.profile_id;
    
  -- Account becomes ID_VERIFIED if ID is verified but withdrawal is not yet
  ELSIF NEW.verified = true AND TG_TABLE_NAME = 'kyc_documents' THEN
    UPDATE public.profiles
    SET worker_status = 'id_verified'
    WHERE id = NEW.profile_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reload schema
NOTIFY pgrst, 'reload schema';
