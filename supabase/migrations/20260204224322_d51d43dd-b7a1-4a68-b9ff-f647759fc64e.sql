-- Create storage bucket for task proofs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-proofs', 
  'task-proofs', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg']
);

-- Allow authenticated users to upload their own proofs
CREATE POLICY "Workers can upload their proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'task-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow anyone to view proofs (for admin review)
CREATE POLICY "Anyone can view task proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-proofs');

-- Allow workers to update their own proofs
CREATE POLICY "Workers can update their proofs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'task-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow workers to delete their own proofs
CREATE POLICY "Workers can delete their proofs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'task-proofs' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);