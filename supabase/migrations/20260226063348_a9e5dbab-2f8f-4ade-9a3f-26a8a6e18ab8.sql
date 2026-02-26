
-- Allow chief_admin to view their own companies (they are already in user_companies with role=admin, so is_company_member works)
-- Allow chief_admin to manage companies they belong to
CREATE POLICY "Chief admins can manage own company"
ON public.companies FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'chief_admin'
  )
  AND
  EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid() AND uc.company_id = companies.id AND uc.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'chief_admin'
  )
);

-- Allow chief_admin to insert companies (for creation)
CREATE POLICY "Chief admins can insert companies"
ON public.companies FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'chief_admin'
  )
);

-- Allow chief_admin to delete their company
CREATE POLICY "Chief admins can delete own company"
ON public.companies FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'chief_admin'
  )
  AND
  EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid() AND uc.company_id = companies.id AND uc.role = 'admin'
  )
);
