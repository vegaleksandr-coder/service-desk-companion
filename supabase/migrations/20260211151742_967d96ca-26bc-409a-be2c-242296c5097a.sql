
-- Create FAQs table
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Everyone can view FAQs
CREATE POLICY "Everyone can view FAQs"
ON public.faqs FOR SELECT
USING (true);

-- Admins can manage FAQs
CREATE POLICY "Admins can manage FAQs"
ON public.faqs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Timestamp trigger
CREATE TRIGGER update_faqs_updated_at
BEFORE UPDATE ON public.faqs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
