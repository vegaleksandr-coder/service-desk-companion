-- Allow assignee to update ticket status
CREATE POLICY "Assignees can update their assigned tickets"
ON public.tickets
FOR UPDATE
USING (auth.uid() = assignee_id)
WITH CHECK (auth.uid() = assignee_id);