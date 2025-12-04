-- Create whatsapp_logs table
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    instance_name TEXT,
    remote_jid TEXT,
    phone TEXT,
    message_content TEXT,
    status TEXT, -- 'success', 'ignored', 'unauthorized', 'error'
    error_details TEXT,
    company_id UUID REFERENCES public.company(id),
    participant_id UUID REFERENCES public.participants(id),
    metadata JSONB -- Store extra info like candidates, message type, etc.
);

-- Enable RLS
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins can view logs for their company
CREATE POLICY "Admins can view logs for their company" ON public.whatsapp_logs
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.participants 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Service role can insert logs (Edge Function uses service role)
CREATE POLICY "Service role can insert logs" ON public.whatsapp_logs
    FOR INSERT
    WITH CHECK (true);

-- Service role can select logs (for debugging if needed)
CREATE POLICY "Service role can select logs" ON public.whatsapp_logs
    FOR SELECT
    USING (true);
