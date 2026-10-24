// Database Types
export interface Profile {
    id: string;
    school_id: string;
    role: 'admin' | 'manager' | 'staff' | 'accountant';
    full_name: string;
    email: string;
    created_at: string;
    permissions?: string[];
}

export interface SchoolSettings {
    school_id: string;
    school_name: string;
    subscription_type: string;
    status: 'active' | 'suspended';
    created_at: string;
    updated_at: string;
}

export interface Grade {
    id: string;
    user_id?: string;
    school_id?: string;
    name: string;
    stage: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

export interface Class {
    id: string;
    user_id?: string;
    school_id?: string;
    name: string;
    grade_level: string;
    stage: string;
    capacity: number;
    teacher_name?: string;
    teacher_id?: string | null;
    grade_id?: string | null;
    slug?: string;
    attendance_type?: 'daily' | 'scheduled';
    attendance_days?: string[];
    created_at: string;
    updated_at: string;
    grade?: Grade;
}

export interface Student {
    id: string;
    user_id?: string;
    school_id?: string;
    name: string;
    phone: string;
    email?: string;
    class_id?: string;
    guardian_name: string;
    guardian_phone: string;
    payment_status: 'regular' | 'exempt';
    slug?: string;
    status?: 'active' | 'suspended' | 'expelled';
    created_at: string;
    updated_at: string;
    class?: Class;
}

export interface Attendance {
    id: string;
    user_id: string;
    student_id: string;
    date: string;
    present: boolean;
    notes?: string;
    created_at: string;
}

export interface Payment {
    id: string;
    user_id: string;
    student_id: string;
    amount: number;
    month: string;
    year: number;
    status: 'paid' | 'unpaid' | 'partial';
    payment_date?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

// Memorization Types (الحفظ والتسميع)
export type RecitationType = 'new' | 'minor_review' | 'major_review' | 'consolidation';
export type RecitationGrade = 'excellent' | 'very_good' | 'good' | 'acceptable' | 'repeat';

export interface RecitationSession {
    id: string;
    school_id: string;
    student_id: string;
    class_id?: string | null;
    session_date: string;
    type: RecitationType;
    from_surah: number;
    from_ayah: number;
    to_surah: number;
    to_ayah: number;
    pages: number;
    memorization_errors: number;
    tashkeel_errors: number;
    tajweed_errors: number;
    hints: number;
    grade: RecitationGrade;
    teacher_name?: string | null;
    notes?: string | null;
    recorded_by?: string;
    created_at: string;
    students?: {
        id: string;
        name: string;
        class_id?: string;
        classes?: { name: string } | null;
    } | null;
}

export interface MemorizationPlan {
    id: string;
    school_id: string;
    student_id: string;
    direction: 'forward' | 'backward';
    daily_amount: number;
    amount_unit: 'lines' | 'pages' | 'quarters';
    daily_review_pages: number;
    target_juz_count?: number | null;
    target_date?: string | null;
    baseline_surahs: number[];
    notes?: string | null;
    created_at: string;
    updated_at: string;
}

// Exam Types (الامتحانات والكونترول)
export type ExamStatus = 'draft' | 'grading' | 'review' | 'approved';
export type ExamType = 'monthly' | 'juz_completion' | 'term' | 'placement' | 'khatma';

export interface ExamCriterion {
    key: string;
    label: string;
    max: number;
}

export interface Exam {
    id: string;
    school_id: string;
    title: string;
    exam_type: ExamType;
    exam_date: string;
    class_ids: string[];
    scope: string | null;
    criteria: ExamCriterion[];
    pass_percent: number;
    status: ExamStatus;
    created_by: string | null;
    approved_by: string | null;
    approved_at: string | null;
    created_at: string;
}

export interface ExamResult {
    id: string;
    exam_id: string;
    student_id: string;
    scores: Record<string, number>;
    is_absent: boolean;
    total: number;
    percent: number;
    grade: string | null;
    notes: string | null;
    graded_by: string | null;
    graded_at: string;
}

export interface ExamResultChange {
    id: string;
    result_id: string;
    student_id: string;
    exam_status: ExamStatus;
    old_total: number | null;
    new_total: number | null;
    old_absent: boolean | null;
    new_absent: boolean | null;
    reason: string | null;
    changed_at: string;
    students?: { name: string } | null;
    changer?: { full_name: string | null } | null;
}

// Admin Types
export interface AdminStats {
    totalSchools: number;
    totalStudents: number;
    totalUsers: number;
    monthlyRevenue: number;
}

export interface SchoolOverview {
    id: string;
    school_id: string;
    school_name: string;
    owner_name: string;
    owner_email: string;
    student_count: number;
    subscription_type: string;
    status: 'active' | 'suspended';
    created_at: string;
    discount?: number;
}

// UI Types
export type UserRole = 'admin' | 'manager' | 'staff' | 'accountant';

export interface MenuItem {
    name: string;
    icon: any; // lucide-react icon component
    path: string;
    roles?: UserRole[];
}
