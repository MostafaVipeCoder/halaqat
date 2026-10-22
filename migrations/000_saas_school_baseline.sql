-- Baseline schema for a FRESH SaaS School Supabase project.
-- Reconstructed from what the app code reads/writes (the old project's schema lived only in its dashboard).
-- Run order on a new project: 000_saas_school_baseline.sql → memorization_module.sql
-- (school_id_migration.sql is only for upgrading the legacy per-user database; do NOT run it here.)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- 1. Tenancy: schools (school_settings) and users (profiles)
-- =========================================================
CREATE TABLE IF NOT EXISTS school_settings (
  school_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL, -- school owner (settingsService reads by user_id)
  school_name TEXT NOT NULL DEFAULT 'مدرسة تحفيظ',
  subscription_type TEXT NOT NULL DEFAULT 'أساسية',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  available_stages TEXT[] NOT NULL DEFAULT ARRAY['تمهيدي', 'مبتدئ', 'متوسط', 'متقدم'],
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  cancel_requested BOOLEAN NOT NULL DEFAULT false,
  expiry_date TIMESTAMPTZ DEFAULT (now() + INTERVAL '1 year'),
  work_start_time TEXT NOT NULL DEFAULT '08:00',
  work_end_time TEXT NOT NULL DEFAULT '14:00',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES school_settings(school_id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('admin', 'manager', 'staff', 'accountant')),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_school_id ON profiles(school_id);

-- Helpers used by RLS. SECURITY DEFINER avoids recursive RLS on profiles.
CREATE OR REPLACE FUNCTION current_school_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT school_id FROM profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION current_profile_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') $$;

-- Onboarding: every new sign-up gets its own school + a manager profile
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_school_id UUID;
BEGIN
  INSERT INTO school_settings (user_id, school_name)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'school_name', ''), 'مدرسة تحفيظ'))
  RETURNING school_id INTO new_school_id;

  INSERT INTO profiles (id, school_id, role, full_name, email, phone)
  VALUES (
    NEW.id,
    new_school_id,
    'manager',
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fill school_id from the signed-in user's profile when the client does not send it
CREATE OR REPLACE FUNCTION set_school_id_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.school_id IS NULL THEN
    NEW.school_id := current_school_id();
  END IF;
  IF NEW.school_id IS NULL THEN
    RAISE EXCEPTION 'No school found for the current user';
  END IF;
  RETURN NEW;
END;
$$;

-- =========================================================
-- 2. Academic core
-- =========================================================
CREATE TABLE IF NOT EXISTS grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  school_id UUID NOT NULL REFERENCES school_settings(school_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stage TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  school_id UUID NOT NULL REFERENCES school_settings(school_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  stage TEXT NOT NULL,
  capacity INTEGER DEFAULT 30,
  teacher_name TEXT,
  grade_id UUID REFERENCES grades(id),
  slug TEXT,
  attendance_type TEXT NOT NULL DEFAULT 'daily' CHECK (attendance_type IN ('daily', 'scheduled')),
  attendance_days TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  school_id UUID NOT NULL REFERENCES school_settings(school_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  class_id UUID REFERENCES classes(id),
  guardian_name TEXT NOT NULL,
  guardian_phone TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'regular' CHECK (payment_status IN ('regular', 'exempt')),
  slug TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  present BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'partial')),
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('warning', 'suspension', 'expulsion', 'parent_notification')),
  duration_days INTEGER,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  reason TEXT NOT NULL,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_grades_school ON grades;
CREATE TRIGGER trg_grades_school BEFORE INSERT ON grades FOR EACH ROW EXECUTE FUNCTION set_school_id_from_profile();
DROP TRIGGER IF EXISTS trg_classes_school ON classes;
CREATE TRIGGER trg_classes_school BEFORE INSERT ON classes FOR EACH ROW EXECUTE FUNCTION set_school_id_from_profile();
DROP TRIGGER IF EXISTS trg_students_school ON students;
CREATE TRIGGER trg_students_school BEFORE INSERT ON students FOR EACH ROW EXECUTE FUNCTION set_school_id_from_profile();

DROP TRIGGER IF EXISTS trg_school_settings_updated ON school_settings;
CREATE TRIGGER trg_school_settings_updated BEFORE UPDATE ON school_settings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS trg_grades_updated ON grades;
CREATE TRIGGER trg_grades_updated BEFORE UPDATE ON grades FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS trg_classes_updated ON classes;
CREATE TRIGGER trg_classes_updated BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS trg_students_updated ON students;
CREATE TRIGGER trg_students_updated BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS trg_payments_updated ON payments;
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_grades_school_id ON grades(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_slug ON students(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_suspensions_student_id ON suspensions(student_id);

-- =========================================================
-- 3. Platform (super-admin) tables
-- =========================================================
CREATE TABLE IF NOT EXISTS subscription_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  student_limit INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS school_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES school_settings(school_id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'cancelled')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS school_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES school_settings(school_id) ON DELETE CASCADE,
  discount_percentage NUMERIC(5,2) NOT NULL CHECK (discount_percentage BETWEEN 0 AND 100),
  expiry_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  announcement_message TEXT,
  system_email TEXT,
  support_phone TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- single settings row (adminService.getPlatformSettings uses .single())
INSERT INTO platform_settings (maintenance_mode)
SELECT false WHERE NOT EXISTS (SELECT 1 FROM platform_settings);

INSERT INTO subscription_packages (name, price, description, student_limit) VALUES
  ('أساسية', 299, 'حتى 100 طالب — الطلاب والحلقات والحضور والتسميع', 100),
  ('متقدمة', 599, 'حتى 500 طالب — كل المميزات الأساسية + التقارير المتقدمة', 500),
  ('شاملة', 999, 'عدد غير محدود من الطلاب — كل المميزات', NULL)
ON CONFLICT (name) DO NOTHING;

-- Student counts per school for the admin customers page
CREATE OR REPLACE FUNCTION get_school_student_counts()
RETURNS TABLE (school_id UUID, student_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.school_id, COUNT(*)::BIGINT
  FROM students s
  WHERE is_platform_admin()
  GROUP BY s.school_id
$$;

-- =========================================================
-- 4. Row Level Security
-- =========================================================
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- profiles: own row; admins see all. Role/school changes only by admins.
DROP POLICY IF EXISTS "Users read own profile" ON profiles;
CREATE POLICY "Users read own profile" ON profiles FOR SELECT
USING (id = auth.uid() OR is_platform_admin());

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE
USING (id = auth.uid() OR is_platform_admin())
WITH CHECK (
  is_platform_admin()
  OR (id = auth.uid() AND role = current_profile_role()
      AND school_id IS NOT DISTINCT FROM current_school_id())
);

-- school_settings: members read their school; owner/manager updates; admins everything.
-- status (suspension) and subscription_type are changed by admins only.
DROP POLICY IF EXISTS "Members read own school" ON school_settings;
CREATE POLICY "Members read own school" ON school_settings FOR SELECT
USING (school_id = current_school_id() OR is_platform_admin());

DROP POLICY IF EXISTS "Owner updates own school" ON school_settings;
CREATE POLICY "Owner updates own school" ON school_settings FOR UPDATE
USING (school_id = current_school_id() OR is_platform_admin())
WITH CHECK (school_id = current_school_id() OR is_platform_admin());

DROP POLICY IF EXISTS "Admins insert schools" ON school_settings;
CREATE POLICY "Admins insert schools" ON school_settings FOR INSERT
WITH CHECK (is_platform_admin());

CREATE OR REPLACE FUNCTION protect_school_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT is_platform_admin() THEN
    NEW.status := OLD.status;
    NEW.subscription_type := OLD.subscription_type;
    NEW.expiry_date := OLD.expiry_date;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_school_admin_fields ON school_settings;
CREATE TRIGGER trg_protect_school_admin_fields BEFORE UPDATE ON school_settings
FOR EACH ROW EXECUTE FUNCTION protect_school_admin_fields();

-- school-scoped tables
DROP POLICY IF EXISTS "School members can manage grades" ON grades;
CREATE POLICY "School members can manage grades" ON grades FOR ALL
USING (school_id = current_school_id() OR is_platform_admin())
WITH CHECK (school_id = current_school_id() OR is_platform_admin());

DROP POLICY IF EXISTS "School members can manage classes" ON classes;
CREATE POLICY "School members can manage classes" ON classes FOR ALL
USING (school_id = current_school_id() OR is_platform_admin())
WITH CHECK (school_id = current_school_id() OR is_platform_admin());

DROP POLICY IF EXISTS "School members can manage students" ON students;
CREATE POLICY "School members can manage students" ON students FOR ALL
USING (school_id = current_school_id() OR is_platform_admin())
WITH CHECK (school_id = current_school_id() OR is_platform_admin());

DROP POLICY IF EXISTS "School members can manage attendance" ON attendance;
CREATE POLICY "School members can manage attendance" ON attendance FOR ALL
USING (is_platform_admin() OR student_id IN (SELECT id FROM students WHERE school_id = current_school_id()))
WITH CHECK (is_platform_admin() OR student_id IN (SELECT id FROM students WHERE school_id = current_school_id()));

DROP POLICY IF EXISTS "School members can manage payments" ON payments;
CREATE POLICY "School members can manage payments" ON payments FOR ALL
USING (is_platform_admin() OR student_id IN (SELECT id FROM students WHERE school_id = current_school_id()))
WITH CHECK (is_platform_admin() OR student_id IN (SELECT id FROM students WHERE school_id = current_school_id()));

DROP POLICY IF EXISTS "School members can manage suspensions" ON suspensions;
CREATE POLICY "School members can manage suspensions" ON suspensions FOR ALL
USING (is_platform_admin() OR student_id IN (SELECT id FROM students WHERE school_id = current_school_id()))
WITH CHECK (is_platform_admin() OR student_id IN (SELECT id FROM students WHERE school_id = current_school_id()));

-- platform tables
DROP POLICY IF EXISTS "Anyone signed in reads packages" ON subscription_packages;
CREATE POLICY "Anyone signed in reads packages" ON subscription_packages FOR SELECT
USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admins manage packages" ON subscription_packages;
CREATE POLICY "Admins manage packages" ON subscription_packages FOR ALL
USING (is_platform_admin()) WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "Schools read own invoices" ON school_invoices;
CREATE POLICY "Schools read own invoices" ON school_invoices FOR SELECT
USING (school_id = current_school_id() OR is_platform_admin());
DROP POLICY IF EXISTS "Admins manage invoices" ON school_invoices;
CREATE POLICY "Admins manage invoices" ON school_invoices FOR ALL
USING (is_platform_admin()) WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "Schools read own discounts" ON school_discounts;
CREATE POLICY "Schools read own discounts" ON school_discounts FOR SELECT
USING (school_id = current_school_id() OR is_platform_admin());
DROP POLICY IF EXISTS "Admins manage discounts" ON school_discounts;
CREATE POLICY "Admins manage discounts" ON school_discounts FOR ALL
USING (is_platform_admin()) WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "Anyone signed in reads platform settings" ON platform_settings;
CREATE POLICY "Anyone signed in reads platform settings" ON platform_settings FOR SELECT
USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admins manage platform settings" ON platform_settings;
CREATE POLICY "Admins manage platform settings" ON platform_settings FOR ALL
USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- =========================================================
-- 5. Hardening (Supabase security advisor)
-- =========================================================
ALTER FUNCTION touch_updated_at() SET search_path = public;

-- Trigger-only functions: nobody calls them through the API
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION set_school_id_from_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION protect_school_admin_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION touch_updated_at() FROM PUBLIC, anon, authenticated;

-- RLS helpers + admin RPC: signed-in users only
REVOKE EXECUTE ON FUNCTION current_school_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION current_profile_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION is_platform_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_school_student_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION current_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION current_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_school_student_counts() TO authenticated;
