-- Function to get admin dashboard stats securely
-- This function runs with SECURITY DEFINER to bypass RLS, but checks for admin role internally

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_companies integer;
  active_companies integer;
  total_projects integer;
  total_revenue numeric;
  is_admin boolean;
BEGIN
  -- 1. Check if the user is an admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  ) INTO is_admin;

  IF NOT is_admin THEN
    RAISE EXCEPTION 'Access denied. User is not an admin.';
  END IF;

  -- 2. Get Counts
  SELECT count(*) INTO total_companies FROM company;
  SELECT count(*) INTO active_companies FROM company WHERE approval_status = 'approved';
  SELECT count(*) INTO total_projects FROM project;
  
  -- 3. Get Revenue (sum of approved payments)
  SELECT COALESCE(SUM(amount), 0) INTO total_revenue FROM payments WHERE status = 'approved';

  -- 4. Return JSON
  RETURN json_build_object(
    'totalCompanies', total_companies,
    'activeCompanies', active_companies,
    'totalProjects', total_projects,
    'totalRevenue', total_revenue
  );
END;
$$;
