-- Migration: school staff, editable permissions, and permission-based RLS
-- Depends on: 000_saas_school_baseline.sql, 001_memorization_module.sql
--
-- Model
--   profiles.role       : admin (platform) | manager (school owner, all permissions) | staff
--   profiles.staff_type : accountant | student_affairs | teacher | control | custom (a label + preset)
--   profiles.permissions: the actual grants, edited by the manager
--   Teachers (staff_type = 'teacher') only see students of halaqat where classes.teacher_id = them.
--
-- Permission keys (keep in sync with src/lib/permissions.ts)
--   students.view, students.manage, classes.manage, attendance.record, recitations.record,
--   finance.view, finance.manage, reports.view, exams.grade, exams.manage,
--   staff.manage, settings.manage

-- =========================================================
-- 1. Columns
-- =========================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS staff_type TEXT
  CHECK (staff_type IN ('accountant', 'student_affairs', 'teacher', 'control', 'custom'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS permissions TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE classes ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);

-- =========================================================
-- 2. Invitations: the manager registers an email; the account joins the school on first sign-in
-- =========================================================
CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES school_settings(school_id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  staff_type TEXT NOT NULL CHECK (staff_type IN ('accountant', 'student_affairs', 'teacher', 'control', 'custom')),
  permissions TEXT[] NOT NULL DEFAULT '{}',
  class_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  invited_by UUID DEFAULT auth.uid(),
  accepted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_invitations_pending_email
  ON staff_invitations (lower(email)) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_staff_invitations_school ON staff_invitations(school_id);

-- =========================================================
-- 3. Permission helpers (SECURITY DEFINER: read profiles without recursive RLS)
-- =========================================================
CREATE OR REPLACE FUNCTION has_perm(p TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (
        role IN ('admin', 'manager')
        OR (role IN ('staff', 'accountant') AND is_active AND p = ANY (permissions))
      )
  )
$$;

-- signed-in, belongs to a school, and not deactivated
CREATE OR REPLACE FUNCTION is_active_member()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND school_id IS NOT NULL AND (role = 'manager' OR is_active)
  )
$$;

CREATE OR REPLACE FUNCTION is_scoped_teacher()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'staff' AND staff_type = 'teacher')
$$;

-- a student row is visible to: platform admins, and active members of its school
-- (teachers: only students of their own halaqat)
CREATE OR REPLACE FUNCTION can_see_student(s_school UUID, s_class UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT is_platform_admin()
    OR (
      s_school = current_school_id()
      AND is_active_member()
      AND (
        NOT is_scoped_teacher()
        OR s_class IN (SELECT id FROM classes WHERE teacher_id = auth.uid())
      )
    )
$$;

-- =========================================================
-- 4. Sign-up: join an inviting school, otherwise open a new school (as before)
-- =========================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  inv staff_invitations%ROWTYPE;
  new_school_id UUID;
  display_name TEXT := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name');
BEGIN
  SELECT * INTO inv
  FROM staff_invitations
  WHERE lower(email) = lower(NEW.email) AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO profiles (id, school_id, role, staff_type, permissions, is_active, full_name, email, phone)
    VALUES (NEW.id, inv.school_id, 'staff', inv.staff_type, inv.permissions, true,
            COALESCE(NULLIF(inv.full_name, ''), display_name), NEW.email, NEW.raw_user_meta_data->>'phone');

    UPDATE classes
    SET teacher_id = NEW.id, teacher_name = COALESCE(NULLIF(inv.full_name, ''), display_name)
    WHERE school_id = inv.school_id AND id = ANY (inv.class_ids);

    UPDATE staff_invitations
    SET status = 'accepted', accepted_user_id = NEW.id, accepted_at = now()
    WHERE id = inv.id;

    RETURN NEW;
  END IF;

  INSERT INTO school_settings (user_id, school_name)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data->>'school_name', ''), 'مدرسة تحفيظ'))
  RETURNING school_id INTO new_school_id;

  INSERT INTO profiles (id, school_id, role, full_name, email, phone)
  VALUES (NEW.id, new_school_id, 'manager', display_name, NEW.email, NEW.raw_user_meta_data->>'phone');
  RETURN NEW;
END;
$$;

-- Invitations: fill school_id, normalise email, refuse emails that already have an account
CREATE OR REPLACE FUNCTION prepare_staff_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.school_id IS NULL THEN
    NEW.school_id := current_school_id();
  END IF;
  NEW.email := lower(trim(NEW.email));
  IF TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = NEW.email) THEN
    RAISE EXCEPTION 'EMAIL_ALREADY_REGISTERED' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prepare_staff_invitation ON staff_invitations;
CREATE TRIGGER trg_prepare_staff_invitation
BEFORE INSERT OR UPDATE OF email ON staff_invitations
FOR EACH ROW EXECUTE FUNCTION prepare_staff_invitation();

-- Profiles: nobody but a platform admin changes their own role/permissions/school;
-- a manager editing staff can change staff_type/permissions/is_active but never escalate.
CREATE OR REPLACE FUNCTION protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR is_platform_admin() THEN
    RETURN NEW;
  END IF;

  NEW.school_id := OLD.school_id;
  NEW.email := OLD.email;

  IF NEW.id = auth.uid() THEN
    NEW.role := OLD.role;
    NEW.staff_type := OLD.staff_type;
    NEW.permissions := OLD.permissions;
    NEW.is_active := OLD.is_active;
  ELSE
    NEW.role := OLD.role; -- staff stay staff
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON profiles;
CREATE TRIGGER trg_protect_profile_fields
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION protect_profile_fields();

-- =========================================================
-- 5. Replace school-wide RLS with permission-based RLS
-- =========================================================
-- profiles
DROP POLICY IF EXISTS "Users read own profile" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;

CREATE POLICY "Read own, same-school, or all as admin" ON profiles FOR SELECT
USING (id = auth.uid() OR is_platform_admin() OR (school_id = current_school_id() AND is_active_member()));

CREATE POLICY "Update self, staff (staff.manage), or any as admin" ON profiles FOR UPDATE
USING (
  id = auth.uid() OR is_platform_admin()
  OR (school_id = current_school_id() AND role = 'staff' AND has_perm('staff.manage'))
)
WITH CHECK (
  id = auth.uid() OR is_platform_admin()
  OR (school_id = current_school_id() AND role = 'staff' AND has_perm('staff.manage'))
);

-- school_settings: editing needs settings.manage (status/subscription stay admin-only via trigger)
DROP POLICY IF EXISTS "Owner updates own school" ON school_settings;
CREATE POLICY "Settings managers update own school" ON school_settings FOR UPDATE
USING ((school_id = current_school_id() AND has_perm('settings.manage')) OR is_platform_admin())
WITH CHECK ((school_id = current_school_id() AND has_perm('settings.manage')) OR is_platform_admin());

-- grades & classes: everyone in the school reads; classes.manage writes
DROP POLICY IF EXISTS "School members can manage grades" ON grades;
DROP POLICY IF EXISTS "School members can manage classes" ON classes;

CREATE POLICY "Members read grades" ON grades FOR SELECT
USING ((school_id = current_school_id() AND is_active_member()) OR is_platform_admin());
CREATE POLICY "Class managers write grades" ON grades FOR ALL
USING ((school_id = current_school_id() AND has_perm('classes.manage')) OR is_platform_admin())
WITH CHECK ((school_id = current_school_id() AND has_perm('classes.manage')) OR is_platform_admin());

CREATE POLICY "Members read classes" ON classes FOR SELECT
USING ((school_id = current_school_id() AND is_active_member()) OR is_platform_admin());
CREATE POLICY "Class managers write classes" ON classes FOR ALL
USING ((school_id = current_school_id() AND has_perm('classes.manage')) OR is_platform_admin())
WITH CHECK ((school_id = current_school_id() AND has_perm('classes.manage')) OR is_platform_admin());

-- students: visibility via can_see_student (teacher scope); students.manage writes
DROP POLICY IF EXISTS "School members can manage students" ON students;

CREATE POLICY "Visible students" ON students FOR SELECT
USING (can_see_student(school_id, class_id));
CREATE POLICY "Student managers insert" ON students FOR INSERT
WITH CHECK ((school_id = current_school_id() AND has_perm('students.manage')) OR is_platform_admin());
CREATE POLICY "Student managers update" ON students FOR UPDATE
USING (can_see_student(school_id, class_id) AND has_perm('students.manage'))
WITH CHECK ((school_id = current_school_id() AND has_perm('students.manage')) OR is_platform_admin());
CREATE POLICY "Student managers delete" ON students FOR DELETE
USING (can_see_student(school_id, class_id) AND has_perm('students.manage'));

-- attendance (student visibility comes from the students policy inside the subquery)
DROP POLICY IF EXISTS "School members can manage attendance" ON attendance;

CREATE POLICY "Read attendance of visible students" ON attendance FOR SELECT
USING (student_id IN (SELECT id FROM students));
CREATE POLICY "Record attendance" ON attendance FOR ALL
USING (has_perm('attendance.record') AND student_id IN (SELECT id FROM students))
WITH CHECK (has_perm('attendance.record') AND student_id IN (SELECT id FROM students));

-- payments: finance only
DROP POLICY IF EXISTS "School members can manage payments" ON payments;

CREATE POLICY "Finance reads payments" ON payments FOR SELECT
USING ((has_perm('finance.view') OR has_perm('finance.manage')) AND student_id IN (SELECT id FROM students));
CREATE POLICY "Finance writes payments" ON payments FOR ALL
USING (has_perm('finance.manage') AND student_id IN (SELECT id FROM students))
WITH CHECK (has_perm('finance.manage') AND student_id IN (SELECT id FROM students));

-- suspensions: students.manage writes
DROP POLICY IF EXISTS "School members can manage suspensions" ON suspensions;

CREATE POLICY "Read suspensions of visible students" ON suspensions FOR SELECT
USING (student_id IN (SELECT id FROM students));
CREATE POLICY "Student managers write suspensions" ON suspensions FOR ALL
USING (has_perm('students.manage') AND student_id IN (SELECT id FROM students))
WITH CHECK (has_perm('students.manage') AND student_id IN (SELECT id FROM students));

-- memorization: recitations.record writes
DROP POLICY IF EXISTS "School members can manage memorization plans" ON memorization_plans;
DROP POLICY IF EXISTS "Admins can manage all memorization plans" ON memorization_plans;
DROP POLICY IF EXISTS "School members can manage recitation sessions" ON recitation_sessions;
DROP POLICY IF EXISTS "Admins can manage all recitation sessions" ON recitation_sessions;

CREATE POLICY "Read plans of visible students" ON memorization_plans FOR SELECT
USING (student_id IN (SELECT id FROM students));
CREATE POLICY "Reciters write plans" ON memorization_plans FOR ALL
USING (has_perm('recitations.record') AND student_id IN (SELECT id FROM students))
WITH CHECK (has_perm('recitations.record') AND student_id IN (SELECT id FROM students));

CREATE POLICY "Read sessions of visible students" ON recitation_sessions FOR SELECT
USING (student_id IN (SELECT id FROM students));
CREATE POLICY "Reciters write sessions" ON recitation_sessions FOR ALL
USING (has_perm('recitations.record') AND student_id IN (SELECT id FROM students))
WITH CHECK (has_perm('recitations.record') AND student_id IN (SELECT id FROM students));

-- staff invitations
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff managers handle invitations" ON staff_invitations FOR ALL
USING ((school_id = current_school_id() AND has_perm('staff.manage')) OR is_platform_admin())
WITH CHECK ((school_id = current_school_id() AND has_perm('staff.manage')) OR is_platform_admin());

-- =========================================================
-- 6. Hardening
-- =========================================================
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION prepare_staff_invitation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION protect_profile_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION has_perm(TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION is_active_member() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION is_scoped_teacher() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION can_see_student(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION has_perm(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_active_member() TO authenticated;
GRANT EXECUTE ON FUNCTION is_scoped_teacher() TO authenticated;
GRANT EXECUTE ON FUNCTION can_see_student(UUID, UUID) TO authenticated;
