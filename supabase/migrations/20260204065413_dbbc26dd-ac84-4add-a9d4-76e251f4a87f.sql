-- Create enum for ticket priority
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'critical', 'deadline');

-- Create enum for ticket status
CREATE TYPE public.ticket_status AS ENUM ('new', 'in_progress', 'awaiting', 'resolved', 'closed');

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Everyone can view categories
CREATE POLICY "Everyone can view categories"
ON public.categories
FOR SELECT
USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'new',
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  assignee_id UUID,
  deadline TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets"
ON public.tickets
FOR SELECT
USING (auth.uid() = created_by);

-- Assignees can view assigned tickets
CREATE POLICY "Assignees can view assigned tickets"
ON public.tickets
FOR SELECT
USING (auth.uid() = assignee_id);

-- Admins and executors can view all tickets
CREATE POLICY "Staff can view all tickets"
ON public.tickets
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'executor')
);

-- Users can create tickets
CREATE POLICY "Users can create tickets"
ON public.tickets
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can update their own tickets (limited)
CREATE POLICY "Users can update own tickets"
ON public.tickets
FOR UPDATE
USING (auth.uid() = created_by);

-- Staff can update any ticket
CREATE POLICY "Staff can update tickets"
ON public.tickets
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'executor')
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Users can view non-internal comments on their tickets
CREATE POLICY "Users can view comments on their tickets"
ON public.comments
FOR SELECT
USING (
  NOT is_internal AND 
  EXISTS (
    SELECT 1 FROM public.tickets 
    WHERE tickets.id = comments.ticket_id 
    AND (tickets.created_by = auth.uid() OR tickets.assignee_id = auth.uid())
  )
);

-- Staff can view all comments
CREATE POLICY "Staff can view all comments"
ON public.comments
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'executor')
);

-- Authenticated users can create comments
CREATE POLICY "Users can create comments"
ON public.comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at on tickets
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, description, icon) VALUES
  ('IT-поддержка', 'Технические проблемы', 'laptop'),
  ('HR', 'Кадровые вопросы', 'users'),
  ('Бухгалтерия', 'Финансовые вопросы', 'calculator'),
  ('АХО', 'Хозяйственные вопросы', 'building'),
  ('Безопасность', 'Вопросы безопасности', 'shield');