
-- 1. Create enum for category-level roles
CREATE TYPE public.category_role AS ENUM ('admin', 'executor');

-- 2. Create category_members table
CREATE TABLE public.category_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  role category_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, role)
);

ALTER TABLE public.category_members ENABLE ROW LEVEL SECURITY;

-- 3. RLS for category_members
CREATE POLICY "Global admins can manage category members"
  ON public.category_members FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own memberships"
  ON public.category_members FOR SELECT
  USING (auth.uid() = user_id);

-- Category admins can view members in their categories
CREATE POLICY "Category admins can view members in their categories"
  ON public.category_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.category_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.category_id = category_members.category_id
      AND cm.role = 'admin'
  ));

-- 4. Security definer functions for category membership checks
CREATE OR REPLACE FUNCTION public.is_category_member(_user_id uuid, _category_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.category_members
    WHERE user_id = _user_id AND category_id = _category_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_category_admin(_user_id uuid, _category_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.category_members
    WHERE user_id = _user_id AND category_id = _category_id AND role = 'admin'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_category_executor(_user_id uuid, _category_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.category_members
    WHERE user_id = _user_id AND category_id = _category_id AND role = 'executor'
  )
$$;

-- 5. Update tickets RLS: drop old executor/assignee policy, add category-based
DROP POLICY IF EXISTS "Assignees can view assigned tickets" ON public.tickets;

-- Executors can see all tickets in their categories
CREATE POLICY "Category members can view category tickets"
  ON public.tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.category_members
      WHERE category_members.user_id = auth.uid()
        AND category_members.category_id = tickets.category_id
    )
  );

-- Category admins can update tickets in their categories
DROP POLICY IF EXISTS "Staff can update tickets" ON public.tickets;

CREATE POLICY "Category admins can update category tickets"
  ON public.tickets FOR UPDATE
  USING (
    is_category_admin(auth.uid(), category_id)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Keep user's own ticket update policy
-- "Users can update own tickets" already exists

-- Global admins keep full access (policy already exists: "Admins can view all tickets")
