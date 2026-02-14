-- Enable Row Level Security on sensitive tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- 1. PROFILES POLICIES
-- =========================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (
  auth.uid() = id
);

-- Admins and Supervisors can view all profiles
CREATE POLICY "Admins/Supervisors view all profiles" ON profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'supervisor')
  )
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (
  auth.uid() = id
);

-- =========================================================
-- 2. TIME RECORDS POLICIES
-- =========================================================

-- Users can view their own time records
CREATE POLICY "Users view own time records" ON time_records
FOR SELECT USING (
  created_by = auth.uid()
);

-- Admins and Supervisors can view all time records
CREATE POLICY "Admins/Supervisors view all times" ON time_records
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'supervisor')
  )
);

-- Authenticated users can insert time records
CREATE POLICY "Users create time records" ON time_records
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- Users can update their own time records (optional, usually only admins edit)
-- For now, restricting updates to Admins/Supervisors
CREATE POLICY "Admins/Supervisors update time records" ON time_records
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'supervisor')
  )
);

-- =========================================================
-- 3. DAILY REPORTS POLICIES
-- =========================================================

-- Users can view their own reports
CREATE POLICY "Users view own reports" ON daily_reports
FOR SELECT USING (
  created_by = auth.uid()
);

-- Admins and Supervisors can view all reports
CREATE POLICY "Admins/Supervisors view all reports" ON daily_reports
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'supervisor')
  )
);

-- Authenticated users can insert reports
CREATE POLICY "Users create reports" ON daily_reports
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- Admins/Supervisors can update/delete reports
CREATE POLICY "Admins/Supervisors manage reports" ON daily_reports
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'supervisor')
  )
);

-- =========================================================
-- 4. USER ROLES POLICIES
-- =========================================================

-- Users can read their own role
CREATE POLICY "Users view own role" ON user_roles
FOR SELECT USING (
  user_id = auth.uid()
);

-- Admins can view/manage all roles
CREATE POLICY "Admins manage roles" ON user_roles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- Supervisors can view roles (read-only)
CREATE POLICY "Supervisors view roles" ON user_roles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'supervisor'
  )
);

-- =========================================================
-- 5. FUNCTION & EMPLOYEES POLICIES (Read-only for most)
-- =========================================================
-- Allow read access to job_functions and teams for all authenticated users
ALTER TABLE job_functions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view functions" ON job_functions FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users view teams" ON teams FOR SELECT USING (auth.role() = 'authenticated');

-- Employees table might be sensitive? 
-- Let's say: Auth users can view (to pick in lists), but only Admins/Supervisors manage.
CREATE POLICY "Auth users view employees" ON employees FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins/Supervisors manage employees" ON employees FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'supervisor')
  )
);
