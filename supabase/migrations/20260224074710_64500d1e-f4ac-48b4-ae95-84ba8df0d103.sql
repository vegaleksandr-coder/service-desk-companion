
-- Allow global admins to view ALL companies (not just ones they're members of)
CREATE POLICY "Global admins can view all companies"
ON public.companies
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow global admins to view all user_roles
CREATE POLICY "Global admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow global admins to manage all user_roles
CREATE POLICY "Global admins can manage all user roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
