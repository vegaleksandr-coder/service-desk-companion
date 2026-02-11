-- Add can_manage_users flag to profiles
ALTER TABLE public.profiles ADD COLUMN can_manage_users boolean NOT NULL DEFAULT false;