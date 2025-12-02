-- Create area table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.area (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.project(id) ON DELETE CASCADE,
    name VARCHAR NOT NULL,
    color VARCHAR,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    CONSTRAINT area_company_name_key UNIQUE (company_id, name)
);

-- Ensure RLS is enabled on area table
ALTER TABLE public.area ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view areas from their company" ON public.area;
DROP POLICY IF EXISTS "Admins can manage areas from their company" ON public.area;

-- Create policies
CREATE POLICY "Users can view areas from their company" ON public.area
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.user_company WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage areas from their company" ON public.area
    FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM public.user_company WHERE user_id = auth.uid()
        )
        AND (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'super_admin')
    );

-- Create function to insert default areas
CREATE OR REPLACE FUNCTION public.create_default_areas(target_company_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.area (company_id, name, color)
    VALUES 
        (target_company_id, 'Almacén', '#FF5733'),
        (target_company_id, 'Calidad', '#33FF57'),
        (target_company_id, 'Gerencia', '#3357FF'),
        (target_company_id, 'Logística', '#FF33F6'),
        (target_company_id, 'Metal Mecánica', '#F6FF33'),
        (target_company_id, 'Obras Civiles', '#33FFF6'),
        (target_company_id, 'Oficina Técnica', '#9D33FF'),
        (target_company_id, 'RRHH', '#FF9D33'),
        (target_company_id, 'Seguridad', '#FF3333')
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
