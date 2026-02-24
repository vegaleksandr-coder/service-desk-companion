
-- Allow global admins to manage all user_companies records
CREATE POLICY "Global admins can manage all memberships"
ON public.user_companies
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow global admins to view all profiles
CREATE POLICY "Global admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow global admins to update all profiles
CREATE POLICY "Global admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow global admins to manage all categories
CREATE POLICY "Global admins can manage categories"
ON public.categories
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow global admins to manage all category members
CREATE POLICY "Global admins can manage category members"
ON public.category_members
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
