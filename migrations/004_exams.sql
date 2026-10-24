-- Migration: exams, grading and control (الامتحانات ورصد الدرجات والكونترول)
-- Depends on: 002_staff_permissions.sql
--
-- Lifecycle (status):
--   draft    → control prepares the exam (criteria can still change)
--   grading  → graders (exams.grade) enter marks for students they can see
--   review   → only control (exams.manage) edits; every change is logged
--   approved → results are locked; control can still correct a mark, but a reason is required and logged

CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES school_settings(school_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'monthly'
    CHECK (exam_type IN ('monthly', 'juz_completion', 'term', 'placement', 'khatma')),
  exam_date DATE NOT NULL DEFAULT CURRENT_DATE,
  class_ids UUID[] NOT NULL DEFAULT '{}',
  scope TEXT,
  -- [{ "key": "hifz", "label": "الحفظ", "max": 60 }, ...]
  criteria JSONB NOT NULL DEFAULT '[{"key":"hifz","label":"الحفظ","max":60},{"key":"tajweed","label":"التجويد","max":25},{"key":"adaa","label":"الأداء","max":15}]',
  pass_percent NUMERIC(5,2) NOT NULL DEFAULT 50 CHECK (pass_percent BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'grading', 'review', 'approved')),
  created_by UUID DEFAULT auth.uid(),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES school_settings(school_id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  scores JSONB NOT NULL DEFAULT '{}',
  is_absent BOOLEAN NOT NULL DEFAULT false,
  total NUMERIC(6,2) NOT NULL DEFAULT 0,
  percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  grade TEXT,
  notes TEXT,
  -- required when changing a result of an approved exam; copied into exam_result_changes
  change_reason TEXT,
  graded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS exam_result_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES exam_results(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES school_settings(school_id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  exam_status TEXT NOT NULL,
  old_scores JSONB,
  new_scores JSONB,
  old_total NUMERIC(6,2),
  new_total NUMERIC(6,2),
  old_absent BOOLEAN,
  new_absent BOOLEAN,
  reason TEXT,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exams_school_date ON exams(school_id, exam_date DESC);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_result_changes_exam ON exam_result_changes(exam_id, changed_at DESC);

-- =========================================================
-- Exams: school id, timestamps, lifecycle rules
-- =========================================================
CREATE OR REPLACE FUNCTION prepare_exam()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.school_id IS NULL THEN
      NEW.school_id := current_school_id();
    END IF;
    RETURN NEW;
  END IF;

  NEW.updated_at := now();
  NEW.school_id := OLD.school_id;

  IF NEW.criteria IS DISTINCT FROM OLD.criteria
     AND EXISTS (SELECT 1 FROM exam_results WHERE exam_id = OLD.id) THEN
    RAISE EXCEPTION 'CRITERIA_LOCKED' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    NEW.approved_by := auth.uid();
    NEW.approved_at := now();
  ELSIF NEW.status <> 'approved' THEN
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prepare_exam ON exams;
CREATE TRIGGER trg_prepare_exam
BEFORE INSERT OR UPDATE ON exams
FOR EACH ROW EXECUTE FUNCTION prepare_exam();

-- =========================================================
-- Results: validate against criteria, compute total/percent/grade, enforce lifecycle
-- =========================================================
CREATE OR REPLACE FUNCTION prepare_exam_result()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  ex exams%ROWTYPE;
  c JSONB;
  v NUMERIC;
  total NUMERIC := 0;
  max_total NUMERIC := 0;
  pct NUMERIC;
  is_control BOOLEAN := has_perm('exams.manage');
BEGIN
  SELECT * INTO ex FROM exams WHERE id = NEW.exam_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exam % not found', NEW.exam_id;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF ex.status = 'draft' THEN
      RAISE EXCEPTION 'EXAM_NOT_OPEN' USING ERRCODE = 'P0001';
    END IF;
    IF ex.status IN ('review', 'approved') AND NOT is_control THEN
      RAISE EXCEPTION 'EXAM_LOCKED' USING ERRCODE = 'P0001';
    END IF;
    IF ex.status = 'approved' AND TG_OP = 'UPDATE' AND COALESCE(trim(NEW.change_reason), '') = '' THEN
      RAISE EXCEPTION 'CHANGE_REASON_REQUIRED' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  NEW.school_id := ex.school_id;

  FOR c IN SELECT * FROM jsonb_array_elements(ex.criteria) LOOP
    max_total := max_total + (c->>'max')::NUMERIC;
    IF NOT NEW.is_absent THEN
      v := COALESCE((NEW.scores->>(c->>'key'))::NUMERIC, 0);
      IF v < 0 OR v > (c->>'max')::NUMERIC THEN
        RAISE EXCEPTION 'SCORE_OUT_OF_RANGE:%', c->>'label' USING ERRCODE = 'P0001';
      END IF;
      total := total + v;
    END IF;
  END LOOP;

  IF NEW.is_absent THEN
    NEW.scores := '{}';
    NEW.total := 0;
    NEW.percent := 0;
    NEW.grade := 'غائب';
  ELSE
    pct := CASE WHEN max_total > 0 THEN round(total / max_total * 100, 2) ELSE 0 END;
    NEW.total := total;
    NEW.percent := pct;
    NEW.grade := CASE
      WHEN pct < ex.pass_percent THEN 'راسب'
      WHEN pct >= 90 THEN 'ممتاز'
      WHEN pct >= 80 THEN 'جيد جدًا'
      WHEN pct >= 65 THEN 'جيد'
      ELSE 'مقبول'
    END;
  END IF;

  IF TG_OP = 'INSERT'
     OR NEW.scores IS DISTINCT FROM OLD.scores
     OR NEW.is_absent IS DISTINCT FROM OLD.is_absent THEN
    NEW.graded_by := auth.uid();
    NEW.graded_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prepare_exam_result ON exam_results;
CREATE TRIGGER trg_prepare_exam_result
BEFORE INSERT OR UPDATE ON exam_results
FOR EACH ROW EXECUTE FUNCTION prepare_exam_result();

-- Log every mark change once the exam left the grading phase
CREATE OR REPLACE FUNCTION log_exam_result_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  st TEXT;
BEGIN
  SELECT status INTO st FROM exams WHERE id = NEW.exam_id;
  IF st IN ('review', 'approved')
     AND (NEW.scores IS DISTINCT FROM OLD.scores OR NEW.is_absent IS DISTINCT FROM OLD.is_absent) THEN
    INSERT INTO exam_result_changes (result_id, exam_id, school_id, student_id, exam_status,
      old_scores, new_scores, old_total, new_total, old_absent, new_absent, reason, changed_by)
    VALUES (NEW.id, NEW.exam_id, NEW.school_id, NEW.student_id, st,
      OLD.scores, NEW.scores, OLD.total, NEW.total, OLD.is_absent, NEW.is_absent, NEW.change_reason, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_exam_result_change ON exam_results;
CREATE TRIGGER trg_log_exam_result_change
AFTER UPDATE ON exam_results
FOR EACH ROW EXECUTE FUNCTION log_exam_result_change();

-- =========================================================
-- RLS
-- =========================================================
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_result_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read exams" ON exams FOR SELECT
USING ((school_id = current_school_id() AND is_active_member()) OR is_platform_admin());
CREATE POLICY "Control creates exams" ON exams FOR INSERT
WITH CHECK ((school_id = current_school_id() AND has_perm('exams.manage')) OR is_platform_admin());
CREATE POLICY "Control updates exams" ON exams FOR UPDATE
USING ((school_id = current_school_id() AND has_perm('exams.manage')) OR is_platform_admin())
WITH CHECK ((school_id = current_school_id() AND has_perm('exams.manage')) OR is_platform_admin());
CREATE POLICY "Control deletes draft exams" ON exams FOR DELETE
USING (((school_id = current_school_id() AND has_perm('exams.manage')) OR is_platform_admin()) AND status = 'draft');

CREATE POLICY "Read results of visible students" ON exam_results FOR SELECT
USING (student_id IN (SELECT id FROM students)
       AND (has_perm('exams.grade') OR has_perm('exams.manage') OR has_perm('reports.view') OR has_perm('students.view')));
CREATE POLICY "Graders insert results" ON exam_results FOR INSERT
WITH CHECK ((has_perm('exams.grade') OR has_perm('exams.manage')) AND student_id IN (SELECT id FROM students));
CREATE POLICY "Graders update results" ON exam_results FOR UPDATE
USING ((has_perm('exams.grade') OR has_perm('exams.manage')) AND student_id IN (SELECT id FROM students))
WITH CHECK ((has_perm('exams.grade') OR has_perm('exams.manage')) AND student_id IN (SELECT id FROM students));
CREATE POLICY "Control deletes results" ON exam_results FOR DELETE
USING (has_perm('exams.manage') AND student_id IN (SELECT id FROM students));

-- the change log is written only by the trigger
CREATE POLICY "Control reads change log" ON exam_result_changes FOR SELECT
USING ((school_id = current_school_id() AND (has_perm('exams.manage') OR has_perm('reports.view'))) OR is_platform_admin());

REVOKE EXECUTE ON FUNCTION prepare_exam() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION prepare_exam_result() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION log_exam_result_change() FROM PUBLIC, anon, authenticated;
