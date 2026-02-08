
-- Drop the old "Staff can view all tickets" policy that gives both admin AND executor access to ALL tickets
DROP POLICY IF EXISTS "Staff can view all tickets" ON public.tickets;

-- Create new policy: only admins can view all tickets
CREATE POLICY "Admins can view all tickets"
ON public.tickets
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- "Assignees can view assigned tickets" already exists and covers executors
-- "Users can view own tickets" already exists
