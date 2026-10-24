-- Migration: weekly teachers' schedule (جدول المعلمين)
-- Depends on: 002_staff_permissions.sql

CREATE TABLE IF NOT EXISTS class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES school_settings(school_id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  -- NULL means "the halaqa's teacher"
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- 0 = Sunday ... 6 = Saturday (same as JavaScript Date.getDay)
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_class_schedules_school_day ON class_schedules(school_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_class_schedules_teacher ON class_schedules(teacher_id);

CREATE OR REPLACE FUNCTION set_school_id_from_class()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  SELECT school_id INTO NEW.school_id FROM classes WHERE id = NEW.class_id;
  IF NEW.school_id IS NULL THEN
    RAISE EXCEPTION 'Class % not found', NEW.class_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_class_schedules_school ON class_schedules;
CREATE TRIGGER trg_class_schedules_school
BEFORE INSERT OR UPDATE OF class_id ON class_schedules
FOR EACH ROW EXECUTE FUNCTION set_school_id_from_class();

ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read schedule" ON class_schedules FOR SELECT
USING ((school_id = current_school_id() AND is_active_member()) OR is_platform_admin());
CREATE POLICY "Class managers write schedule" ON class_schedules FOR ALL
USING ((school_id = current_school_id() AND has_perm('classes.manage')) OR is_platform_admin())
WITH CHECK ((school_id = current_school_id() AND has_perm('classes.manage')) OR is_platform_admin());

REVOKE EXECUTE ON FUNCTION set_school_id_from_class() FROM PUBLIC, anon, authenticated;
