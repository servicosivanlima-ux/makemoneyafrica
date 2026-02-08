-- FIX STORAGE PERMISSIONS
-- Run this in Supabase SQL Editor

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('task-proofs', 'task-proofs', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/jpg'])
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg'];

-- 2. Drop old restrictve policies to avoid conflicts
DROP POLICY IF EXISTS "Workers can upload their proofs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view task proofs" ON storage.objects;
DROP POLICY IF EXISTS "Workers can update their proofs" ON storage.objects;
DROP POLICY IF EXISTS "Workers can delete their proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view proofs" ON storage.objects;

-- 3. Create permissive policies for all authenticated users (Clients & Workers)
-- Allow Uploads
CREATE POLICY "Users can upload proofs" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'task-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow View (Public or Authenticated)
CREATE POLICY "Users can view proofs" ON storage.objects 
FOR SELECT TO authenticated 
USING (bucket_id = 'task-proofs');

-- Allow Updates
CREATE POLICY "Users can update proofs" ON storage.objects 
FOR UPDATE TO authenticated 
USING (bucket_id = 'task-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow Deletes
CREATE POLICY "Users can delete proofs" ON storage.objects 
FOR DELETE TO authenticated 
USING (bucket_id = 'task-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
