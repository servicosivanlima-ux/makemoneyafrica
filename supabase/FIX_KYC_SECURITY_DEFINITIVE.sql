-- ======================================================
-- DEFINITIVE KYC SECURITY & SCHEMA FIX
-- Reset all permissions and policies to ensure working insertion
-- ======================================================

-- 1. Ensure Columns Exist (Definitive check)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_documents' AND column_name='doc_image_url') THEN
        ALTER TABLE public.kyc_documents ADD COLUMN doc_image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kyc_documents' AND column_name='status') THEN
        ALTER TABLE public.kyc_documents ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- 2. RESET PERMISSIONS
-- Sometimes standard grants are lost or misconfigured
GRANT ALL ON TABLE public.kyc_documents TO authenticated;
GRANT ALL ON TABLE public.kyc_documents TO service_role;
GRANT ALL ON TABLE public.kyc_documents TO postgres;

-- 3. RESET RLS POLICIES (DROP ALL)
DROP POLICY IF EXISTS "Users can view their own KYC documents" ON public.kyc_documents;
DROP POLICY IF EXISTS "Users can insert their own KYC documents" ON public.kyc_documents;
DROP POLICY IF EXISTS "Admins can view all KYC documents" ON public.kyc_documents;
DROP POLICY IF EXISTS "Admins can update KYC documents" ON public.kyc_documents;
DROP POLICY IF EXISTS "Allow workers to upload KYC documents" ON public.kyc_documents; -- Cleanup any wrong names
DROP POLICY IF EXISTS "authenticated_insert_own_kyc" ON public.kyc_documents;

-- 4. CREATE ROBUST POLICIES
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- Insertion Policy: Crucial for the error reported
-- We use a very explicit check and cast auth.uid()
CREATE POLICY "authenticated_insert_own_kyc"
ON public.kyc_documents
FOR INSERT
TO authenticated
WITH CHECK ( (auth.uid())::uuid = user_id );

-- Selection Policy: For the worker to see their status
CREATE POLICY "authenticated_select_own_kyc"
ON public.kyc_documents
FOR SELECT
TO authenticated
USING ( (auth.uid())::uuid = user_id );

-- Admin Override Policies
CREATE POLICY "admin_all_kyc"
ON public.kyc_documents
FOR ALL
TO authenticated
USING ( has_role(auth.uid(), 'admin'::app_role) )
WITH CHECK ( has_role(auth.uid(), 'admin'::app_role) );


-- 5. RE-GRANT STORAGE PERMISSIONS (FOR THE BUCKET)
-- This ensures the image actually reaches the server
DO $$
BEGIN
    -- Ensure bucket exists (this is a helper, might need manual check if it fails)
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('kyc-documents', 'kyc-documents', true)
    ON CONFLICT (id) DO NOTHING;
END $$;

-- Drop storage policies to reset
DROP POLICY IF EXISTS "Allow workers to upload KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow workers to view their own KYC documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow admins to view all KYC documents" ON storage.objects;

-- Storage Insert Policy
CREATE POLICY "Allow workers to upload KYC documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'kyc-documents' 
    AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Storage Select Policy
CREATE POLICY "Allow workers to view their own KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'kyc-documents' 
    AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Storage Admin Policy
CREATE POLICY "Allow admins to view all KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'kyc-documents' 
    AND has_role(auth.uid(), 'admin'::app_role)
);

-- 6. RESET SEQUENCE GRANTS (If any)
-- kyc_documents uses uuid primary key, no sequence needed for 'id'

-- Force Cache Reload
NOTIFY pgrst, 'reload schema';
