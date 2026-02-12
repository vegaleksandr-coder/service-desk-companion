
-- Recreate view WITHOUT security_invoker so it bypasses base table RLS
-- The view itself only exposes safe columns (no email, no can_manage_users)
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
SELECT 
  id,
  user_id,
  name,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;
