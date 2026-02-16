
-- =============================================
-- Multi-tenancy: Companies support
-- =============================================

-- 1. Companies table
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. User-company membership (role per company)
CREATE TABLE public.user_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- 3. Add company_id to data tables
ALTER TABLE public.tickets ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.categories ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.faqs ADD COLUMN company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.guides ADD COLUMN company_id uuid REFERENCES public.companies(id);

-- 4. Helper functions
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_companies WHERE user_id = _user_id AND company_id = _company_id) $$;

CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_companies WHERE user_id = _user_id AND company_id = _company_id AND role = 'admin') $$;

CREATE OR REPLACE FUNCTION public.get_user_company_role(_user_id uuid, _company_id uuid)
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_companies WHERE user_id = _user_id AND company_id = _company_id LIMIT 1 $$;

-- Function to get user's companies (SECURITY DEFINER to bypass RLS during login)
CREATE OR REPLACE FUNCTION public.get_user_companies(_user_id uuid)
RETURNS TABLE(company_id uuid, company_name text, role app_role)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT uc.company_id, c.name, uc.role
  FROM public.user_companies uc
  JOIN public.companies c ON c.id = uc.company_id
  WHERE uc.user_id = _user_id
  ORDER BY c.name
$$;

-- 5. Create default company & migrate existing data
DO $$
DECLARE
  default_company_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.companies (id, name) VALUES (default_company_id, 'Компания по умолчанию');
  
  UPDATE public.tickets SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.categories SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.faqs SET company_id = default_company_id WHERE company_id IS NULL;
  UPDATE public.guides SET company_id = default_company_id WHERE company_id IS NULL;
  
  INSERT INTO public.user_companies (user_id, company_id, role)
  SELECT ur.user_id, default_company_id, ur.role
  FROM public.user_roles ur
  ON CONFLICT (user_id, company_id) DO NOTHING;
END $$;

-- 6. RLS: companies
CREATE POLICY "Members can view their companies" ON public.companies
FOR SELECT USING (is_company_member(auth.uid(), id));

CREATE POLICY "Company admins can update company" ON public.companies
FOR UPDATE USING (is_company_admin(auth.uid(), id));

-- 7. RLS: user_companies
CREATE POLICY "Users can view memberships in their companies" ON public.user_companies
FOR SELECT USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins can manage memberships" ON public.user_companies
FOR ALL USING (is_company_admin(auth.uid(), company_id))
WITH CHECK (is_company_admin(auth.uid(), company_id));

-- 8. Update tickets RLS
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can update own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can delete own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Category members can view category tickets" ON public.tickets;
DROP POLICY IF EXISTS "Category admins can update category tickets" ON public.tickets;
DROP POLICY IF EXISTS "Assignees can update their assigned tickets" ON public.tickets;

CREATE POLICY "Company members can view tickets" ON public.tickets
FOR SELECT USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Company members can create tickets" ON public.tickets
FOR INSERT WITH CHECK (is_company_member(auth.uid(), company_id) AND auth.uid() = created_by);

CREATE POLICY "Users can update own tickets" ON public.tickets
FOR UPDATE USING (auth.uid() = created_by AND is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins can update tickets" ON public.tickets
FOR UPDATE USING (is_company_admin(auth.uid(), company_id));

CREATE POLICY "Assignees can update assigned tickets" ON public.tickets
FOR UPDATE USING (auth.uid() = assignee_id AND is_company_member(auth.uid(), company_id));

CREATE POLICY "Users can delete own tickets" ON public.tickets
FOR DELETE USING (auth.uid() = created_by AND is_company_member(auth.uid(), company_id));

-- 9. Update categories RLS
DROP POLICY IF EXISTS "Everyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "Company members can view categories" ON public.categories
FOR SELECT USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins can manage categories" ON public.categories
FOR ALL USING (is_company_admin(auth.uid(), company_id))
WITH CHECK (is_company_admin(auth.uid(), company_id));

-- 10. Update faqs RLS
DROP POLICY IF EXISTS "Everyone can view FAQs" ON public.faqs;
DROP POLICY IF EXISTS "Admins can manage FAQs" ON public.faqs;

CREATE POLICY "Company members can view FAQs" ON public.faqs
FOR SELECT USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins can manage FAQs" ON public.faqs
FOR ALL USING (is_company_admin(auth.uid(), company_id))
WITH CHECK (is_company_admin(auth.uid(), company_id));

-- 11. Update guides RLS
DROP POLICY IF EXISTS "Everyone can view guides" ON public.guides;
DROP POLICY IF EXISTS "Admins can manage guides" ON public.guides;

CREATE POLICY "Company members can view guides" ON public.guides
FOR SELECT USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Company admins can manage guides" ON public.guides
FOR ALL USING (is_company_admin(auth.uid(), company_id))
WITH CHECK (is_company_admin(auth.uid(), company_id));

-- 12. Update comments RLS (scope via ticket company)
DROP POLICY IF EXISTS "Users can view comments on their tickets" ON public.comments;
DROP POLICY IF EXISTS "Staff can view all comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;

CREATE POLICY "Users can view comments on their tickets" ON public.comments
FOR SELECT USING (
  NOT is_internal AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = comments.ticket_id
    AND (t.created_by = auth.uid() OR t.assignee_id = auth.uid())
  )
);

CREATE POLICY "Company staff can view all comments" ON public.comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.user_companies uc ON uc.company_id = t.company_id AND uc.user_id = auth.uid()
    WHERE t.id = comments.ticket_id
    AND uc.role IN ('admin', 'executor')
  )
);

CREATE POLICY "Company members can create comments" ON public.comments
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = comments.ticket_id
    AND is_company_member(auth.uid(), t.company_id)
  )
);

-- 13. Update attachments RLS
DROP POLICY IF EXISTS "Users can view attachments of their tickets" ON public.attachments;
DROP POLICY IF EXISTS "Staff can view all attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can upload attachments to their tickets" ON public.attachments;
DROP POLICY IF EXISTS "Staff can upload attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.attachments;

CREATE POLICY "Company members can view attachments" ON public.attachments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = attachments.ticket_id
    AND is_company_member(auth.uid(), t.company_id)
  )
);

CREATE POLICY "Company members can upload attachments" ON public.attachments
FOR INSERT WITH CHECK (
  auth.uid() = uploaded_by AND EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = attachments.ticket_id
    AND is_company_member(auth.uid(), t.company_id)
  )
);

CREATE POLICY "Users can delete own attachments" ON public.attachments
FOR DELETE USING (auth.uid() = uploaded_by);

-- 14. Update ticket_history RLS
DROP POLICY IF EXISTS "Users can view history of own tickets" ON public.ticket_history;
DROP POLICY IF EXISTS "Staff can view all history" ON public.ticket_history;
DROP POLICY IF EXISTS "Authenticated users can insert history" ON public.ticket_history;

CREATE POLICY "Company members can view ticket history" ON public.ticket_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_history.ticket_id
    AND is_company_member(auth.uid(), t.company_id)
  )
);

CREATE POLICY "Company members can insert history" ON public.ticket_history
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 15. Update category_members RLS
DROP POLICY IF EXISTS "Global admins can manage category members" ON public.category_members;
DROP POLICY IF EXISTS "Category admins can view members in their categories" ON public.category_members;
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.category_members;

CREATE POLICY "Company admins can manage category members" ON public.category_members
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.id = category_members.category_id
    AND is_company_admin(auth.uid(), c.company_id)
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.categories c
    WHERE c.id = category_members.category_id
    AND is_company_admin(auth.uid(), c.company_id)
  )
);

CREATE POLICY "Category admins can view members" ON public.category_members
FOR SELECT USING (is_category_admin(auth.uid(), category_id));

CREATE POLICY "Users can view own memberships" ON public.category_members
FOR SELECT USING (auth.uid() = user_id);

-- 16. Update profiles RLS (company admins see profiles of company users)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Company admins can view company profiles" ON public.profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc1
    JOIN public.user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = auth.uid() AND uc1.role = 'admin'
    AND uc2.user_id = profiles.user_id
  )
);

CREATE POLICY "Company admins can update company profiles" ON public.profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc1
    JOIN public.user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = auth.uid() AND uc1.role = 'admin'
    AND uc2.user_id = profiles.user_id
  )
);

-- 17. Update user_roles RLS
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Company admins can view company user roles" ON public.user_roles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc1
    JOIN public.user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = auth.uid() AND uc1.role = 'admin'
    AND uc2.user_id = user_roles.user_id
  )
);

CREATE POLICY "Company admins can manage company user roles" ON public.user_roles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc1
    JOIN public.user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = auth.uid() AND uc1.role = 'admin'
    AND uc2.user_id = user_roles.user_id
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_companies uc1
    JOIN public.user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = auth.uid() AND uc1.role = 'admin'
    AND uc2.user_id = user_roles.user_id
  )
);

-- 18. Updated_at trigger for companies
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
