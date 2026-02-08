-- FIX KYC DUPLICATES AND SYNC
-- 1. Ensure `worker_status` column exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='worker_status') THEN
        ALTER TABLE public.profiles ADD COLUMN worker_status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- 2. Remove duplicates, keeping the most recent one for each user
DELETE FROM public.kyc_documents a USING (
      SELECT MIN(ctid) as ctid, user_id
      FROM public.kyc_documents 
      GROUP BY user_id HAVING COUNT(*) > 1
      ) b
      WHERE a.user_id = b.user_id 
      AND a.ctid <> b.ctid;

-- 3. Trigger to automatically update profiles.worker_status when kyc_documents.status changes
CREATE OR REPLACE FUNCTION public.sync_kyc_status_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' THEN
        UPDATE public.profiles
        SET worker_status = 'id_verified'
        WHERE user_id = NEW.user_id;
    ELSIF NEW.status = 'rejected' THEN
        UPDATE public.profiles
        SET worker_status = 'rejected'
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_kyc_status_change ON public.kyc_documents;
CREATE TRIGGER on_kyc_status_change
AFTER INSERT OR UPDATE OF status ON public.kyc_documents
FOR EACH ROW EXECUTE FUNCTION public.sync_kyc_status_to_profile();

-- 4. Force Sync for existing approved documents
UPDATE public.profiles
SET worker_status = 'id_verified'
FROM public.kyc_documents
WHERE public.profiles.user_id = public.kyc_documents.user_id
AND public.kyc_documents.status = 'approved';

NOTIFY pgrst, 'reload schema';
