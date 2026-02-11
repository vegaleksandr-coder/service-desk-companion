
-- Fix 1: Make ticket-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'ticket-attachments';

-- Remove old permissive public SELECT policy if exists
DROP POLICY IF EXISTS "Anyone can view ticket attachments" ON storage.objects;

-- Create authenticated-only access policies for storage
-- Allow authenticated users who have access to the ticket to view attachments
CREATE POLICY "Authenticated users can view ticket attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ticket-attachments'
  AND auth.role() = 'authenticated'
);

-- Keep existing upload/delete policies as-is (they already check auth)
