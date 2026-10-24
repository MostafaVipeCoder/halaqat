import { supabase } from '../lib/supabase';
import type { Exam, ExamResult, ExamResultChange, ExamStatus } from '../types';

export type ExamInput = Pick<Exam, 'title' | 'exam_type' | 'exam_date' | 'class_ids' | 'scope' | 'criteria' | 'pass_percent'>;

export interface ResultInput {
    exam_id: string;
    student_id: string;
    scores: Record<string, number>;
    is_absent: boolean;
    notes: string | null;
    change_reason?: string | null;
}

/** تحويل أخطاء قاعدة البيانات (triggers) لرسائل مفهومة */
export const examErrorMessage = (error: { message?: string }) => {
    const m = error.message || '';
    if (m.includes('EXAM_NOT_OPEN')) return 'الامتحان لم يُفتح للرصد بعد';
    if (m.includes('EXAM_LOCKED')) return 'انتهت فترة الرصد — التعديل الآن للكونترول فقط';
    if (m.includes('CHANGE_REASON_REQUIRED')) return 'تعديل نتيجة معتمدة يتطلب كتابة سبب التعديل';
    if (m.includes('SCORE_OUT_OF_RANGE')) return `درجة "${m.split('SCORE_OUT_OF_RANGE:')[1]?.split(/["\s]/)[0] ?? ''}" أكبر من الدرجة العظمى`;
    if (m.includes('CRITERIA_LOCKED')) return 'لا يمكن تغيير بنود الدرجات بعد بدء الرصد';
    if (m.includes('row-level security')) return 'ليس لديك صلاحية لهذا الإجراء';
    return m || 'حدث خطأ غير متوقع';
};

const fail = (error: { message?: string }) => { throw new Error(examErrorMessage(error)); };

export const examService = {
    async getExams() {
        const { data, error } = await supabase.from('exams').select('*').order('exam_date', { ascending: false });
        if (error) fail(error);
        return data as Exam[];
    },

    /** ملخص الدرجات لكل الامتحانات (للقائمة) */
    async getResultSummaries() {
        const { data, error } = await supabase.from('exam_results').select('exam_id, percent, grade, is_absent');
        if (error) fail(error);
        return data as Pick<ExamResult, 'exam_id' | 'percent' | 'grade' | 'is_absent'>[];
    },

    async getExam(id: string) {
        const { data, error } = await supabase.from('exams').select('*').eq('id', id).single();
        if (error) fail(error);
        return data as Exam;
    },

    async getResults(examId: string) {
        const { data, error } = await supabase.from('exam_results').select('*').eq('exam_id', examId);
        if (error) fail(error);
        return data as ExamResult[];
    },

    async getChanges(examId: string) {
        const { data, error } = await supabase
            .from('exam_result_changes')
            .select('*, students ( name ), changer:profiles!exam_result_changes_changed_by_fkey ( full_name )')
            .eq('exam_id', examId)
            .order('changed_at', { ascending: false });
        if (error) fail(error);
        return data as ExamResultChange[];
    },

    /** نتائج الطالب في الامتحانات المعتمدة */
    async getStudentResults(studentId: string) {
        const { data, error } = await supabase
            .from('exam_results')
            .select('*, exams!inner ( title, exam_date, exam_type, status )')
            .eq('student_id', studentId)
            .eq('exams.status', 'approved');
        if (error) fail(error);
        return data as (ExamResult & { exams: Pick<Exam, 'title' | 'exam_date' | 'exam_type' | 'status'> })[];
    },

    async createExam(input: ExamInput) {
        const { data, error } = await supabase.from('exams').insert([input]).select().single();
        if (error) fail(error);
        return data as Exam;
    },

    async updateExam(id: string, input: Partial<ExamInput> & { status?: ExamStatus }) {
        const { error } = await supabase.from('exams').update(input).eq('id', id);
        if (error) fail(error);
    },

    async deleteExam(id: string) {
        const { error, count } = await supabase.from('exams').delete({ count: 'exact' }).eq('id', id);
        if (error) fail(error);
        if (!count) throw new Error('يمكن حذف الامتحان وهو مسودة فقط');
    },

    async saveResults(rows: ResultInput[]) {
        const { error } = await supabase.from('exam_results').upsert(rows, { onConflict: 'exam_id,student_id' });
        if (error) fail(error);
    },
};
