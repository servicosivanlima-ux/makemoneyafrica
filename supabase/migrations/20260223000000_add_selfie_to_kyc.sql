-- Add selfie_url to kyc_documents
ALTER TABLE public.kyc_documents 
ADD COLUMN IF NOT EXISTS selfie_url TEXT;

-- Enable real-time for kyc_documents to allow smartphone sync
-- First check if the publication exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
    ) THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add kyc_documents to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.kyc_documents;

-- Re-grant permissions just in case
GRANT ALL ON TABLE public.kyc_documents TO authenticated;
GRANT ALL ON TABLE public.kyc_documents TO service_role;

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
