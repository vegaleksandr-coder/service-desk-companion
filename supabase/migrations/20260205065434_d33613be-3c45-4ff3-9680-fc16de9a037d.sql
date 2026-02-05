-- Create ticket history table
CREATE TABLE public.ticket_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted'
  changes JSONB, -- stores old and new values
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_history ENABLE ROW LEVEL SECURITY;

-- Users can view history of their own tickets
CREATE POLICY "Users can view history of own tickets"
ON public.ticket_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tickets
    WHERE tickets.id = ticket_history.ticket_id
    AND tickets.created_by = auth.uid()
  )
);

-- Staff can view all history
CREATE POLICY "Staff can view all history"
ON public.ticket_history
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'executor')
);

-- System inserts history (via trigger)
CREATE POLICY "Authenticated users can insert history"
ON public.ticket_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own tickets
CREATE POLICY "Users can delete own tickets"
ON public.tickets
FOR DELETE
USING (auth.uid() = created_by);

-- Function to log ticket changes
CREATE OR REPLACE FUNCTION public.log_ticket_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changes_json JSONB := '{}';
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Build changes object
    IF OLD.title IS DISTINCT FROM NEW.title THEN
      changes_json := changes_json || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
    END IF;
    IF OLD.description IS DISTINCT FROM NEW.description THEN
      changes_json := changes_json || jsonb_build_object('description', jsonb_build_object('old', OLD.description, 'new', NEW.description));
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      changes_json := changes_json || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      changes_json := changes_json || jsonb_build_object('priority', jsonb_build_object('old', OLD.priority, 'new', NEW.priority));
    END IF;
    IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
      changes_json := changes_json || jsonb_build_object('category_id', jsonb_build_object('old', OLD.category_id, 'new', NEW.category_id));
    END IF;
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      changes_json := changes_json || jsonb_build_object('assignee_id', jsonb_build_object('old', OLD.assignee_id, 'new', NEW.assignee_id));
    END IF;
    IF OLD.deadline IS DISTINCT FROM NEW.deadline THEN
      changes_json := changes_json || jsonb_build_object('deadline', jsonb_build_object('old', OLD.deadline, 'new', NEW.deadline));
    END IF;
    
    -- Only insert if there are actual changes
    IF changes_json != '{}' THEN
      INSERT INTO public.ticket_history (ticket_id, user_id, action, changes)
      VALUES (NEW.id, auth.uid(), 'updated', changes_json);
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for logging changes
CREATE TRIGGER trigger_log_ticket_changes
AFTER UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.log_ticket_changes();