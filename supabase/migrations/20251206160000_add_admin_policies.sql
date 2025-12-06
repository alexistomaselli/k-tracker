-- Allow platform admins to view all projects
-- Check if policy exists first to avoid error (optional, but good practice if running manually)
-- For Supabase migrations, usually we just define it. If it fails due to existence, we can drop first.

DROP POLICY IF EXISTS "Admins can view all projects" ON project;

CREATE POLICY "Admins can view all projects"
ON project
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  )
);

-- Allow platform admins to view all companies
DROP POLICY IF EXISTS "Admins can view all companies" ON company;

CREATE POLICY "Admins can view all companies"
ON company
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  )
);
