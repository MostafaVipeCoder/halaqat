-- Migration: Quran memorization & recitation module (موديول الحفظ والتسميع)
-- Depends on: school_id_migration.sql (students.school_id, profiles.school_id)

-- Step 1: Memorization plan (خطة الحفظ) — one plan per student
CREATE TABLE IF NOT EXISTS memorization_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES school_settings(school_id),
  student_id UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  -- forward: من الفاتحة/البقرة نزولاً ، backward: من الناس صعوداً (الأشهر للأطفال)
  direction TEXT NOT NULL DEFAULT 'backward' CHECK (direction IN ('forward', 'backward')),
  daily_amount NUMERIC(5,2) NOT NULL DEFAULT 1 CHECK (daily_amount > 0),
  amount_unit TEXT NOT NULL DEFAULT 'pages' CHECK (amount_unit IN ('lines', 'pages', 'quarters')),
  daily_review_pages NUMERIC(5,2) NOT NULL DEFAULT 2 CHECK (daily_review_pages >= 0),
  target_juz_count INTEGER CHECK (target_juz_count BETWEEN 1 AND 30),
  target_date DATE,
  -- السور المحفوظة قبل الالتحاق بالمدرسة (أرقام السور 1..114)
  baseline_surahs INTEGER[] NOT NULL DEFAULT '{}',
  notes TEXT,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Recitation sessions (جلسات التسميع)
CREATE TABLE IF NOT EXISTS recitation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES school_settings(school_id),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  -- new: حفظ جديد ، minor_review: مراجعة صغرى (القريب) ، major_review: مراجعة كبرى (البعيد) ، consolidation: تثبيت
  type TEXT NOT NULL CHECK (type IN ('new', 'minor_review', 'major_review', 'consolidation')),
  from_surah SMALLINT NOT NULL CHECK (from_surah BETWEEN 1 AND 114),
  from_ayah SMALLINT NOT NULL CHECK (from_ayah >= 1),
  to_surah SMALLINT NOT NULL CHECK (to_surah BETWEEN 1 AND 114),
  to_ayah SMALLINT NOT NULL CHECK (to_ayah >= 1),
  pages NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (pages >= 0),
  memorization_errors SMALLINT NOT NULL DEFAULT 0 CHECK (memorization_errors >= 0),
  tashkeel_errors SMALLINT NOT NULL DEFAULT 0 CHECK (tashkeel_errors >= 0),
  tajweed_errors SMALLINT NOT NULL DEFAULT 0 CHECK (tajweed_errors >= 0),
  hints SMALLINT NOT NULL DEFAULT 0 CHECK (hints >= 0),
  grade TEXT NOT NULL CHECK (grade IN ('excellent', 'very_good', 'good', 'acceptable', 'repeat')),
  teacher_name TEXT,
  notes TEXT,
  recorded_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 3: Fill school_id from the student so the client never has to send it
CREATE OR REPLACE FUNCTION set_school_id_from_student()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT school_id INTO NEW.school_id FROM students WHERE id = NEW.student_id;
  IF NEW.school_id IS NULL THEN
    RAISE EXCEPTION 'Student % has no school_id', NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_memorization_plans_school ON memorization_plans;
CREATE TRIGGER trg_memorization_plans_school
BEFORE INSERT OR UPDATE OF student_id ON memorization_plans
FOR EACH ROW EXECUTE FUNCTION set_school_id_from_student();

DROP TRIGGER IF EXISTS trg_recitation_sessions_school ON recitation_sessions;
CREATE TRIGGER trg_recitation_sessions_school
BEFORE INSERT OR UPDATE OF student_id ON recitation_sessions
FOR EACH ROW EXECUTE FUNCTION set_school_id_from_student();

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_memorization_plans_updated ON memorization_plans;
CREATE TRIGGER trg_memorization_plans_updated
BEFORE UPDATE ON memorization_plans
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Step 4: Indexes
CREATE INDEX IF NOT EXISTS idx_memorization_plans_school_id ON memorization_plans(school_id);
CREATE INDEX IF NOT EXISTS idx_recitation_sessions_school_date ON recitation_sessions(school_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_recitation_sessions_student ON recitation_sessions(student_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_recitation_sessions_class ON recitation_sessions(class_id);

-- Step 5: RLS — same school-based model as school_id_migration.sql
ALTER TABLE memorization_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE recitation_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "School members can manage memorization plans" ON memorization_plans;
CREATE POLICY "School members can manage memorization plans" ON memorization_plans
FOR ALL
USING (
  school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "School members can manage recitation sessions" ON recitation_sessions;
CREATE POLICY "School members can manage recitation sessions" ON recitation_sessions
FOR ALL
USING (
  school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage all memorization plans" ON memorization_plans;
CREATE POLICY "Admins can manage all memorization plans" ON memorization_plans
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can manage all recitation sessions" ON recitation_sessions;
CREATE POLICY "Admins can manage all recitation sessions" ON recitation_sessions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Step 6: Hardening — trigger-only functions are not callable through the API
ALTER FUNCTION touch_updated_at() SET search_path = public;
REVOKE EXECUTE ON FUNCTION set_school_id_from_student() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION touch_updated_at() FROM PUBLIC, anon, authenticated;
