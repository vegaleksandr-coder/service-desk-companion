
-- Drop all existing policies on category_members
DROP POLICY IF EXISTS "Category admins can view members in their categories" ON public.category_members;
DROP POLICY IF EXISTS "Global admins can manage category members" ON public.category_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.category_members;

-- Recreate as PERMISSIVE (OR logic)
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
USING (is_category_admin(auth.uid(), category_id));

CREATE POLICY "Users can view their own memberships"
ON public.category_members
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
