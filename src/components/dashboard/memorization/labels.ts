import type { RecitationGrade, RecitationType } from '../../../types';

export const RECITATION_TYPES: { value: RecitationType; label: string; className: string }[] = [
    { value: 'new', label: 'حفظ جديد', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { value: 'minor_review', label: 'مراجعة صغرى', className: 'bg-sky-100 text-sky-700 border-sky-200' },
    { value: 'major_review', label: 'مراجعة كبرى', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    { value: 'consolidation', label: 'تثبيت', className: 'bg-amber-100 text-amber-700 border-amber-200' },
];

export const RECITATION_GRADES: { value: RecitationGrade; label: string; className: string }[] = [
    { value: 'excellent', label: 'ممتاز', className: 'bg-green-100 text-green-700 border-green-200' },
    { value: 'very_good', label: 'جيد جدًا', className: 'bg-teal-100 text-teal-700 border-teal-200' },
    { value: 'good', label: 'جيد', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    { value: 'acceptable', label: 'مقبول', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { value: 'repeat', label: 'إعادة', className: 'bg-red-100 text-red-700 border-red-200' },
];

export const typeMeta = (type: RecitationType) => RECITATION_TYPES.find(t => t.value === type) ?? RECITATION_TYPES[0];
export const gradeMeta = (grade: RecitationGrade) => RECITATION_GRADES.find(g => g.value === grade) ?? RECITATION_GRADES[2];

/**
 * تقدير مقترح من عدد الأخطاء: خطأ الحفظ = 1، التشكيل والتنبيه = 0.5، التجويد = 0.25
 */
export const suggestGrade = (errors: { memorization: number; tashkeel: number; tajweed: number; hints: number }): RecitationGrade => {
    const score = errors.memorization + errors.tashkeel * 0.5 + errors.tajweed * 0.25 + errors.hints * 0.5;
    if (score <= 0.5) return 'excellent';
    if (score <= 2) return 'very_good';
    if (score <= 4) return 'good';
    if (score <= 6) return 'acceptable';
    return 'repeat';
};

/** الحفظ الجديد يُحتسب ضمن المحفوظ ما لم يكن التقدير "إعادة" */
export const countsAsMemorized = (s: { type: RecitationType; grade: RecitationGrade }) =>
    s.type === 'new' && s.grade !== 'repeat';
