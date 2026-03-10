-- Allow category members (admin/executor) to update tickets in their category (for self-assignment and status changes)
CREATE POLICY "Category members can update category tickets"
ON public.tickets
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM category_members cm
    WHERE cm.category_id = tickets.category_id
      AND cm.user_id = auth.uid()
  )
  AND is_company_member(auth.uid(), company_id)
);