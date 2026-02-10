
-- Drop existing restrictive policies on category_members
DROP POLICY IF EXISTS "Global admins can manage category members" ON public.category_members;
DROP POLICY IF EXISTS "Category admins can view members in their categories" ON public.category_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.category_members;

-- Recreate as PERMISSIVE policies with TO authenticated
CREATE POLICY "Global admins can manage category members"
ON public.category_members
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Category admins can view members in their categories"
ON public.category_members
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM category_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.category_id = category_members.category_id
      AND cm.role = 'admin'::category_role
  )
);

CREATE POLICY "Users can view their own memberships"
ON public.category_members
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
