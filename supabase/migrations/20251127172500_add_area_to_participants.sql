-- Add area_id to participants table
ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS area_id UUID REFERENCES public.area(id) ON DELETE SET NULL;

-- Enable RLS on participants if not already enabled
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view participants from their company" ON public.participants;
DROP POLICY IF EXISTS "Admins can manage participants from their company" ON public.participants;

-- Create policies
CREATE POLICY "Users can view participants from their company" ON public.participants
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.user_company WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage participants from their company" ON public.participants
    FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM public.user_company WHERE user_id = auth.uid()
        )
        AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
    );
