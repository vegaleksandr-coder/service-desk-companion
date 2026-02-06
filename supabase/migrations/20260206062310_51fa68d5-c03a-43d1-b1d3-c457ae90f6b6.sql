-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', true);

-- Create attachments table
CREATE TABLE public.attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for attachments table
CREATE POLICY "Users can view attachments of their tickets"
ON public.attachments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tickets
    WHERE tickets.id = attachments.ticket_id
    AND (tickets.created_by = auth.uid() OR tickets.assignee_id = auth.uid())
  )
);

CREATE POLICY "Staff can view all attachments"
ON public.attachments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'executor'::app_role));

CREATE POLICY "Users can upload attachments to their tickets"
ON public.attachments
FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by AND
  EXISTS (
    SELECT 1 FROM tickets
    WHERE tickets.id = attachments.ticket_id
    AND tickets.created_by = auth.uid()
  )
);

CREATE POLICY "Staff can upload attachments"
ON public.attachments
FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'executor'::app_role))
);

CREATE POLICY "Users can delete their own attachments"
ON public.attachments
FOR DELETE
USING (auth.uid() = uploaded_by);

-- Storage policies for ticket-attachments bucket
CREATE POLICY "Anyone can view ticket attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'ticket-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'ticket-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);