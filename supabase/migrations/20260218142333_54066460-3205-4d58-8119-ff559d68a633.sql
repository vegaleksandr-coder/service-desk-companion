-- Fix storage.objects RLS: restrict ticket-attachments access to company members

-- Drop overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view ticket attachments" ON storage.objects;

-- Create company-scoped SELECT policy
CREATE POLICY "Company members can view ticket attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ticket-attachments'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.attachments a
    JOIN public.tickets t ON t.id = a.ticket_id
    WHERE a.file_path = storage.objects.name
    AND public.is_company_member(auth.uid(), t.company_id)
  )
);

-- Drop overly permissive INSERT policy if exists
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;

-- Create scoped INSERT policy (attachments table RLS enforces company check on record creation)
CREATE POLICY "Authenticated users can upload ticket attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Drop overly permissive DELETE policy if exists  
DROP POLICY IF EXISTS "Users can delete own attachments from storage" ON storage.objects;

-- Create scoped DELETE policy
CREATE POLICY "Users can delete own ticket attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ticket-attachments'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);