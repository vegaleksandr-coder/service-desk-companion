
-- Fix infinite recursion: replace self-referencing policy with security definer function
DROP POLICY IF EXISTS "Category admins can view members in their categories" ON public.category_members;

CREATE POLICY "Category admins can view members in their categories"
ON public.category_members
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (is_category_admin(auth.uid(), category_id));
